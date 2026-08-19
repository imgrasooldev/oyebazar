/**
 * CategoryAdminService — darakht ka intizam, ops ke haath mein.
 *
 * Teen qawaid jo poore nizam ko bachate hain:
 *
 *  1. Koi category apne hi neeche nahi ja sakti. Drag & drop mein ye ghalti ek second
 *     mein ho jati hai, aur us ka natija ek aisa chakkar hai jo kisi bhi query ko
 *     hamesha ke liye ghuma deta hai.
 *  2. Jis mein maal ya bachche hon wo mitti nahi. Warna maal aisi category se juda reh
 *     jata hai jo mojood hi nahi — catalogue mein wo kahin nazar nahi aata.
 *  3. Gehrai ki ek hadd hai. Technically ye zaroori nahi, magar chhe darje wali category
 *     ka rasta phone par ek qatar mein nahi samata aur reseller wahan tak pohanchti hi
 *     nahi.
 */
import { ConflictError, NotFoundError, ValidationError } from '@oyebazar/shared'
import type { CategoryAdminRepository, CategoryNode } from '../ports/category-admin-repositories'
import type { Analytics, Logger } from '../ports/infrastructure'

/**
 * Jarh 0 se ginti — yani 5 ka matlab hai chhe darje.
 *
 * Ye ek number badal kar barhaya ja sakta hai; hadd usool ki nahi, UI ki hai.
 */
export const MAX_CATEGORY_DEPTH = 5

export class CategoryAdminService {
  constructor(
    private readonly categories: CategoryAdminRepository,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  tree(): Promise<CategoryNode[]> {
    return this.categories.tree()
  }

  async create(
    actorId: string,
    input: { nameUr: string; nameEn: string; parentId?: string | null; imageUrl?: string },
  ): Promise<{ id: string; slug: string }> {
    const nameUr = input.nameUr.trim()
    const nameEn = input.nameEn.trim()

    // Dono zubanon mein naam lazmi: ek chhoot jaye to wo category ek locale par khali
    // dabba ban jati hai aur pata bhi nahi chalta
    if (nameUr.length < 2 || nameEn.length < 2) {
      throw new ValidationError('Naam dono zubanon mein likhen')
    }

    const parentId = input.parentId ?? null
    let parentPath = '/'
    let depth = 0

    if (parentId) {
      const parent = await this.categories.findById(parentId)
      if (!parent) throw new NotFoundError('Category', parentId)

      depth = parent.depth + 1
      parentPath = parent.path

      if (depth > MAX_CATEGORY_DEPTH) {
        throw new ValidationError(
          `Is se ziyada gehra nahi ja sakte (${MAX_CATEGORY_DEPTH + 1} darje ki hadd hai)`,
        )
      }
    }

    const slug = await this.uniqueSlug(nameEn)
    const sortOrder = await this.categories.nextSortOrder(parentId)

    const created = await this.categories.create({
      slug,
      nameUr,
      nameEn,
      ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
      parentId,
      // Apni id abhi nahi pata — row banne ke baad apna path khud likhta hai
      path: parentPath,
      depth,
      sortOrder,
    })

    await this.categories.setPath(created.id, `${parentPath}${created.id}/`)

    await this.analytics.track({
      name: 'category_created',
      actorType: 'ops',
      actorId,
      properties: { slug, depth, parentId },
    })

    return { id: created.id, slug }
  }

  async rename(
    actorId: string,
    id: string,
    input: { nameUr: string; nameEn: string; imageUrl?: string | null },
  ): Promise<void> {
    const nameUr = input.nameUr.trim()
    const nameEn = input.nameEn.trim()
    if (nameUr.length < 2 || nameEn.length < 2) {
      throw new ValidationError('Naam dono zubanon mein likhen')
    }

    const existing = await this.categories.findById(id)
    if (!existing) throw new NotFoundError('Category', id)

    /*
     * 🔴 Slug jaan boojh kar nahi badalta.
     *
     * Slug URL mein hai (/bazaar?category=lawn) aur reseller ke bheje hue purane
     * WhatsApp links usi par khulte hain. Naam theek karna rozana ka kaam hai; us se
     * har purana link tor dena bohot bara nuqsan hai.
     */
    await this.categories.rename(id, {
      nameUr,
      nameEn,
      ...(input.imageUrl === undefined ? {} : { imageUrl: input.imageUrl }),
    })

    await this.analytics.track({
      name: 'category_renamed',
      actorType: 'ops',
      actorId,
      properties: { id, nameEn },
    })
  }

  /**
   * Jagah badalna — naya baap, ya sirf nayi tarteeb.
   *
   * `newParentId === null` ka matlab hai "jarh par le aao". `undefined` yahan nahi
   * chalta: "koi baap nahi" aur "baap ko haath na lagao" do alag baatein hain aur is
   * method mein pehli wali hi hoti hai.
   */
  async move(
    actorId: string,
    input: { id: string; newParentId: string | null; position?: number },
  ): Promise<void> {
    const node = await this.categories.findById(input.id)
    if (!node) throw new NotFoundError('Category', input.id)

    let newParentPath = '/'
    let newDepth = 0

    if (input.newParentId) {
      if (input.newParentId === input.id) {
        throw new ValidationError('Category apne andar nahi ja sakti')
      }

      const parent = await this.categories.findById(input.newParentId)
      if (!parent) throw new NotFoundError('Category', input.newParentId)

      /*
       * 🔴 Chakkar ki rok. Naya baap khud is category ke NEECHE ho to darakht ka wo
       * hissa poore darakht se kat jata hai aur apne aap se jura reh jata hai — us ke
       * baad wo kisi list mein nahi aata aur us ka maal bhi ghaib ho jata hai.
       */
      if (parent.path.startsWith(node.path)) {
        throw new ValidationError('Category ko apni hi shaakh ke andar nahi le ja sakte')
      }

      newParentPath = parent.path
      newDepth = parent.depth + 1
    }

    const depthDelta = newDepth - node.depth

    // Poori shaakh sarakti hai, sirf ye category nahi — hadd sab se gehre bachche par lagti hai
    const branchDepth = await this.deepestDescendantDepth(node.path)
    if (branchDepth + depthDelta > MAX_CATEGORY_DEPTH) {
      throw new ValidationError(
        `Is shaakh ke bachche hadd se neeche chale jayenge (${MAX_CATEGORY_DEPTH + 1} darje)`,
      )
    }

    const sortOrder =
      input.position ?? (await this.categories.nextSortOrder(input.newParentId ?? null))

    await this.categories.move({
      id: input.id,
      newParentId: input.newParentId,
      oldPath: node.path,
      newPath: `${newParentPath}${input.id}/`,
      depthDelta,
      sortOrder,
    })

    this.logger.info('category_moved', {
      id: input.id,
      newParentId: input.newParentId,
      depthDelta,
    })
    await this.analytics.track({
      name: 'category_moved',
      actorType: 'ops',
      actorId,
      properties: { id: input.id, newParentId: input.newParentId },
    })
  }

  /** Ek hi baap ke bachchon ki nayi tarteeb — drag & drop ke baad. */
  async reorder(actorId: string, parentId: string | null, orderedIds: string[]): Promise<void> {
    if (orderedIds.length === 0) return

    await this.categories.reorder(parentId, orderedIds)
    await this.analytics.track({
      name: 'categories_reordered',
      actorType: 'ops',
      actorId,
      properties: { parentId, count: orderedIds.length },
    })
  }

  /**
   * Mitana — sirf khali category.
   *
   * Maal ya bachche hon to saaf mana, ginti ke saath. "Pehle maal kahin aur le jayen"
   * kehna us se behtar hai ke hum khud faisla karen ke wo maal ab kahan jayega.
   */
  async remove(actorId: string, id: string): Promise<void> {
    const counts = await this.categories.countsFor(id)

    if (counts.children > 0) {
      throw new ConflictError(
        `Pehle is ke ${counts.children} zeli categories hata den ya kahin aur le jayen`,
      )
    }
    if (counts.products > 0) {
      throw new ConflictError(
        `Is mein ${counts.products} maal laga hua hai — pehle usay doosri category mein le jayen`,
      )
    }

    await this.categories.remove(id)
    await this.analytics.track({
      name: 'category_removed',
      actorType: 'ops',
      actorId,
      properties: { id },
    })
  }

  private async deepestDescendantDepth(path: string): Promise<number> {
    const tree = await this.categories.tree()
    let deepest = 0

    const walk = (nodes: readonly CategoryNode[]): void => {
      for (const node of nodes) {
        if (node.path.startsWith(path)) deepest = Math.max(deepest, node.depth)
        walk(node.children)
      }
    }

    walk(tree)
    return deepest
  }

  /**
   * Slug angrezi naam se banta hai, Urdu se nahi — URL mein Latin haroof hi chalte hain.
   * Naam pehle se ho to peeche number lagta hai.
   */
  private async uniqueSlug(nameEn: string): Promise<string> {
    const base =
      nameEn
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'category'

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
      if (!(await this.categories.slugExists(slug))) return slug
    }

    throw new ConflictError('Is naam ki bohot si categories pehle se hain — naam badal len')
  }
}
