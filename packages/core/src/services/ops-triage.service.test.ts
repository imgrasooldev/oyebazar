/**
 * Chhanni ki service — asal cheez ek hi hai: JO NISHAN NAHI BANNA CHAHIYE WO NA BANE.
 *
 * Darjay ka hisab `domain/ops-flags.ts` mein test ho chuka hai. Yahan wo faisle hain jo
 * SERVICE karti hai aur jin par domain ka koi ikhtiyar nahi:
 *
 *  · jis qatar ka darja `null` nikle, wo list mein AATI HI NAHI
 *  · phone sirf un teen nishanon par jata hai jahan agla qadam waqai call hai
 *  · naam ki jaanch DONO zabanon par hoti hai, sirf angrezi par nahi
 *  · aur ginti wahi jo list mein hai — na kam, na zyada
 */
import { describe, expect, it } from 'vitest'
import { OpsTriageService } from './ops-triage.service'
import type {
  DisputedPayoutFlag,
  DuplicateProductRow,
  OddPriceRow,
  OpsTriageRepository,
  OverduePayoutFlag,
  ProductFlagRow,
  StockChurnRow,
  UnansweredOrderFlag,
} from '../ports/ops-triage-repositories'

const NOW = new Date('2026-08-28T12:00:00Z')
const clock = { now: () => NOW }

const product = (over: Partial<ProductFlagRow> = {}): ProductFlagRow => ({
  productId: 'p1',
  slug: 'lawn-suit-1',
  titleUr: 'لان تھری پیس',
  titleEn: 'Lawn 3 Piece',
  supplierName: 'فیصل فیبرکس',
  createdAt: new Date('2026-08-01T00:00:00Z'),
  ...over,
})

/** Khali chhanni — har test sirf wo hissa bharta hai jis ki us ko zaroorat hai. */
class FakeTriage implements OpsTriageRepository {
  disputed: DisputedPayoutFlag[] = []
  overdue: OverduePayoutFlag[] = []
  orders: UnansweredOrderFlag[] = []
  odd: OddPriceRow[] = []
  dupes: DuplicateProductRow[] = []
  uncategorised: ProductFlagRow[] = []
  titles: ProductFlagRow[] = []
  churn: StockChurnRow[] = []

  async disputedPayouts() {
    return this.disputed
  }
  async overduePayouts() {
    return this.overdue
  }
  async unansweredOrders() {
    return this.orders
  }
  async oddPricedProducts() {
    return this.odd
  }
  async duplicateProducts() {
    return this.dupes
  }
  async uncategorisedProducts() {
    return this.uncategorised
  }
  async liveProductTitles() {
    return this.titles
  }
  async stockChurn() {
    return this.churn
  }
}

function serviceWith(patch: (repo: FakeTriage) => void): OpsTriageService {
  const repo = new FakeTriage()
  patch(repo)
  return new OpsTriageService(repo, clock)
}

describe('chhanni — kya list mein aata hai', () => {
  it('sab kuch theek ho to list khali — aur ginti bhi sifar', async () => {
    const { flags, counts } = await serviceWith(() => {}).flags()
    expect(flags).toHaveLength(0)
    expect(counts).toEqual({ high: 0, medium: 0, low: 0 })
  })

  it('🔴 jis order ka intezar hadd se kam ho wo list mein AATA HI NAHI', async () => {
    /*
     * Repository hadd ke saath poochhti hai, magar bharosa us par nahi kiya jata: darja
     * `null` aane par service khud girati hai. Bina is ke ek din repository ki hadd
     * badalti aur list chup chaap har naye order se bhar jati.
     */
    const { flags } = await serviceWith((repo) => {
      repo.orders = [
        {
          orderId: 'o1',
          orderNo: 'BJ-1001',
          supplierName: 'دکان',
          supplierPhone: '923001000001',
          resellerName: 'صادیہ',
          hoursWaiting: 3,
          since: NOW,
        },
      ]
    }).flags()

    expect(flags).toHaveLength(0)
  })

  it('🔴 baqaya payout jis ki der sifar ho, wo bhi nahi aati', async () => {
    const { flags } = await serviceWith((repo) => {
      repo.overdue = [
        {
          payoutId: 'p1',
          orderNo: 'BJ-1002',
          amount: 450,
          supplierName: 'دکان',
          supplierPhone: '923001000001',
          resellerName: 'صادیہ',
          daysLate: 0,
          since: NOW,
        },
      ]
    }).flags()

    expect(flags).toHaveLength(0)
  })

  it('🔴 aam rate wala maal nahi aata — chahe repository usay laut de', async () => {
    const { flags } = await serviceWith((repo) => {
      repo.odd = [
        { ...product(), supplierPrice: 1_200, categoryName: 'کپڑا', categoryMedian: 1_000 },
      ]
    }).flags()

    expect(flags).toHaveLength(0)
  })
})

describe('phone — sirf wahan jahan agla qadam call hai', () => {
  it('jawab na dene wale order par dukan ka number jata hai', async () => {
    const { flags } = await serviceWith((repo) => {
      repo.orders = [
        {
          orderId: 'o1',
          orderNo: 'BJ-1001',
          supplierName: 'دکان',
          supplierPhone: '923001000003',
          resellerName: 'صادیہ',
          hoursWaiting: 83,
          since: new Date('2026-08-25T01:00:00Z'),
        },
      ]
    }).flags()

    expect(flags[0]?.action).toEqual({
      kind: 'call',
      phone: '923001000003',
      who: 'supplier',
    })
  })

  it('🔴 jhagre mein DUKAN ka number — reseller ka nahi', async () => {
    // Reseller apni baat pehle hi likh chuki hai; jo jawab nahi mila wo dukan ka hai
    const { flags } = await serviceWith((repo) => {
      repo.disputed = [
        {
          payoutId: 'p1',
          orderNo: 'BJ-1003',
          amount: 450,
          supplierName: 'دکان',
          supplierPhone: '923001000001',
          resellerName: 'صادیہ',
          resellerPhone: '923002000001',
          note: 'nahi mile',
          disputedAt: new Date('2026-08-26T00:00:00Z'),
        },
      ]
    }).flags()

    expect(flags[0]?.action?.phone).toBe('923001000001')
    expect(flags[0]?.action?.who).toBe('supplier')
  })

  it('🔴 maal ke nishanon par koi phone nahi — wahan agla qadam safha kholna hai', async () => {
    const { flags } = await serviceWith((repo) => {
      repo.uncategorised = [product()]
      repo.dupes = [{ ...product(), copies: 2 }]
      repo.churn = [
        {
          variantId: 'v1',
          productId: 'p1',
          titleUr: 'لان',
          titleEn: 'Lawn',
          supplierName: 'دکان',
          fixes: 6,
          since: new Date('2026-08-01T00:00:00Z'),
        },
      ]
    }).flags()

    expect(flags).toHaveLength(3)
    expect(flags.every((flag) => flag.action === undefined)).toBe(true)
  })
})

describe('naam ki jaanch', () => {
  it('🔴 Urdu naam kharab ho to pakra jata hai — chahe angrezi theek ho', async () => {
    /*
     * Bazaar par Urdu naam hi chhapta hai. Sirf angrezi dekhne se wo maal nikal jata
     * jis ka Urdu naam "test" ho — aur us ka safha har us bande ko dikhta hai jo Google
     * se aata hai.
     */
    const { flags } = await serviceWith((repo) => {
      repo.titles = [product({ titleUr: 'test product', titleEn: 'Lawn 3 Piece' })]
    }).flags()

    expect(flags).toHaveLength(1)
    expect(flags[0]?.kind).toBe('oddTitle')
    expect(flags[0]?.values.problem).toBe('placeholder')
  })

  it('theek naam par kuch nahi', async () => {
    const { flags } = await serviceWith((repo) => {
      repo.titles = [product(), product({ productId: 'p2', titleUr: 'بستر کی چادر' })]
    }).flags()

    expect(flags).toHaveLength(0)
  })
})

describe('tarteeb aur ginti', () => {
  it('bhaari pehle, aur ek jaise darje mein purana upar', async () => {
    const { flags, counts } = await serviceWith((repo) => {
      repo.uncategorised = [product({ productId: 'low1' })]
      repo.disputed = [
        {
          payoutId: 'naya',
          orderNo: 'BJ-2',
          amount: 100,
          supplierName: 'د',
          supplierPhone: '9230010000001',
          resellerName: 'ص',
          resellerPhone: '9230020000001',
          note: null,
          disputedAt: new Date('2026-08-27T00:00:00Z'),
        },
        {
          payoutId: 'purana',
          orderNo: 'BJ-1',
          amount: 100,
          supplierName: 'د',
          supplierPhone: '9230010000001',
          resellerName: 'ص',
          resellerPhone: '9230020000001',
          note: null,
          disputedAt: new Date('2026-08-10T00:00:00Z'),
        },
      ]
    }).flags()

    expect(flags.map((flag) => flag.id)).toEqual(['purana', 'naya', 'low1'])
    expect(counts).toEqual({ high: 2, medium: 0, low: 1 })
  })

  it('ginti wohi jo list mein hai — girayi hui qataren isme nahi ginti', async () => {
    const { flags, counts } = await serviceWith((repo) => {
      repo.orders = [
        {
          orderId: 'o1',
          orderNo: 'BJ-1',
          supplierName: 'د',
          supplierPhone: '9230010000001',
          resellerName: 'ص',
          hoursWaiting: 2, // hadd se neeche — giregi
          since: NOW,
        },
        {
          orderId: 'o2',
          orderNo: 'BJ-2',
          supplierName: 'د',
          supplierPhone: '9230010000001',
          resellerName: 'ص',
          hoursWaiting: 50,
          since: new Date('2026-08-26T10:00:00Z'),
        },
      ]
    }).flags()

    expect(flags).toHaveLength(1)
    expect(counts.high + counts.medium + counts.low).toBe(flags.length)
  })
})
