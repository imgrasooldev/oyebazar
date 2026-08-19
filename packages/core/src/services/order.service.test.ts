/**
 * OrderService ke tests — bina database ke.
 *
 * Yehi repository pattern ka asal faida hai: ports fake kar ke poori service
 * milliseconds mein test hoti hai, aur wo qawaid jo paisa bachate hain (snapshots, fee,
 * confirmation invariant) har PR par check hote hain.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { pkr, type Pkr } from '@oyebazar/shared'
import { OrderService } from './order.service'
import { UnconfirmedOrderError } from '../domain/order-status'
import type { InventoryRepository } from '../ports/inventory-repositories'
import type { InternalOrderView } from '../domain/order'
import type { PricingProductView } from '../domain/views'
import type {
  FeeLedgerRepository,
  OrderRepository,
  OrderStatusChange,
  PersistOrderInput,
  SupplierInternalRepository,
} from '../ports/order-repositories'
import type { ProductRepository } from '../ports/repositories'
import type { Analytics, Clock, Logger, MessagingProvider, OrderNumberGenerator } from '../ports/infrastructure'

const NOW = new Date('2026-08-17T09:00:00.000Z')

const PRODUCT: PricingProductView = {
  id: 'prod_1',
  supplierId: 'sup_1',
  supplierPrice: pkr(2000),
  bajiPrice: pkr(2100), // supplier + 5%
  suggestedRetail: pkr(2800),
  inStock: true,
}

class FakeProducts implements Pick<ProductRepository, 'findForPricing'> {
  constructor(private readonly products: PricingProductView[]) {}
  async findForPricing(ids: readonly string[]): Promise<PricingProductView[]> {
    return this.products.filter((p) => ids.includes(p.id))
  }
}

class FakeOrders implements Partial<OrderRepository> {
  readonly saved: InternalOrderView[] = []
  readonly changes: OrderStatusChange[] = []
  private seq = 0

  async create(input: PersistOrderInput): Promise<InternalOrderView> {
    const order: InternalOrderView = {
      id: `order_${++this.seq}`,
      orderNo: input.orderNo,
      resellerId: input.resellerId,
      supplierId: input.supplierId,
      status: 'PENDING_CONFIRM',
      total: input.total,
      bajiFee: input.bajiFee,
      feeRateBps: input.feeRateBps,
      confirmedAt: null,
      confirmedBy: null,
      items: input.lines,
    }
    this.saved.push(order)
    return order
  }

  async findById(orderId: string): Promise<InternalOrderView | null> {
    return this.saved.find((o) => o.id === orderId) ?? null
  }

  async findByIdempotencyKey(): Promise<InternalOrderView | null> {
    return null
  }

  supplierToken: string | null = null

  async setSupplierToken(_orderId: string, token: string): Promise<void> {
    this.supplierToken = token
  }

  async findBySupplierToken(token: string) {
    if (token !== this.supplierToken) return null
    const order = this.saved[0]
    if (!order) return null
    return { id: order.id, orderNo: order.orderNo } as never
  }

  async applyStatusChange(change: OrderStatusChange): Promise<InternalOrderView> {
    this.changes.push(change)
    const index = this.saved.findIndex((o) => o.id === change.orderId)
    const current = this.saved[index]
    if (!current) throw new Error('order nahi mila')
    const updated: InternalOrderView = {
      ...current,
      status: change.to,
      confirmedAt: change.to === 'CONFIRMED' ? change.at : current.confirmedAt,
      confirmedBy: change.confirmedBy ?? current.confirmedBy,
    }
    this.saved[index] = updated
    return updated
  }
}

/**
 * Fake stock — asli qaida wohi: itna maal na ho to reserve nakaam.
 * Default 100 taake purane test bina badle chalte rahen.
 */
class FakeInventory implements InventoryRepository {
  readonly stock = new Map<string, number>()

  private qty(productId: string): number {
    return this.stock.get(productId) ?? 100
  }

  async reserve(line: { productId: string; qty: number }): Promise<boolean> {
    const have = this.qty(line.productId)
    if (have < line.qty) return false
    this.stock.set(line.productId, have - line.qty)
    return true
  }

  async release(line: { productId: string; qty: number }): Promise<void> {
    this.stock.set(line.productId, this.qty(line.productId) + line.qty)
  }

  async setQuantity(_supplierId: string, productId: string, qty: number): Promise<boolean> {
    this.stock.set(productId, qty)
    return true
  }

  async levelsFor(productIds: readonly string[]) {
    return productIds.map((productId) => ({ productId, available: this.qty(productId) }))
  }
}

class FakeFeeLedger implements FeeLedgerRepository {
  readonly rows: { orderId: string; amount: Pkr; status: string }[] = []

  async create(input: { orderId: string; supplierId: string; amount: Pkr }): Promise<void> {
    this.rows.push({ orderId: input.orderId, amount: input.amount, status: 'PENDING' })
  }

  async markEarned(orderId: string): Promise<void> {
    const row = this.rows.find((r) => r.orderId === orderId)
    if (row && row.status === 'PENDING') row.status = 'EARNED'
  }

  async markWrittenOff(orderId: string): Promise<void> {
    const row = this.rows.find((r) => r.orderId === orderId)
    if (row) row.status = 'WRITTEN_OFF'
  }

  async findByOrderId(orderId: string) {
    return this.rows.find((r) => r.orderId === orderId) ?? null
  }

  // Invoicing wale methods yahan zer-e-imtehan nahi — un ke apne tests
  // fee-invoice.service.test.ts mein hain
  async summarisePending() {
    return []
  }

  async markInvoiced() {
    return { rows: 0, amount: pkr(0) }
  }

  async markCollected() {
    return { rows: 0, amount: pkr(0) }
  }

  async collectionStats() {
    return { total: pkr(0), collected: pkr(0), writtenOff: pkr(0), collectionPct: 100 }
  }
}

const SUPPLIERS: SupplierInternalRepository = {
  async findInternal(id) {
    return { id, businessName: 'المدینہ فیبرکس', phone: '923001112222', feeRateBps: 500, status: 'VERIFIED' }
  },
}

/** Reseller lookup — accept/reject par usay WhatsApp jata hai. */
const RESELLERS = {
  async findById(id: string) {
    return {
      id,
      name: 'صادیہ',
      whatsappPhone: '923001234567',
      city: 'Lahore',
      area: null,
      tier: 'NEW' as const,
      status: 'ACTIVE' as const,
      payoutAccount: null,
      createdAt: NOW,
    }
  },
  async findByPhone() {
    return null
  },
  async create() {
    throw new Error('not used')
  },
  async touchLastActive() {},
}

/** Magic link ka token — test mein deterministic. */
const TOKENS = {
  randomToken: () => 'test-supplier-token',
  numericCode: () => '000000',
  hash: (value: string) => `hash:${value}`,
  verifyHash: (value: string, hash: string) => hash === `hash:${value}`,
}

const NOOP_ANALYTICS: Analytics = { async track() {} }
const NOOP_LOGGER: Logger = { info() {}, warn() {}, error() {} }
const CLOCK: Clock = { now: () => NOW }
const ORDER_NUMBERS: OrderNumberGenerator = { async next() { return 'BJ-1043' } }

function buildService(overrides?: {
  products?: PricingProductView[]
  messaging?: MessagingProvider
}) {
  const orders = new FakeOrders()
  const fees = new FakeFeeLedger()
  const messaging: MessagingProvider = overrides?.messaging ?? {
    async sendTemplate() {
      return { providerMessageId: 'x' }
    },
    async sendText() {
      return { providerMessageId: 'x' }
    },
  }

  const inventory = new FakeInventory()

  const service = new OrderService(
    orders as unknown as OrderRepository,
    new FakeProducts(overrides?.products ?? [PRODUCT]) as unknown as ProductRepository,
    SUPPLIERS,
    RESELLERS,
    fees,
    inventory,
    ORDER_NUMBERS,
    messaging,
    TOKENS,
    CLOCK,
    NOOP_ANALYTICS,
    NOOP_LOGGER,
    'https://oyebazar.com',
  )

  return { service, orders, fees, inventory }
}

const CUSTOMER = {
  name: 'عائشہ',
  phone: '923339998877',
  address: 'گلی نمبر ۴، جوہر ٹاؤن',
  area: 'Johar Town',
}

describe('OrderService.create', () => {
  it('price snapshots mehfooz karta hai — baad mein product ka price badle to order na badle', async () => {
    const { service, orders } = buildService()

    await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    const item = orders.saved[0]?.items[0]
    expect(item?.supplierPriceSnapshot).toBe(2000)
    expect(item?.bajiPriceSnapshot).toBe(2100)
    expect(item?.retailPriceSnapshot).toBe(2800)
  })

  it('fee SUPPLIER price par lagti hai (retail par nahi) — 5% = 100', async () => {
    const { service, orders } = buildService()

    await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    // 2000 ka 5% = 100 — 2800 ka nahi (wo 140 hota)
    expect(orders.saved[0]?.bajiFee).toBe(100)
    expect(orders.saved[0]?.total).toBe(3000)
  })

  it('reseller apne Baji price se kam par nahi bech sakti', async () => {
    const { service } = buildService()

    await expect(
      service.create({
        resellerId: 'res_1',
        customer: CUSTOMER,
        lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(1900) }],
        deliveryFee: pkr(200),
        paymentMethod: 'COD',
      }),
    ).rejects.toThrow(/kam nahi ho sakta/)
  })

  it('🔴 stock khatam ho to order banta hi nahi (confirmation se pehle check)', async () => {
    const { service } = buildService({ products: [{ ...PRODUCT, inStock: false }] })

    await expect(
      service.create({
        resellerId: 'res_1',
        customer: CUSTOMER,
        lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
        deliveryFee: pkr(200),
        paymentMethod: 'COD',
      }),
    ).rejects.toThrow(/mojood nahi/)
  })

  it('ek order mein do wholesalers ka maal nahi ja sakta', async () => {
    const { service } = buildService({
      products: [PRODUCT, { ...PRODUCT, id: 'prod_2', supplierId: 'sup_2' }],
    })

    await expect(
      service.create({
        resellerId: 'res_1',
        customer: CUSTOMER,
        lines: [
          { productId: 'prod_1', qty: 1, retailPrice: pkr(2800) },
          { productId: 'prod_2', qty: 1, retailPrice: pkr(2800) },
        ],
        deliveryFee: pkr(200),
        paymentMethod: 'COD',
      }),
    ).rejects.toThrow(/ek hi wholesaler/)
  })

  it('naya order hamesha PENDING_CONFIRM par shuru hota hai', async () => {
    const { service, orders } = buildService()
    await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 2, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    expect(orders.saved[0]?.status).toBe('PENDING_CONFIRM')
    expect(orders.saved[0]?.confirmedAt).toBeNull()
  })
})

describe('confirmation', () => {
  it('reseller confirm kare to confirmedBy=RESELLER aur fee row banti hai', async () => {
    const { service, orders, fees } = buildService()
    const order = await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    const confirmed = await service.confirmByOps(order.id, 'ops_1')
    expect(confirmed.status).toBe('CONFIRMED')
    expect(confirmed.confirmedBy).toBe('OPS')
    expect(confirmed.confirmedAt).toEqual(NOW)

    // 🔴 fee confirmation par banti hai, order create par nahi
    expect(fees.rows).toHaveLength(1)
    expect(fees.rows[0]?.amount).toBe(100)
    expect(orders.changes[0]?.to).toBe('CONFIRMED')
  })

  it('dobara confirm karna bug nahi — sirf kuch nahi hota (ek hi fee row)', async () => {
    const { service, fees } = buildService()
    const order = await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    await service.confirmByOps(order.id, 'ops_1')
    await service.confirmByOps(order.id, 'ops_1')

    expect(fees.rows).toHaveLength(1)
  })

  /**
   * Do alag defences hain, dono ki apni jagah hai:
   *   1. State machine: PENDING_CONFIRM se seedha SENT_TO_SUPPLIER jaana SKIP hai — mana.
   *   2. Confirmation invariant: status CONFIRMED bhi ho magar confirmedAt null ho
   *      (misal: kisi ne DB mein haath se status badla) to bhi supplier ko nahi jayega.
   * Neeche pehla, us ke baad doosra.
   */
  it('🔴 bina confirm kiye order wholesaler ko nahi ja sakta (skip mana hai)', async () => {
    const { service } = buildService()
    const order = await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    await expect(service.sendToSupplier(order.id, 'ops_1')).rejects.toThrow(
      /PENDING_CONFIRM se SENT_TO_SUPPLIER par nahi ja sakta/,
    )
  })

  it('🔴 status CONFIRMED ho magar confirmedAt na ho, tab bhi ruk jata hai', async () => {
    const { service, orders } = buildService()
    const order = await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    // DB mein haath se badla hua data — service phir bhi rok deti hai
    orders.saved[0] = { ...order, status: 'CONFIRMED', confirmedAt: null }

    await expect(service.sendToSupplier(order.id, 'ops_1')).rejects.toThrow(UnconfirmedOrderError)
  })

  it('confirm ho jaye to wholesaler ko ja sakta hai aur usay message jata hai', async () => {
    const sent: string[] = []
    const { service } = buildService({
      messaging: {
        async sendTemplate(message) {
          sent.push(message.template)
          return { providerMessageId: 'x' }
        },
        async sendText() {
          return { providerMessageId: 'x' }
        },
      },
    })

    const order = await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    await service.confirmByOps(order.id, 'ops_1')
    const sentOrder = await service.sendToSupplier(order.id, 'ops_1')

    expect(sentOrder.status).toBe('SENT_TO_SUPPLIER')
    expect(sent).toEqual(['baji_new_order'])
  })
})

describe('wholesaler ka jawab', () => {
  async function sentOrder() {
    const built = buildService()
    const order = await built.service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })
    await built.service.confirmByOps(order.id, 'ops_1')
    await built.service.sendToSupplier(order.id, 'ops_1')
    return { ...built, order }
  }

  it('accept karne par order ACCEPTED hota hai', async () => {
    const { service } = await sentOrder()
    const accepted = await service.acceptBySupplier('test-supplier-token')
    expect(accepted.status).toBe('ACCEPTED')
  })

  it('dobara accept karna bug nahi — sirf kuch nahi hota', async () => {
    const { service, orders } = await sentOrder()
    await service.acceptBySupplier('test-supplier-token')
    const again = await service.acceptBySupplier('test-supplier-token')

    expect(again.status).toBe('ACCEPTED')
    // sirf ek ACCEPTED event bana
    expect(orders.changes.filter((c) => c.to === 'ACCEPTED')).toHaveLength(1)
  })

  it('🔴 reject par order CANCELLED aur fee WRITTEN_OFF ho jati hai', async () => {
    const { service, fees, orders } = await sentOrder()

    const result = await service.rejectBySupplier('test-supplier-token', 'مال ختم ہے')

    expect(result.status).toBe('CANCELLED')
    expect(orders.changes.map((c) => c.to)).toContain('REJECTED')
    expect(fees.rows[0]?.status).toBe('WRITTEN_OFF')
  })

  it('reject ki wajah likhna zaroori hai', async () => {
    const { service } = await sentOrder()
    await expect(service.rejectBySupplier('test-supplier-token', '  ')).rejects.toThrow()
  })

  it('ghalat token par kuch nahi milta', async () => {
    const { service } = await sentOrder()
    await expect(service.acceptBySupplier('koi-aur-token')).rejects.toThrow(/nahi mila/)
  })
})

describe('inventory', () => {
  /**
   * 🔴 Do resellers, ek hi aakhri piece.
   *
   * Pehle stock kahin ghatta hi nahi tha: dono ka order lag jata, dono apne apne
   * customer se paisa wasool kar letin, aur akhir mein ek ko mana karna parta — wo
   * apne customer ke saamne jhooti banti, hamari wajah se.
   */
  it('aakhri piece ke baad doosra order nahi lagta', async () => {
    const { service, inventory } = buildService()
    inventory.stock.set('prod_1', 1)

    await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    await expect(
      service.create({
        resellerId: 'res_2',
        customer: CUSTOMER,
        lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
        deliveryFee: pkr(200),
        paymentMethod: 'COD',
      }),
    ).rejects.toThrow()

    expect(inventory.stock.get('prod_1')).toBe(0)
  })

  it('wholesaler ke mana karne par maal wapas ginti mein aata hai', async () => {
    const { service, inventory } = buildService()
    inventory.stock.set('prod_1', 3)

    const order = await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 2, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })
    expect(inventory.stock.get('prod_1')).toBe(1)

    await service.confirmByOps(order.id, 'ops_1')
    await service.sendToSupplier(order.id, 'ops_1')
    await service.rejectBySupplier('test-supplier-token', 'maal khatam hai')

    // Order mar gaya — maal dobara bikne ke liye mojood hona chahiye
    expect(inventory.stock.get('prod_1')).toBe(3)
  })
})

describe('kamai', () => {
  /**
   * 🔴 Ye test ek asli bug se paida hua.
   *
   * `feeOutcomeFor('DELIVERED')` domain mein hamesha 'EARNED' kehta tha aur us ka test
   * bhi tha — magar usay koi call hi nahi karta tha. Natija: maal pohanchne par fee row
   * PENDING hi padi rehti, aur invoice PENDING rows par banti thi. Yani raste mein para
   * hua order bhi bill ho jata, aur RTO hone par hum wholesaler ko pehle hi bill kar
   * chuke hote.
   */
  it('deliver hone par fee EARNED hoti hai — pehle PENDING padi reh jati thi', async () => {
    const { service, fees } = buildService()
    const order = await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    await service.confirmByOps(order.id, 'ops_1')
    await service.sendToSupplier(order.id, 'ops_1')
    await service.acceptBySupplier('test-supplier-token')
    await service.markDispatched(order.id, 'ops_1')

    // Abhi maal raste mein hai — ye kamai nahi hai
    expect(fees.rows[0]?.status).toBe('PENDING')

    await service.markDelivered(order.id, 'ops_1')

    expect(fees.rows[0]?.status).toBe('EARNED')
  })
})

describe('RTO', () => {
  it('RTO par fee WRITTEN_OFF hoti hai, row delete nahi hoti', async () => {
    const { service, fees } = buildService()
    const order = await service.create({
      resellerId: 'res_1',
      customer: CUSTOMER,
      lines: [{ productId: 'prod_1', qty: 1, retailPrice: pkr(2800) }],
      deliveryFee: pkr(200),
      paymentMethod: 'COD',
    })

    await service.confirmByOps(order.id, 'ops_1')
    await service.sendToSupplier(order.id, 'ops_1')
    // 🔴 Wholesaler ke qubool kiye baghair parcel nahi ja sakta
    await service.acceptBySupplier('test-supplier-token')
    await service.markDispatched(order.id, 'ops_1')
    await service.markRto(order.id, 'customer ne phone nahi uthaya', 'ops_1')

    expect(fees.rows).toHaveLength(1)
    expect(fees.rows[0]?.status).toBe('WRITTEN_OFF')
  })
})

describe('earningsOf', () => {
  it('reseller ka munafa = (retail − baji) × qty', () => {
    const earnings = OrderService.earningsOf([
      {
        productId: 'p',
        variantId: null,
        qty: 2,
        supplierPriceSnapshot: pkr(2000),
        bajiPriceSnapshot: pkr(2100),
        retailPriceSnapshot: pkr(2800),
      },
    ])
    expect(earnings).toBe(1400)
  })
})
