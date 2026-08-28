/**
 * Maal ke nizam ke qawaid — aur zyada tar wo jagahen jahan service MANA karti hai.
 *
 * Hisab (aosat lagat, sehat, qeemat) `domain/stock.ts` mein test ho chuka hai. Yahan wo
 * faisle hain jo service karti hai:
 *
 *  · ginti aur lagat ki haddein — ghalat number DB tak jata hi nahi
 *  · zaya hone par wajah LAZMI — bina wajah ke ghatti ginti register ka poora maqsad marti hai
 *  · doosri dukan ka maal chhoone par jawab hamesha EK jaisa (warna us ka stock taak liya jata hai)
 *  · aur muntaqili ke wo do halaat jo chup chaap ginti kharab karte hain
 */
import { describe, expect, it } from 'vitest'
import { InventoryService } from './inventory.service'
import type {
  BatchRepository,
  BatchView,
  InventoryLine,
  StockLedgerRepository,
  StockMoveView,
  WarehouseRepository,
  WarehouseStockLine,
  WarehouseView,
} from '../ports/inventory-repositories'

const line = (over: Partial<InventoryLine> = {}): InventoryLine => ({
  productId: 'p1',
  variantId: 'v1',
  slug: 'lawn-1',
  titleUr: 'لان',
  titleEn: 'Lawn',
  skuCode: 'LAWN-1',
  size: null,
  colour: null,
  stockQty: 10,
  reorderLevel: 0,
  avgCost: 0,
  soldLast30: 3,
  ...over,
})

class FakeLedger implements StockLedgerRepository {
  /** `null` = "maal is dukan ka nahi, ya itna hai hi nahi" */
  stockInResult: number | null = 15
  writeOffResult: number | null = 5
  reorderResult = true
  rows: InventoryLine[] = []
  values: { stockQty: number; avgCost: number }[] = []
  lastStockIn: unknown = null
  lastWriteOff: unknown = null

  async stockIn(input: unknown) {
    this.lastStockIn = input
    return this.stockInResult
  }
  async writeOff(input: unknown) {
    this.lastWriteOff = input
    return this.writeOffResult
  }
  async setReorderLevel() {
    return this.reorderResult
  }
  async moves(): Promise<StockMoveView[]> {
    return []
  }
  async lines(input: { onlyLow: boolean }) {
    return input.onlyLow
      ? this.rows.filter((row) => row.stockQty <= 0 || (row.reorderLevel > 0 && row.stockQty <= row.reorderLevel))
      : this.rows
  }
  async valueLines() {
    return this.values
  }
}

class FakeWarehouses implements WarehouseRepository {
  houses: WarehouseView[] = []
  addResult: WarehouseView | null = { id: 'w2', name: 'اسٹور', isDefault: false, isActive: true, pieces: 0 }
  renameResult = true
  activeResult = true
  transferResult = true
  lastTransfer: unknown = null

  async listWarehouses() {
    return this.houses
  }
  async addWarehouse() {
    return this.addResult
  }
  async renameWarehouse() {
    return this.renameResult
  }
  async setWarehouseActive() {
    return this.activeResult
  }
  async transfer(input: unknown) {
    this.lastTransfer = input
    return this.transferResult
  }
  async stockByWarehouse(): Promise<Map<string, WarehouseStockLine[]>> {
    return new Map()
  }
}

const NOW = new Date('2026-08-29T00:00:00Z')
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000)

const batchRow = (over: Partial<BatchView> = {}): BatchView => ({
  id: 'batch-1',
  productId: 'p1',
  variantId: 'v1',
  titleUr: 'چائے',
  titleEn: 'Tea',
  skuCode: 'TEA-1',
  size: null,
  colour: null,
  batchNo: 'L-42',
  expiryAt: day(10),
  qtyIn: 20,
  qtyLeft: 12,
  unitCost: 300,
  warehouseName: 'دکان',
  receivedAt: day(-40),
  ...over,
})

class FakeBatches implements BatchRepository {
  rows: BatchView[] = []
  writeOffResult: number | null = 8
  lastWriteOff: unknown = null

  async listBatches() {
    return this.rows
  }
  async expiringBatches() {
    return this.rows
  }
  async writeOffBatch(input: unknown) {
    this.lastWriteOff = input
    return this.writeOffResult
  }
}

const noopAnalytics = { track: async () => {} } as never
const noopLogger = { info: () => {}, warn: () => {}, error: () => {} } as never
const clock = { now: () => NOW } as never

function build() {
  const ledger = new FakeLedger()
  const houses = new FakeWarehouses()
  const batches = new FakeBatches()
  return {
    ledger,
    houses,
    batches,
    service: new InventoryService(ledger, houses, batches, clock, noopAnalytics, noopLogger),
  }
}

const SUPPLIER = 's1'

describe('naya maal', () => {
  it('nayi ginti lautati hai', async () => {
    const { service } = build()
    await expect(
      service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 5 }),
    ).resolves.toBe(15)
  })

  it('🔴 sifar ya manfi ginti DB tak jati hi nahi', async () => {
    const { service, ledger } = build()
    await expect(service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 0 })).rejects.toThrow()
    await expect(service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: -3 })).rejects.toThrow()
    expect(ledger.lastStockIn).toBeNull()
  })

  it('adhoori ginti (2.5 than) qubool nahi', async () => {
    const { service } = build()
    await expect(
      service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 2.5 }),
    ).rejects.toThrow()
  })

  it('🔴 lagat MARZI ki hai — na den to bhi maal chala jata hai', async () => {
    // Bohat si dukanen apni lagat kisi ko nahi batatin, aur ye un ka haq hai
    const { service, ledger } = build()
    await service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 5 })
    expect(ledger.lastStockIn).not.toHaveProperty('unitCost')
  })

  it('be-tuki lagat rok di jati hai', async () => {
    const { service } = build()
    await expect(
      service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 5, unitCost: -1 }),
    ).rejects.toThrow()
    await expect(
      service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 5, unitCost: 99_000_000 }),
    ).rejects.toThrow()
  })

  it('🔴 doosri dukan ka variant — jawab "nahi mila", na ke koi aur khabar', async () => {
    const { service, ledger } = build()
    ledger.stockInResult = null
    await expect(
      service.stockIn({ supplierId: SUPPLIER, variantId: 'kisi-aur-ka', qty: 5 }),
    ).rejects.toThrow()
  })
})

describe('zaya hua maal', () => {
  it('🔴 wajah ke baghair kuch nahi ghatta', async () => {
    /*
     * Bina wajah ke ghatti hui ginti register mein wohi bemani qatar banti hai jise
     * rokne ke liye ye poora register bana hai.
     */
    const { service, ledger } = build()
    await expect(
      service.writeOff({ supplierId: SUPPLIER, variantId: 'v1', qty: 2, note: '' }),
    ).rejects.toThrow()
    await expect(
      service.writeOff({ supplierId: SUPPLIER, variantId: 'v1', qty: 2, note: '  x  ' }),
    ).rejects.toThrow()
    expect(ledger.lastWriteOff).toBeNull()
  })

  it('wajah ke saath chalta hai, aur wajah saaf ho kar jati hai', async () => {
    const { service, ledger } = build()
    await expect(
      service.writeOff({ supplierId: SUPPLIER, variantId: 'v1', qty: 2, note: '  paani se kharab  ' }),
    ).resolves.toBe(5)
    expect(ledger.lastWriteOff).toMatchObject({ note: 'paani se kharab' })
  })

  it('🔴 "itna maal hai hi nahi" aur "ye maal aap ka nahi" — dono ka jawab EK', async () => {
    // Warna doosri dukan ka variantId aazma kar us ka stock taak liya ja sakta hai
    const { service, ledger } = build()
    ledger.writeOffResult = null
    await expect(
      service.writeOff({ supplierId: SUPPLIER, variantId: 'v1', qty: 999, note: 'toot gaya' }),
    ).rejects.toThrow()
  })
})

describe('khatam hone ki hadd', () => {
  it('sifar qubool hai — us ka matlab "ishara band" hai', async () => {
    const { service } = build()
    await expect(
      service.setReorderLevel({ supplierId: SUPPLIER, variantId: 'v1', level: 0 }),
    ).resolves.toBeUndefined()
  })

  it('manfi hadd nahi', async () => {
    const { service } = build()
    await expect(
      service.setReorderLevel({ supplierId: SUPPLIER, variantId: 'v1', level: -1 }),
    ).rejects.toThrow()
  })
})

describe('maal ki qataren aur khulasa', () => {
  it('🔴 hadd rakhi hi na ho to "kam" nahi ginte — sirf khatam ginte hain', async () => {
    const { service, ledger } = build()
    ledger.rows = [
      line({ variantId: 'a', stockQty: 1, reorderLevel: 0 }), // ishara band
      line({ variantId: 'b', stockQty: 0, reorderLevel: 0 }), // khatam
      line({ variantId: 'c', stockQty: 2, reorderLevel: 5 }), // hadd par
    ]

    const low = await service.lowStock(SUPPLIER)
    expect(low.map((row) => row.variantId).sort()).toEqual(['b', 'c'])
    expect(low.find((row) => row.variantId === 'b')?.health).toBe('out')
    expect(low.find((row) => row.variantId === 'c')?.health).toBe('low')
  })

  it('saara maal har qatar deta hai, aur har ek par sehat lagi hoti hai', async () => {
    const { service, ledger } = build()
    ledger.rows = [line({ variantId: 'a' }), line({ variantId: 'b', stockQty: 0 })]

    const all = await service.allStock(SUPPLIER)
    expect(all).toHaveLength(2)
    expect(all.map((row) => row.health)).toEqual(['ok', 'out'])
  })

  it('🔴 khulasa batata hai ke qeemat KITNE maal par khari hai', async () => {
    const { service, ledger } = build()
    ledger.values = [
      { stockQty: 10, avgCost: 100 }, // 1000
      { stockQty: 8, avgCost: 0 }, //   lagat maloom nahi
    ]
    ledger.rows = [line({ variantId: 'b', stockQty: 0 })]

    const summary = await service.summary(SUPPLIER)
    expect(summary.value).toBe(1_000)
    expect(summary.covered).toBe(10)
    expect(summary.total).toBe(18)
    expect(summary.outCount).toBe(1)
  })
})

describe('godown', () => {
  it('isi naam ka godown dobara nahi banta', async () => {
    const { service, houses } = build()
    houses.addResult = null
    await expect(service.addWarehouse({ supplierId: SUPPLIER, name: 'اسٹور' })).rejects.toThrow()
  })

  it('naam ke aage peechhe ki khali jagah kat jati hai', async () => {
    const { service } = build()
    await expect(
      service.addWarehouse({ supplierId: SUPPLIER, name: '  اسٹور  ' }),
    ).resolves.toMatchObject({ name: 'اسٹور' })
  })

  it('bohat chhota naam qubool nahi', async () => {
    const { service } = build()
    await expect(service.addWarehouse({ supplierId: SUPPLIER, name: 'x' })).rejects.toThrow()
  })

  it('🔴 ek hi godown se usi godown mein muntaqili nahi hoti', async () => {
    const { service, houses } = build()
    await expect(
      service.transfer({
        supplierId: SUPPLIER,
        variantId: 'v1',
        fromWarehouseId: 'w1',
        toWarehouseId: 'w1',
        qty: 5,
      }),
    ).rejects.toThrow()
    expect(houses.lastTransfer).toBeNull()
  })

  it('🔴 sifar ya adhoori ginti muntaqil nahi hoti', async () => {
    const { service, houses } = build()
    for (const qty of [0, -2, 1.5]) {
      await expect(
        service.transfer({
          supplierId: SUPPLIER,
          variantId: 'v1',
          fromWarehouseId: 'w1',
          toWarehouseId: 'w2',
          qty,
        }),
      ).rejects.toThrow()
    }
    expect(houses.lastTransfer).toBeNull()
  })

  it('itna maal us godown mein na ho to mana ho jata hai', async () => {
    const { service, houses } = build()
    houses.transferResult = false
    await expect(
      service.transfer({
        supplierId: SUPPLIER,
        variantId: 'v1',
        fromWarehouseId: 'w1',
        toWarehouseId: 'w2',
        qty: 500,
      }),
    ).rejects.toThrow()
  })

  it('sahi muntaqili chal jati hai', async () => {
    const { service, houses } = build()
    await expect(
      service.transfer({
        supplierId: SUPPLIER,
        variantId: 'v1',
        fromWarehouseId: 'w1',
        toWarehouseId: 'w2',
        qty: 4,
      }),
    ).resolves.toBeUndefined()
    expect(houses.lastTransfer).toMatchObject({ qty: 4, actorId: SUPPLIER })
  })
})

describe('khep aur maddat', () => {
  it('🔴 guzri hui maddat wala maal ANDAR nahi aata', async () => {
    /*
     * Aisa maal reseller ke status par ja kar customer tak pohanchta hai, aur us ka
     * bhugtaan reseller ki sakh se hota hai. "Naya maal aaya" likhna us jhoot ki
     * shuruaat hai.
     */
    const { service, ledger } = build()
    await expect(
      service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 5, expiryAt: day(-1) }),
    ).rejects.toThrow()
    expect(ledger.lastStockIn).toBeNull()
  })

  it('aaj ki maddat qubool hai — abhi guzri nahi', async () => {
    const { service } = build()
    await expect(
      service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 5, expiryAt: day(1) }),
    ).resolves.toBe(15)
  })

  it('🔴 khep ke khaane MARZI ke hain — na den to bhi maal chala jata hai', async () => {
    // Kapre wali dukan ke liye ye sawal banta hi nahi
    const { service, ledger } = build()
    await service.stockIn({ supplierId: SUPPLIER, variantId: 'v1', qty: 5 })
    expect(ledger.lastStockIn).not.toHaveProperty('expiryAt')
    expect(ledger.lastStockIn).not.toHaveProperty('batchNo')
  })

  it('har khep par us ka haal aur baqi din lagte hain', async () => {
    const { service, batches } = build()
    batches.rows = [
      batchRow({ id: 'mari', expiryAt: day(-2) }),
      batchRow({ id: 'qareeb', expiryAt: day(5) }),
      batchRow({ id: 'be-maddat', expiryAt: null }),
    ]

    const rows = await service.expiringStock(SUPPLIER)
    expect(rows.map((r) => r.state)).toEqual(['expired', 'expiring', 'noExpiry'])
    expect(rows.map((r) => r.daysLeft)).toEqual([-2, 5, null])
  })

  it('khep zaya karne par wajah LAZMI hai', async () => {
    const { service, batches } = build()
    await expect(
      service.writeOffBatch({ supplierId: SUPPLIER, batchId: 'batch-1', qty: 2, note: '' }),
    ).rejects.toThrow()
    expect(batches.lastWriteOff).toBeNull()
  })

  it('🔴 doosri dukan ki khep — jawab wohi "nahi mila"', async () => {
    const { service, batches } = build()
    batches.writeOffResult = null
    await expect(
      service.writeOffBatch({
        supplierId: SUPPLIER,
        batchId: 'kisi-aur-ki',
        qty: 2,
        note: 'maddat guzar gayi',
      }),
    ).rejects.toThrow()
  })

  it('sahi soorat mein nayi kul ginti wapas milti hai', async () => {
    const { service, batches } = build()
    await expect(
      service.writeOffBatch({
        supplierId: SUPPLIER,
        batchId: 'batch-1',
        qty: 4,
        note: '  maddat guzar gayi  ',
      }),
    ).resolves.toBe(8)
    expect(batches.lastWriteOff).toMatchObject({ note: 'maddat guzar gayi', qty: 4 })
  })
})
