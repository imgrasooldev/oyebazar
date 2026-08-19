/**
 * Category ke darakht ke qawaid.
 *
 * Sab se ahem do: koi category apne hi neeche na ja sake (warna wo hissa poore darakht
 * se kat kar apne aap se jur jata hai), aur bhari hui category mit na sake (warna maal
 * aisi jagah reh jata hai jo mojood hi nahi).
 */
import { describe, expect, it } from 'vitest'
import { CategoryAdminService, MAX_CATEGORY_DEPTH } from './category-admin.service'
import type { CategoryAdminRepository, CategoryNode } from '../ports/category-admin-repositories'

const ROOT = { id: 'root', parentId: null, path: '/root/', depth: 0 }
const CHILD = { id: 'child', parentId: 'root', path: '/root/child/', depth: 1 }
const GRAND = { id: 'grand', parentId: 'child', path: '/root/child/grand/', depth: 2 }

function node(row: { id: string; parentId: string | null; path: string; depth: number }): CategoryNode {
  return {
    id: row.id,
    slug: row.id,
    nameUr: row.id,
    nameEn: row.id,
    imageUrl: null,
    parentId: row.parentId,
    path: row.path,
    depth: row.depth,
    sortOrder: 0,
    productCount: 0,
    branchProductCount: 0,
    children: [],
  }
}

class FakeRepo implements CategoryAdminRepository {
  rows = [ROOT, CHILD, GRAND]
  counts: Record<string, { products: number; children: number }> = {}
  moves: unknown[] = []
  created: unknown[] = []
  removed: string[] = []
  slugs = new Set<string>(['root'])

  async tree() {
    return this.rows.map(node)
  }
  async findById(id: string) {
    return this.rows.find((row) => row.id === id) ?? null
  }
  async create(input: { slug: string; path: string; depth: number }) {
    this.created.push(input)
    return { id: 'new', path: input.path }
  }
  async setPath() {}
  async rename() {}
  async move(input: unknown) {
    this.moves.push(input)
  }
  async reorder() {}
  async remove(id: string) {
    this.removed.push(id)
  }
  async countsFor(id: string) {
    return this.counts[id] ?? { products: 0, children: 0 }
  }
  async slugExists(slug: string) {
    return this.slugs.has(slug)
  }
  async nextSortOrder() {
    return 3
  }
}

function build() {
  const repo = new FakeRepo()
  const service = new CategoryAdminService(repo, { async track() {} }, {
    info() {},
    warn() {},
    error() {},
  })
  return { repo, service }
}

describe('nayi category', () => {
  it('jarh par bane to path apni id se banta hai', async () => {
    const { service, repo } = build()
    await service.create('ops1', { nameUr: 'نیا', nameEn: 'New Thing' })

    expect(repo.created).toEqual([
      expect.objectContaining({ slug: 'new-thing', depth: 0, path: '/' }),
    ])
  })

  it('naam pehle se ho to slug par number lagta hai', async () => {
    const { service, repo } = build()
    await service.create('ops1', { nameUr: 'جڑ', nameEn: 'Root' })

    expect(repo.created).toEqual([expect.objectContaining({ slug: 'root-2' })])
  })

  /** Ek zaban mein naam chhoot jaye to wo category us locale par khali dabba ban jati hai. */
  it('dono zubanon mein naam lazmi hai', async () => {
    const { service } = build()
    await expect(service.create('ops1', { nameUr: '', nameEn: 'Only English' })).rejects.toThrow(
      /dono zubanon/i,
    )
  })

  it('hadd se neeche nayi shaakh nahi banti', async () => {
    const { service, repo } = build()
    repo.rows = [{ id: 'deep', parentId: null, path: '/deep/', depth: MAX_CATEGORY_DEPTH }]

    await expect(
      service.create('ops1', { nameUr: 'گہرا', nameEn: 'Too Deep', parentId: 'deep' }),
    ).rejects.toThrow(/gehra/i)
  })
})

describe('jagah badalna', () => {
  it('apne andar nahi ja sakti', async () => {
    const { service } = build()
    await expect(
      service.move('ops1', { id: 'root', newParentId: 'root' }),
    ).rejects.toThrow(/apne andar/i)
  })

  /**
   * 🔴 Sab se khatarnak soorat: jarh ko apne hi pote ke andar daal dena. Us ke baad wo
   * hissa poore darakht se kat kar apne aap se jur jata hai — na kisi list mein aata hai,
   * na us ka maal kahin dikhta hai, aur usay wapas nikalne ka koi rasta bhi nahi rehta.
   */
  it('apni hi shaakh ke andar nahi ja sakti', async () => {
    const { service } = build()
    await expect(
      service.move('ops1', { id: 'root', newParentId: 'grand' }),
    ).rejects.toThrow(/apni hi shaakh/i)
  })

  it('jarh par aane par naya path aur ulta depth delta banta hai', async () => {
    const { service, repo } = build()
    await service.move('ops1', { id: 'child', newParentId: null })

    expect(repo.moves).toEqual([
      expect.objectContaining({
        id: 'child',
        newParentId: null,
        oldPath: '/root/child/',
        newPath: '/child/',
        depthDelta: -1,
      }),
    ])
  })

  it('doosri shaakh mein jane par path us ke baap se banta hai', async () => {
    const { service, repo } = build()
    repo.rows = [...repo.rows, { id: 'other', parentId: null, path: '/other/', depth: 0 }]

    await service.move('ops1', { id: 'child', newParentId: 'other' })

    expect(repo.moves).toEqual([
      expect.objectContaining({ newPath: '/other/child/', depthDelta: 0 }),
    ])
  })
})

describe('mitana', () => {
  it('bachche hon to nahi mitti', async () => {
    const { service, repo } = build()
    repo.counts['root'] = { products: 0, children: 2 }

    await expect(service.remove('ops1', 'root')).rejects.toThrow(/zeli categories/i)
    expect(repo.removed).toHaveLength(0)
  })

  it('maal laga ho to nahi mitti', async () => {
    const { service, repo } = build()
    repo.counts['child'] = { products: 7, children: 0 }

    await expect(service.remove('ops1', 'child')).rejects.toThrow(/7 maal/i)
    expect(repo.removed).toHaveLength(0)
  })

  it('khali category mit jati hai', async () => {
    const { service, repo } = build()
    await service.remove('ops1', 'grand')
    expect(repo.removed).toEqual(['grand'])
  })
})
