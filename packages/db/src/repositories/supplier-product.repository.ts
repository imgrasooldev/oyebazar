/**
 * SupplierProductRepository — wholesaler ke apne maal ki listing aur stock on/off.
 *
 * 🔴 Har query mein `supplierId` shart ke taur par hai. `updateMany` jaan boojh kar
 * use kiya hai (update nahi): `where` mein supplierId dal kar count 0 aaye to matlab
 * maal is dukan ka nahi — service ko wohi "nahi mila" wala jawab milta hai. Is tarah
 * doosre wholesaler ke product id se chher-chhaar kaam nahi karti, aur ye baat query
 * mein likhi hai, kisi upar wale `if` par nahi chhori.
 */
import type { PrismaClient } from '@prisma/client'
import type {
  DraftProductUpdate,
  NewSupplierProduct,
  ProductMediaInput,
  SupplierProductRepository,
  SupplierProductView,
} from '@oyebazar/core'
import { MAX_MEDIA_PER_PRODUCT, NotFoundError, ValidationError } from '@oyebazar/shared'
import { pkr } from '@oyebazar/shared'

type MediaRow = {
  processedUrl: string | null
  originalUrl: string
  type: 'IMAGE' | 'VIDEO'
  isStatusSource: boolean
}

/** Cover hamesha tasveer hoti hai — video ka pehla frame hamare paas hai hi nahi. */
function coverOf(media: readonly MediaRow[]): string | null {
  const images = media.filter((item) => item.type === 'IMAGE')
  const chosen = images.find((item) => item.isStatusSource) ?? images[0]
  return chosen ? (chosen.processedUrl ?? chosen.originalUrl) : null
}

/** Ye order abhi chal rahe hain — inhen stock band karne se pehle dikhna chahiye. */
const OPEN_STATUSES = [
  'PENDING_CONFIRM',
  'CONFIRMED',
  'SENT_TO_SUPPLIER',
  'ACCEPTED',
  'DISPATCHED',
] as const

export class PrismaSupplierProductRepository implements SupplierProductRepository {
  constructor(private readonly db: PrismaClient) {}

  /**
   * Naya maal — hamesha DRAFT aur bina stock ke.
   *
   * 🔴 `status: 'DRAFT'` yahan hard-code hai, caller se nahi aata: warna kal koi naya
   * endpoint ghalti se LIVE bhej deta aur bina dekha hua maal seedha reseller ke
   * catalogue mein aa jata.
   */
  async create(input: NewSupplierProduct): Promise<{ id: string }> {
    // Maal sub-category par lagta hai; slug se dhoondte hain
    const category = await this.db.category.findUnique({
      where: { slug: input.categorySlug },
      select: { id: true },
    })
    if (!category) throw new NotFoundError('Category', input.categorySlug)

    return this.db.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          slug: await this.uniqueSlug(tx, input.titleEn || input.titleUr, undefined, input.categorySlug),
          supplierId: input.supplierId,
          titleUr: input.titleUr,
          titleEn: input.titleEn,
          ...(input.descriptionUr ? { descriptionUr: input.descriptionUr } : {}),
          categoryId: category.id,
          supplierPrice: input.supplierPrice,
          bajiPrice: input.bajiPrice,
          suggestedRetail: input.suggestedRetail,
          status: 'DRAFT',
        },
        select: { id: true },
      })

      // Ek default variant — bina is ke product kabhi "mojood" nahi hota aur order
      // lagate hi OUT_OF_STOCK milta hai. Size/rang wale variants Phase 2 mein.
      await tx.productVariant.create({
        data: {
          productId: product.id,
          skuCode: `${product.id}-default`,
          stockQty: input.stockQty,
        },
      })

      // Tasveerein aur video usi tarteeb se jis mein wholesaler ne chuni thin — pehli
      // tasveer catalogue par cover banti hai, is liye tarteeb us ka faisla hai
      if (input.media && input.media.length > 0) {
        await tx.productMedia.createMany({
          data: input.media.map((item, index) => ({
            productId: product.id,
            originalUrl: item.url,
            // Abhi koi processing nahi hoti; jab hogi to processedUrl badal jayega
            processedUrl: item.url,
            type: item.type,
            // Status pack isi tasveer par by-default banta hai (service ek hi chunti hai)
            isStatusSource: item.isStatusSource,
            sortOrder: index,
          })),
        })
      }

      return product
    })
  }

  /**
   * DRAFT ki poori tafseel badalna.
   *
   * 🔴 `where` mein `status: 'DRAFT'` hai — LIVE maal is raste se chhua hi nahi ja
   * sakta, chahe service mein koi `if` bhoola jaye.
   *
   * @returns false agar maal is dukan ka nahi ya DRAFT nahi raha
   */
  async updateDraft(
    supplierId: string,
    productId: string,
    input: DraftProductUpdate,
  ): Promise<boolean> {
    const category = await this.db.category.findUnique({
      where: { slug: input.categorySlug },
      select: { id: true },
    })
    if (!category) throw new NotFoundError('Category', input.categorySlug)

    const existing = await this.db.product.findFirst({
      where: { id: productId, supplierId, status: 'DRAFT' },
      select: { id: true, slug: true, titleEn: true, titleUr: true },
    })
    if (!existing) return false

    return this.db.$transaction(async (tx) => {
      /*
       * Slug tabhi dobara banta hai jab naam waqai badla ho.
       *
       * 🔴 Har dafa banate to naam na badalne par bhi `uniqueSlug` apne hi maujooda
       * slug ko "taken" dekh kar `naam-2` bana deta — aur do dafa save karne se
       * `naam-3`, `naam-4`. DRAFT public nahi hota is liye slug badalna mehfooz hai,
       * magar bewajah badalna phir bhi ghalat hai.
       */
      const nameChanged =
        input.titleEn !== existing.titleEn || input.titleUr !== existing.titleUr
      const slug = nameChanged
        ? await this.uniqueSlug(tx, input.titleEn || input.titleUr, existing.id, input.categorySlug)
        : existing.slug

      await tx.product.update({
        where: { id: productId },
        data: {
          slug,
          titleUr: input.titleUr,
          titleEn: input.titleEn,
          descriptionUr: input.descriptionUr ?? null,
          categoryId: category.id,
          supplierPrice: input.supplierPrice,
          bajiPrice: input.bajiPrice,
          suggestedRetail: input.suggestedRetail,
          // 🔴 status yahan NAHI. Maal DRAFT hi rehta hai — live karna ops ka faisla hai.
        },
      })

      // Ginti default variant par. Wo na ho (purana maal) to bana dete hain.
      const variant = await tx.productVariant.findFirst({
        where: { productId },
        select: { id: true },
        orderBy: { id: 'asc' },
      })

      if (variant) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stockQty: input.stockQty },
        })
      } else {
        await tx.productVariant.create({
          data: { productId, skuCode: `${productId}-default`, stockQty: input.stockQty },
        })
      }

      return true
    })
  }

  /** Slug naam se; Urdu naam par kuch nahi bachta, to "item" + number. */
  private async uniqueSlug(
    tx: { product: { findUnique: PrismaClient['product']['findUnique'] } },
    name: string,
    /** Edit ke waqt: apna hi mojooda slug "taken" nahi ginna chahiye. */
    ignoreProductId?: string,
    /**
     * Naam se koi Latin haraf na nikle to slug isi se banta hai.
     *
     * 🔴 Angrezi naam optional hone ke baad ye zaroori ho gaya: Urdu naam se slugify
     * kuch nahi banati (saare haroof gir jate hain), aur har maal `item`, `item-2`,
     * `item-3` ban jata tha. Aisa URL na parhne wale ke kaam ka hai, na Google ke.
     * Category ka naam kam az kam ye to batata hai ke cheez kis qism ki hai.
     */
    fallback?: string,
  ): Promise<string> {
    const slugify = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40)

    const base = slugify(name) || slugify(fallback ?? '') || 'item'

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const slug = attempt === 0 ? base : `${base}-${attempt + 1}`
      const taken = await tx.product.findUnique({ where: { slug }, select: { id: true } })
      if (!taken || taken.id === ignoreProductId) return slug
    }
    return `${base}-${Date.now()}`
  }

  async listForSupplier(supplierId: string): Promise<SupplierProductView[]> {
    const rows = await this.db.product.findMany({
      where: { supplierId, status: { not: 'ARCHIVED' } },
      select: {
        id: true,
        titleUr: true,
        titleEn: true,
        descriptionUr: true,
        category: { select: { slug: true } },
        status: true,
        supplierPrice: true,
        media: {
          select: {
            id: true,
            processedUrl: true,
            originalUrl: true,
            type: true,
            isStatusSource: true,
            variantId: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        variants: { select: { stockQty: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })

    // Khule order ek hi group-by mein — har product par alag query (N+1) nahi
    const open = await this.db.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: rows.map((row) => row.id) },
        order: { supplierId, status: { in: [...OPEN_STATUSES] } },
      },
      _count: { productId: true },
    })
    const openByProduct = new Map(open.map((row) => [row.productId, row._count.productId]))

    return rows.map((row) => ({
      id: row.id,
      titleUr: row.titleUr,
      titleEn: row.titleEn,
      descriptionUr: row.descriptionUr,
      categorySlug: row.category.slug,
      status: row.status,
      supplierPrice: pkr(row.supplierPrice),
      // Cover: status wali tasveer, warna pehli tasveer (video kabhi cover nahi banta)
      imageUrl: coverOf(row.media),
      media: row.media.map((item) => ({
        id: item.id,
        url: item.processedUrl ?? item.originalUrl,
        type: item.type,
        isStatusSource: item.isStatusSource,
        variantId: item.variantId,
      })),
      openOrders: openByProduct.get(row.id) ?? 0,
      stockQty: row.variants.reduce((sum, variant) => sum + variant.stockQty, 0),
    }))
  }

  /**
   * Nayi tasveer/video maal par lagana.
   *
   * 🔴 Ginti ki hadd yahan bhi hai, service mein bhi. Service naya product banate waqt
   * rokti hai; ye raasta MOJOODA maal par lagta hai, jahan pehle se kuch media pari hoti
   * hai — is liye hadd DB ki asli ginti par lagni chahiye, sirf bheji hui list par nahi.
   */
  async setDeliveryRates(
    supplierId: string,
    rates: { city: number; other: number },
  ): Promise<boolean> {
    const { count } = await this.db.supplier.updateMany({
      where: { id: supplierId },
      data: { deliveryFeeCity: rates.city, deliveryFeeOther: rates.other },
    })
    return count > 0
  }

  async addMedia(
    supplierId: string,
    productId: string,
    media: readonly ProductMediaInput[],
  ): Promise<boolean> {
    if (media.length === 0) return true

    const product = await this.db.product.findFirst({
      where: { id: productId, supplierId },
      select: { id: true, _count: { select: { media: true } } },
    })
    if (!product) return false

    if (product._count.media + media.length > MAX_MEDIA_PER_PRODUCT) {
      throw new ValidationError(
        `Ek maal par zyada se zyada ${MAX_MEDIA_PER_PRODUCT} tasveerein ya video lag sakti hain`,
      )
    }

    // Nayi cheezein aakhir mein — mojooda tarteeb hilti nahi
    const last = await this.db.productMedia.findFirst({
      where: { productId },
      select: { sortOrder: true },
      orderBy: { sortOrder: 'desc' },
    })
    const from = (last?.sortOrder ?? -1) + 1

    /*
     * 🔴 Variant ki tasdeeq: sirf ISI maal ke jorhe qubool hain.
     *
     * Client se aayi hui id par bharosa nahi kiya ja sakta — doosre maal (ya doosri
     * dukan) ke variant ki id bhej kar tasveer wahan chipkai ja sakti thi. Ek hi query
     * mein saare jaanch lete hain; jo na mile us ki tasveer poore maal ki ban jati hai.
     */
    const wanted = [...new Set(media.map((item) => item.variantId).filter(Boolean))] as string[]
    const allowed = new Set(
      wanted.length === 0
        ? []
        : (
            await this.db.productVariant.findMany({
              where: { id: { in: wanted }, productId },
              select: { id: true },
            })
          ).map((variant) => variant.id),
    )

    await this.db.productMedia.createMany({
      data: media.map((item, index) => ({
        productId,
        variantId: item.variantId && allowed.has(item.variantId) ? item.variantId : null,
        originalUrl: item.url,
        processedUrl: item.url,
        type: item.type,
        // Status source alag endpoint se tay hota hai — yahan se kabhi nahi, warna
        // do "default" ban jate hain
        isStatusSource: false,
        sortOrder: from + index,
      })),
    })

    return true
  }

  /**
   * Tasveer/video hatana.
   *
   * 🔴 Storage se file nahi hatai jati — sirf row. Wajah: usi tasveer par bane hue
   * status pack resellers ke phone par aur WhatsApp par pehle se ja chuke hote hain,
   * aur un ka link tootna un ka kaam kharab karta hai. Purani files ka safai wala
   * kaam alag (aur soch samajh kar) hona chahiye.
   */
  async removeMedia(supplierId: string, productId: string, mediaId: string): Promise<boolean> {
    const { count } = await this.db.productMedia.deleteMany({
      where: { id: mediaId, productId, product: { supplierId } },
    })
    if (count === 0) return false

    // Hatai gayi tasveer status wali thi to koi doosri tasveer us ki jagah le le,
    // warna maal ka cover khali ho jata hai aur catalogue par dabba dikhta hai
    const remaining = await this.db.productMedia.findMany({
      where: { productId, type: 'IMAGE' },
      select: { id: true, isStatusSource: true },
      orderBy: { sortOrder: 'asc' },
    })

    if (remaining.length > 0 && !remaining.some((item) => item.isStatusSource)) {
      await this.db.productMedia.update({
        where: { id: remaining[0]!.id },
        data: { isStatusSource: true },
      })
    }

    return true
  }

  /** Kaunsi tasveer cover/status banegi — theek ek, aur wo video nahi ho sakti. */
  async setStatusSource(supplierId: string, productId: string, mediaId: string): Promise<boolean> {
    const media = await this.db.productMedia.findFirst({
      where: { id: mediaId, productId, type: 'IMAGE', product: { supplierId } },
      select: { id: true },
    })
    if (!media) return false

    await this.db.$transaction([
      // Pehle sab band, phir ek chalu — do rows par sach hona hi asal kharabi hai
      this.db.productMedia.updateMany({
        where: { productId, isStatusSource: true },
        data: { isStatusSource: false },
      }),
      this.db.productMedia.update({ where: { id: mediaId }, data: { isStatusSource: true } }),
    ])

    return true
  }

  /** Tarteeb — bheji hui ids usi tarteeb mein, baqi (agar koi) apni jagah ke baad. */
  async reorderMedia(
    supplierId: string,
    productId: string,
    mediaIds: readonly string[],
  ): Promise<boolean> {
    const owned = await this.db.productMedia.findMany({
      where: { productId, product: { supplierId } },
      select: { id: true },
    })
    if (owned.length === 0) return false

    const ownedIds = new Set(owned.map((item) => item.id))
    // Ek bhi ajnabi id aaye to poori darkhwast rad — aadhi tarteeb lagana sab se bura
    if (mediaIds.some((id) => !ownedIds.has(id))) return false

    await this.db.$transaction(
      mediaIds.map((id, index) =>
        this.db.productMedia.update({ where: { id }, data: { sortOrder: index } }),
      ),
    )

    return true
  }

  async setStockStatus(
    supplierId: string,
    productId: string,
    status: 'LIVE' | 'OUT_OF_STOCK',
  ): Promise<boolean> {
    const { count } = await this.db.product.updateMany({
      // status ki shart bhi yahin: DRAFT/ARCHIVED maal wholesaler khud live nahi kar sakta
      where: { id: productId, supplierId, status: { in: ['LIVE', 'OUT_OF_STOCK'] } },
      data: { status },
    })
    return count > 0
  }
}
