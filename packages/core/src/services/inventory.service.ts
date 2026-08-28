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
import type {
  LowStockLine,
  StockLedgerRepository,
  StockMoveView,
} from '../ports/inventory-repositories'
import type { Analytics, Logger } from '../ports/infrastructure'
import { NotFoundError, ValidationError } from '@oyebazar/shared'

/** Ek dafa mein itni qataron se zyada nahi — register lamba hota rehta hai. */
const MOVES_LIMIT = 100
/** Khatam hone wale maal ki list ki hadd. */
const LOW_STOCK_LIMIT = 50

/** Ginti ki hadd — wohi jo `setStockQuantity` par pehle se chal rahi hai. */
const MAX_QTY = 100_000
/** Ek piece ki lagat ki upri hadd — is se upar ka number aksar ghalti hoti hai. */
const MAX_UNIT_COST = 10_000_000

export type LowStockView = LowStockLine & { readonly health: StockHealth }

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

    const balance = await this.ledger.stockIn({
      supplierId: input.supplierId,
      variantId: input.variantId,
      qty: input.qty,
      ...(input.unitCost === undefined ? {} : { unitCost: input.unitCost }),
      ...(input.note === undefined ? {} : { note: input.note.trim() }),
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
  async lowStock(supplierId: string): Promise<LowStockView[]> {
    const lines = await this.ledger.lowStock(supplierId, LOW_STOCK_LIMIT)
    return lines.map((line) => ({
      ...line,
      health: stockHealth(line.stockQty, line.reorderLevel),
    }))
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
