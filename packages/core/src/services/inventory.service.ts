/**
 * Maal ka nizam — aana, jana, zaya hona, aur us ka hisab.
 *
 * 🔴 Ye `SupplierCatalogueService` se alag rakha gaya hai halanke dono dukan wale hi ke
 * kaam hain. Farq sawal ka hai: catalogue "kya bech raha hoon" ka jawab deta hai (naam,
 * tasveer, rate — jo BAHAR nazar aata hai), aur ye "mere paas kya para hai" ka (ginti,
 * lagat, register — jo sirf ANDAR ka hisab hai). Do alag sawal, do alag safhe, aur is
 * dooosre par wo cheezein aati hain jo kisi aur ko kabhi nahi dikhtin.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 Lagat (`avgCost`, `unitCost`) is nizam ka sab se HASSAS number hai — `supplierPrice`
 * se bhi zyada.
 *
 * `supplierPrice` se sirf hamara margin khulta hai. Lagat se dukan ka MUNAFA khulta hai:
 * jo bhi ye jaan le ke maal 180 ka aata hai aur 240 ka bikta hai, wo us dukan se mol
 * bhao karne baith jata hai. Isi liye ye number kisi bhi reseller-facing ya public DTO
 * mein kabhi nahi jata — bilkul waise jaise `supplierPrice` nahi jata (dekhen
 * `packages/db/src/selectors.ts`), aur is ka rasta yahan se aage kahin khulta hi nahi.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { stockHealth, stockValuation, type StockHealth } from '../domain/stock'
import { EXPIRING_DAYS, batchState, daysLeft, type BatchState } from '../domain/batch'
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
import type { Analytics, Clock, Logger } from '../ports/infrastructure'
import { ConflictError, NotFoundError, ValidationError } from '@oyebazar/shared'

/** Ek dafa mein itni qataron se zyada nahi — register lamba hota rehta hai. */
const MOVES_LIMIT = 100
/** Khatam hone wale maal ki list ki hadd. */
const LOW_STOCK_LIMIT = 50
/** Poore maal ki list ki hadd — is se aage safha khud hi na-qabil-e-parh ho jata hai. */
const ALL_STOCK_LIMIT = 200
/** Maddat wali list ki hadd. */
const EXPIRING_LIMIT = 50

/** Ginti ki hadd — wohi jo `setStockQuantity` par pehle se chal rahi hai. */
const MAX_QTY = 100_000
/** Ek piece ki lagat ki upri hadd — is se upar ka number aksar ghalti hoti hai. */
const MAX_UNIT_COST = 10_000_000

export type InventoryLineView = InventoryLine & { readonly health: StockHealth }

/** Ek khep — apne haal aur baqi dinon ke saath. */
export type BatchLineView = BatchView & {
  readonly state: BatchState
  /** Maddat mein kitne din baqi — manfi = guzar chuki, null = maddat hai hi nahi */
  readonly daysLeft: number | null
}

export type StockSummary = {
  /** Maal ki kul qeemat — sirf us hissay ki jis ki lagat maloom hai. */
  readonly value: number
  /** Kitne piece par ye qeemat khari hai. */
  readonly covered: number
  /** Kul kitne piece pare hain. */
  readonly total: number
  /** Khatam ho chuki qataren. */
  readonly outCount: number
  /** Dukan ki apni hadd par aa chuki qataren. */
  readonly lowCount: number
}

export class InventoryService {
  constructor(
    private readonly ledger: StockLedgerRepository,
    /*
     * Godown alag port se aata hai halanke amal mein dono ek hi Prisma class hain.
     * Wajah: "ginti kya hai" aur "wo kis jagah hai" do alag sawal hain, aur kal godown
     * kisi doosri jagah se aa sakte hain (dukan ka apna nizam) bina ginti wale raste ko
     * chhue.
     */
    private readonly warehouses: WarehouseRepository,
    /*
     * Khep alag port se — aur wo farq maani rakhta hai: ginti har dukan ka mauzu hai,
     * khep sirf us dukan ka jo maddat wala maal bechti hai. Ek hi port mein daal dene se
     * kapre wali dukan ke saamne bhi ye poora hissa aa jata.
     */
    private readonly batches: BatchRepository,
    private readonly clock: Clock,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
  ) {}

  /**
   * Naya maal aaya.
   *
   * 🔴 `setStockQuantity` ("ab itne hain") se alag amal hai, aur dono ka rehna zaroori
   * hai. Dukan wala do bilkul mukhtalif mauqon par ginti chhoota hai: jab NAYA maal
   * utarta hai (wo jorna hai, aur us ka rate hota hai), aur jab gin kar dekhta hai ke
   * ginti ghalat thi (wo theek karna hai). Ek hi khaana dono ke liye rakhne se register
   * mein dono ek jaise likhe jate — aur phir "kitna maal aaya is mahine" ka jawab kabhi
   * nikaala hi na ja sakta.
   */
  async stockIn(input: {
    supplierId: string
    variantId: string
    qty: number
    unitCost?: number | undefined
    note?: string | undefined
    warehouseId?: string | undefined
    batchNo?: string | undefined
    expiryAt?: Date | undefined
  }): Promise<number> {
    if (!Number.isInteger(input.qty) || input.qty <= 0 || input.qty > MAX_QTY) {
      throw new ValidationError('Ginti theek nahi')
    }
    if (
      input.unitCost !== undefined &&
      (!Number.isInteger(input.unitCost) || input.unitCost < 0 || input.unitCost > MAX_UNIT_COST)
    ) {
      throw new ValidationError('Lagat theek nahi')
    }
    /*
     * 🔴 Guzri hui maddat wala maal andar nahi aata.
     *
     * Ye sakhti jaan boojh kar hai: aisa maal reseller ke status par ja kar customer tak
     * pohanchta hai, aur us ka bhugtaan reseller ki sakh se hota hai. Jo maal pehle hi
     * mar chuka ho usay "naya maal aaya" likhna us jhoot ki shuruaat hai.
     */
    if (input.expiryAt && input.expiryAt.getTime() < this.clock.now().getTime()) {
      throw new ValidationError('Maddat guzar chuki hai — ye maal andar nahi daala ja sakta')
    }

    const balance = await this.ledger.stockIn({
      supplierId: input.supplierId,
      variantId: input.variantId,
      qty: input.qty,
      ...(input.unitCost === undefined ? {} : { unitCost: input.unitCost }),
      ...(input.note === undefined ? {} : { note: input.note.trim() }),
      ...(input.warehouseId === undefined ? {} : { warehouseId: input.warehouseId }),
      ...(input.batchNo === undefined ? {} : { batchNo: input.batchNo.trim() }),
      ...(input.expiryAt === undefined ? {} : { expiryAt: input.expiryAt }),
      actorId: input.supplierId,
    })
    if (balance === null) throw new NotFoundError('Variant', input.variantId)

    await this.analytics.track({
      name: 'stock_in',
      actorType: 'supplier',
      actorId: input.supplierId,
      /*
       * 🔴 `unitCost` yahan JAAN BOOJH KAR nahi bheji jati — sirf ye ke batayi gayi thi
       * ya nahi. Analytics ke waqiat baad mein dashboards aur bahar ke auzaar tak jate
       * hain, aur dukan ki lagat un mein se kisi jagah ka mauzu nahi hai.
       */
      properties: { variantId: input.variantId, qty: input.qty, hasCost: input.unitCost !== undefined },
    })
    this.logger.info('stock_in', {
      supplierId: input.supplierId,
      variantId: input.variantId,
      qty: input.qty,
      balance,
    })

    return balance
  }

  /**
   * Maal toot gaya / kharab / gum.
   *
   * `note` LAZMI hai. Bina wajah ke ghatti hui ginti register mein wohi bemani qatar
   * banti hai jise rokne ke liye ye poora register bana hai — aur zaya hua maal wohi
   * cheez hai jise dukan wala saal ke aakhir mein sab se pehle dekhta hai.
   */
  async writeOff(input: {
    supplierId: string
    variantId: string
    qty: number
    note: string
    warehouseId?: string | undefined
  }): Promise<number> {
    if (!Number.isInteger(input.qty) || input.qty <= 0 || input.qty > MAX_QTY) {
      throw new ValidationError('Ginti theek nahi')
    }
    const note = input.note.trim()
    if (note.length < 3) throw new ValidationError('Wajah likhna zaroori hai')

    const balance = await this.ledger.writeOff({
      supplierId: input.supplierId,
      variantId: input.variantId,
      qty: input.qty,
      note,
      ...(input.warehouseId === undefined ? {} : { warehouseId: input.warehouseId }),
      actorId: input.supplierId,
    })
    /*
     * `null` ke do matlab hain: maal is dukan ka nahi, ya itna maal hai hi nahi. Dono
     * soorton mein jawab ek hi rehna chahiye — warna doosri dukan ka variantId aazma kar
     * ye maloom kiya ja sakta hai ke us ke paas kitna maal para hai.
     */
    if (balance === null) throw new NotFoundError('Variant', input.variantId)

    await this.analytics.track({
      name: 'stock_written_off',
      actorType: 'supplier',
      actorId: input.supplierId,
      properties: { variantId: input.variantId, qty: input.qty },
    })
    this.logger.info('stock_written_off', {
      supplierId: input.supplierId,
      variantId: input.variantId,
      qty: input.qty,
      note,
    })

    return balance
  }

  /** Dukan apni hadd khud rakhti hai — 0 = ishara band. */
  async setReorderLevel(input: {
    supplierId: string
    variantId: string
    level: number
  }): Promise<void> {
    if (!Number.isInteger(input.level) || input.level < 0 || input.level > MAX_QTY) {
      throw new ValidationError('Hadd theek nahi')
    }

    const ok = await this.ledger.setReorderLevel(input)
    if (!ok) throw new NotFoundError('Variant', input.variantId)

    this.logger.info('reorder_level_set', {
      supplierId: input.supplierId,
      variantId: input.variantId,
      level: input.level,
    })
  }

  /** Register — naya sab se upar. */
  moves(input: {
    supplierId: string
    variantId?: string | undefined
    productId?: string | undefined
    limit?: number | undefined
  }): Promise<StockMoveView[]> {
    return this.ledger.moves({
      supplierId: input.supplierId,
      ...(input.variantId ? { variantId: input.variantId } : {}),
      ...(input.productId ? { productId: input.productId } : {}),
      limit: Math.min(input.limit ?? MOVES_LIMIT, MOVES_LIMIT),
    })
  }

  /**
   * Khatam aur khatam hone wala maal.
   *
   * `health` yahin lagti hai (safhe par nahi) taake "kam" ki tareef ek hi jagah ho —
   * dukan ka safha, ops ki chhanni aur kal ka WhatsApp ishara, teenon ko wohi lafz
   * chahiye warna teen jagah teen alag pemane ban jate hain.
   */
  lowStock(supplierId: string): Promise<InventoryLineView[]> {
    return this.withHealth({ supplierId, onlyLow: true, limit: LOW_STOCK_LIMIT })
  }

  /**
   * Poora maal — naya maal daalne ke liye.
   *
   * 🔴 Ye pehle nahi tha aur wo ek asli kami thi: naya maal sirf UN cheezon mein daala
   * ja sakta tha jo khatam ho rahi hon. Yani jis din dukan wala das than utarta (jab
   * maal khatam NAHI hua hota) us din us ke paas koi rasta hi nahi hota — aur wohi din
   * is poore register ka sab se aam din hai.
   */
  allStock(supplierId: string, search?: string): Promise<InventoryLineView[]> {
    return this.withHealth({
      supplierId,
      onlyLow: false,
      limit: ALL_STOCK_LIMIT,
      ...(search?.trim() ? { search: search.trim() } : {}),
    })
  }

  private async withHealth(input: {
    supplierId: string
    onlyLow: boolean
    limit: number
    search?: string | undefined
  }): Promise<InventoryLineView[]> {
    const lines = await this.ledger.lines(input)
    return lines.map((line) => ({
      ...line,
      health: stockHealth(line.stockQty, line.reorderLevel),
    }))
  }

  // ------------------------------------------------------------------- khep

  /** Ek cheez ki saari khepein. */
  async batchesFor(supplierId: string, variantId: string): Promise<BatchLineView[]> {
    const now = this.clock.now()
    const rows = await this.batches.listBatches(supplierId, variantId)
    return rows.map((row) => this.withState(row, now))
  }

  /**
   * Wo maal jis ki maddat guzar chuki ya qareeb hai.
   *
   * 🔴 Khali list yahan sab se AAM jawab hai — aur wo theek hai. Kapre, bartan, jewellery
   * wali dukanen khep likhti hi nahi, aur un ke liye ye khana kabhi nazar nahi aata.
   */
  async expiringStock(supplierId: string): Promise<BatchLineView[]> {
    const now = this.clock.now()
    const before = new Date(now.getTime() + EXPIRING_DAYS * 86_400_000)

    const rows = await this.batches.expiringBatches(supplierId, before, EXPIRING_LIMIT)
    return rows.map((row) => this.withState(row, now))
  }

  /**
   * Maddat guzar chuki khep zaya likhna.
   *
   * `note` yahan bhi LAZMI hai — wohi wajah jo `writeOff` par likhi hai. Farq sirf itna
   * hai ke yahan wo KHEP maloom hai jis se maal gaya, aur wohi ek baat saal ke aakhir
   * mein poochhi jati hai: "kitna maal maddat guzarne par zaya hua".
   */
  async writeOffBatch(input: {
    supplierId: string
    batchId: string
    qty: number
    note: string
  }): Promise<number> {
    if (!Number.isInteger(input.qty) || input.qty <= 0 || input.qty > MAX_QTY) {
      throw new ValidationError('Ginti theek nahi')
    }
    const note = input.note.trim()
    if (note.length < 3) throw new ValidationError('Wajah likhna zaroori hai')

    const balance = await this.batches.writeOffBatch({
      supplierId: input.supplierId,
      batchId: input.batchId,
      qty: input.qty,
      note,
      actorId: input.supplierId,
    })
    /*
     * `null` ke teen matlab hain: khep is dukan ki nahi, us mein itna maal nahi, ya
     * kul ginti hi kam par hai. Teenon par ek hi jawab — warna doosri dukan ki khep ki
     * id aazma kar us ke bare mein kuch maloom kiya ja sakta hai.
     */
    if (balance === null) throw new NotFoundError('Batch', input.batchId)

    await this.analytics.track({
      name: 'batch_written_off',
      actorType: 'supplier',
      actorId: input.supplierId,
      properties: { batchId: input.batchId, qty: input.qty },
    })
    this.logger.info('batch_written_off', {
      supplierId: input.supplierId,
      batchId: input.batchId,
      qty: input.qty,
      note,
    })

    return balance
  }

  private withState(row: BatchView, now: Date): BatchLineView {
    return {
      ...row,
      state: batchState(row.expiryAt, now),
      daysLeft: daysLeft(row.expiryAt, now),
    }
  }

  // ----------------------------------------------------------------- godown

  /** Naam ki hadd — is se lamba naam qatar mein katta hua nazar aata hai. */
  private static readonly MAX_NAME = 40

  listWarehouses(supplierId: string): Promise<WarehouseView[]> {
    return this.warehouses.listWarehouses(supplierId)
  }

  stockByWarehouse(
    supplierId: string,
    variantIds: readonly string[],
  ): Promise<Map<string, WarehouseStockLine[]>> {
    return this.warehouses.stockByWarehouse(supplierId, variantIds)
  }

  async addWarehouse(input: { supplierId: string; name: string }): Promise<WarehouseView> {
    const name = this.cleanName(input.name)

    const created = await this.warehouses.addWarehouse({ supplierId: input.supplierId, name })
    /*
     * Isi naam ka godown pehle se hai. Chup chaap doosra bana dena sab se bura anjaam
     * deta: "Store" naam ke do godown ban jate, ginti un mein bat jati, aur dukan wale
     * ko khud pata na chalta ke maal kis mein daala tha.
     */
    if (!created) throw new ConflictError('Is naam ka godown pehle se hai')

    this.logger.info('warehouse_added', { supplierId: input.supplierId, name })
    return created
  }

  async renameWarehouse(input: {
    supplierId: string
    warehouseId: string
    name: string
  }): Promise<void> {
    const ok = await this.warehouses.renameWarehouse({
      supplierId: input.supplierId,
      warehouseId: input.warehouseId,
      name: this.cleanName(input.name),
    })
    if (!ok) throw new ConflictError('Naam badla nahi ja saka — shayad ye naam pehle se hai')
  }

  async setWarehouseActive(input: {
    supplierId: string
    warehouseId: string
    isActive: boolean
  }): Promise<void> {
    const ok = await this.warehouses.setWarehouseActive(input)
    /*
     * `false` ke do matlab hain: godown is dukan ka nahi, ya wo DEFAULT hai (jise band
     * karna mumkin hi nahi — dekhen port). Dono par ek hi jawab, warna doosri dukan ke
     * godown ki id aazma kar us ke bare mein kuch maloom kiya ja sakta hai.
     */
    if (!ok) throw new ValidationError('Ye godown band nahi kiya ja sakta')
  }

  /**
   * Maal ek godown se doosre.
   *
   * 🔴 Kul ginti bilkul nahi badalti — maal dukan hi mein rehta hai, sirf jagah badalti
   * hai. Isi liye ye `stockIn` + `writeOff` ka jorha nahi ho sakta.
   */
  async transfer(input: {
    supplierId: string
    variantId: string
    fromWarehouseId: string
    toWarehouseId: string
    qty: number
  }): Promise<void> {
    if (!Number.isInteger(input.qty) || input.qty <= 0 || input.qty > MAX_QTY) {
      throw new ValidationError('Ginti theek nahi')
    }
    if (input.fromWarehouseId === input.toWarehouseId) {
      throw new ValidationError('Dono godown ek hi hain')
    }

    const ok = await this.warehouses.transfer({ ...input, actorId: input.supplierId })
    if (!ok) throw new ValidationError('Is godown mein itna maal nahi hai')

    await this.analytics.track({
      name: 'stock_transferred',
      actorType: 'supplier',
      actorId: input.supplierId,
      properties: { variantId: input.variantId, qty: input.qty },
    })
    this.logger.info('stock_transferred', {
      supplierId: input.supplierId,
      variantId: input.variantId,
      qty: input.qty,
    })
  }

  private cleanName(raw: string): string {
    const name = raw.trim()
    if (name.length < 2 || name.length > InventoryService.MAX_NAME) {
      throw new ValidationError('Godown ka naam theek nahi')
    }
    return name
  }

  /** Dukan ke poore maal ka khulasa — safhe ke upar wali qatar. */
  async summary(supplierId: string): Promise<StockSummary> {
    const [lines, low] = await Promise.all([
      this.ledger.valueLines(supplierId),
      this.lowStock(supplierId),
    ])

    const valuation = stockValuation(lines)

    return {
      ...valuation,
      outCount: low.filter((line) => line.health === 'out').length,
      lowCount: low.filter((line) => line.health === 'low').length,
    }
  }
}
