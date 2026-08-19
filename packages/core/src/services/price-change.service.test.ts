import { describe, expect, it } from 'vitest'
import { pkr, type Pkr } from '@oyebazar/shared'
import { PriceChangeService } from './price-change.service'
import type {
  ApprovedPrices,
  NewPriceChangeRequest,
  PriceChangeRepository,
} from '../ports/price-change-repositories'
import type { PriceChangeRequestView } from '../domain/views'
import type { Analytics, Clock, Logger } from '../ports/infrastructure'

const NOW = new Date('2026-08-19T12:00:00.000Z')

const SUPPLIER_ID = 'sup_1'
const PRODUCT_ID = 'prod_1'
const FEE_RATE_BPS = 500 // 5%

/**
 * Fake — asli Postgres jaise do qawaid:
 *  · ek maal par ek hi KHULI darkhwast (unique index)
 *  · manzoori par maal ka rate AUR under-water resellers ka rate, dono ek saath
 */
class FakeRequests implements PriceChangeRepository {
  rows: {
    id: string
    productId: string
    supplierId: string
    currentSupplierPrice: number
    requestedSupplierPrice: number
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    note?: string
  }[] = []

  /** resellerId → us ka saved retail price */
  savedPrices = new Map<string, number>()
  productPrice = { supplierPrice: 1000, bajiPrice: 1050, suggestedRetail: 1400 }

  async create(input: NewPriceChangeRequest): Promise<{ id: string } | null> {
    // Unique index: khuli darkhwast pehle se ho to nayi nahi banti
    if (this.rows.some((row) => row.productId === input.productId && row.status === 'PENDING')) {
      return null
    }
    const id = `req_${this.rows.length + 1}`
    this.rows.push({
      id,
      productId: input.productId,
      supplierId: input.supplierId,
      currentSupplierPrice: input.currentSupplierPrice,
      requestedSupplierPrice: input.requestedSupplierPrice,
      status: 'PENDING',
    })
    return { id }
  }

  private toView(row: FakeRequests['rows'][number]): PriceChangeRequestView {
    const proposed = row.requestedSupplierPrice + Math.round((row.requestedSupplierPrice * FEE_RATE_BPS) / 10_000)
    const saved = [...this.savedPrices.values()]
    return {
      id: row.id,
      productId: row.productId,
      supplierId: row.supplierId,
      supplierName: 'Al Madina',
      productTitleUr: 'لان',
      productTitleEn: 'Lawn',
      currentSupplierPrice: pkr(row.currentSupplierPrice),
      requestedSupplierPrice: pkr(row.requestedSupplierPrice),
      currentBajiPrice: pkr(this.productPrice.bajiPrice),
      proposedBajiPrice: pkr(proposed),
      reason: null,
      resellersWithSavedPrice: saved.length,
      resellersUnderWater: saved.filter((price) => price < proposed).length,
      createdAt: NOW,
    }
  }

  async listPending(): Promise<PriceChangeRequestView[]> {
    return this.rows.filter((row) => row.status === 'PENDING').map((row) => this.toView(row))
  }

  async findPendingById(requestId: string): Promise<PriceChangeRequestView | null> {
    const row = this.rows.find((entry) => entry.id === requestId && entry.status === 'PENDING')
    return row ? this.toView(row) : null
  }

  async findPendingForSupplier(supplierId: string): Promise<PriceChangeRequestView[]> {
    return this.rows
      .filter((row) => row.supplierId === supplierId && row.status === 'PENDING')
      .map((row) => this.toView(row))
  }

  async approve(
    requestId: string,
    _opsUserId: string,
    prices: ApprovedPrices,
  ): Promise<{ repricedResellers: number }> {
    const row = this.rows.find((entry) => entry.id === requestId && entry.status === 'PENDING')
    if (!row) return { repricedResellers: 0 }

    row.status = 'APPROVED'
    this.productPrice = {
      supplierPrice: prices.supplierPrice,
      bajiPrice: prices.bajiPrice,
      suggestedRetail: prices.suggestedRetail,
    }

    let repriced = 0
    for (const [resellerId, price] of this.savedPrices) {
      if (price < prices.bajiPrice) {
        this.savedPrices.set(resellerId, prices.repriceUnderWaterTo)
        repriced += 1
      }
    }
    return { repricedResellers: repriced }
  }

  async reject(requestId: string, _opsUserId: string, note: string): Promise<boolean> {
    const row = this.rows.find((entry) => entry.id === requestId && entry.status === 'PENDING')
    if (!row) return false
    row.status = 'REJECTED'
    row.note = note
    return true
  }
}

function build(requests: FakeRequests) {
  const products = {
    async findForPricing() {
      return [
        {
          id: PRODUCT_ID,
          supplierId: SUPPLIER_ID,
          supplierPrice: pkr(requests.productPrice.supplierPrice),
          bajiPrice: pkr(requests.productPrice.bajiPrice),
          suggestedRetail: pkr(requests.productPrice.suggestedRetail),
          inStock: true,
        },
      ]
    },
  } as never

  const suppliers = {
    async findInternal() {
      return { id: SUPPLIER_ID, businessName: 'Al Madina', phone: '923001200000', status: 'VERIFIED', feeRateBps: FEE_RATE_BPS }
    },
  } as never

  const clock: Clock = { now: () => NOW }
  const analytics: Analytics = { async track() {} }
  const logger: Logger = { info() {}, warn() {}, error() {} }

  return new PriceChangeService(requests, products, suppliers, clock, analytics, logger)
}

describe('PriceChangeService — LIVE maal ka rate ops ki manzoori se badalta hai', () => {
  it('darkhwast rate BADALTI NAHI — sirf qatar mein lagti hai', async () => {
    const repo = new FakeRequests()
    const service = build(repo)

    await service.request(SUPPLIER_ID, PRODUCT_ID, pkr(1400))

    // 🔴 Yehi is poore feature ki bunyad hai
    expect(repo.productPrice.supplierPrice).toBe(1000)
    expect(repo.rows[0]?.status).toBe('PENDING')
  })

  it('ek maal par doosri khuli darkhwast nahi banti', async () => {
    const repo = new FakeRequests()
    const service = build(repo)

    await service.request(SUPPLIER_ID, PRODUCT_ID, pkr(1400))
    await expect(service.request(SUPPLIER_ID, PRODUCT_ID, pkr(1500))).rejects.toThrow()
    expect(repo.rows).toHaveLength(1)
  })

  it('doosri dukan ke maal par darkhwast nahi ja sakti', async () => {
    const repo = new FakeRequests()
    const service = build(repo)
    await expect(service.request('sup_2', PRODUCT_ID, pkr(1400))).rejects.toThrow()
  })

  it('wohi rate dobara maangne par mana', async () => {
    const repo = new FakeRequests()
    const service = build(repo)
    await expect(service.request(SUPPLIER_ID, PRODUCT_ID, pkr(1000))).rejects.toThrow()
  })

  it('manzoori par rate lagta hai aur hamara rate fee ke saath banta hai', async () => {
    const repo = new FakeRequests()
    const service = build(repo)

    const { id } = await service.request(SUPPLIER_ID, PRODUCT_ID, pkr(1400))
    const result = await service.approve('ops_1', id)

    expect(repo.productPrice.supplierPrice).toBe(1400)
    // 1400 + 5% = 1470
    expect(repo.productPrice.bajiPrice).toBe(1470)
    expect(result.bajiPrice).toBe(1470)
  })

  it('🔴 manzoori par jin resellers ka rate lagat se neeche reh gaya, un ka rate theek hota hai', async () => {
    const repo = new FakeRequests()
    // Sadia ne 1400 par bech rahi thi jab lagat 1050 thi — ab lagat 1470 ho rahi hai
    repo.savedPrices.set('reseller_sadia', 1400)
    // Ayesha ka rate pehle se upar hai — usay chhera nahi jana chahiye
    repo.savedPrices.set('reseller_ayesha', 2000)

    const service = build(repo)
    const { id } = await service.request(SUPPLIER_ID, PRODUCT_ID, pkr(1400))
    const result = await service.approve('ops_1', id)

    expect(result.repricedResellers).toBe(1)
    // Sadia ab lagat se UPAR hai — us ka agla status pack loss par nahi chhapega
    expect(repo.savedPrices.get('reseller_sadia')!).toBeGreaterThan(repo.productPrice.bajiPrice)
    // Ayesha ka apna rate jyun ka tyun
    expect(repo.savedPrices.get('reseller_ayesha')).toBe(2000)
  })

  it('rate NEECHE jane par kisi ka rate nahi chherna parta', async () => {
    const repo = new FakeRequests()
    repo.savedPrices.set('reseller_sadia', 1400)

    const service = build(repo)
    const { id } = await service.request(SUPPLIER_ID, PRODUCT_ID, pkr(800))
    const result = await service.approve('ops_1', id)

    expect(result.repricedResellers).toBe(0)
    expect(repo.savedPrices.get('reseller_sadia')).toBe(1400)
  })

  it('mana karne par rate nahi badalta aur wajah lazmi hai', async () => {
    const repo = new FakeRequests()
    const service = build(repo)

    const { id } = await service.request(SUPPLIER_ID, PRODUCT_ID, pkr(1400))

    await expect(service.reject('ops_1', id, '   ')).rejects.toThrow()
    await service.reject('ops_1', id, 'Bazaar ka bhao nahi barha')

    expect(repo.productPrice.supplierPrice).toBe(1000)
    expect(repo.rows[0]?.status).toBe('REJECTED')
  })

  it('faisla ho chuki darkhwast dobara approve nahi hoti', async () => {
    const repo = new FakeRequests()
    const service = build(repo)

    const { id } = await service.request(SUPPLIER_ID, PRODUCT_ID, pkr(1400))
    await service.approve('ops_1', id)

    // 🔴 Warna do dafa dabane se rate do dafa barh jata
    await expect(service.approve('ops_1', id)).rejects.toThrow()
    expect(repo.productPrice.supplierPrice).toBe(1400)
  })
})
