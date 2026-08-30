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
  AppErrorRow,
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
const APP_URL = 'https://oyebazar.com'

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
  unsellable: ProductFlagRow[] = []
  errors: AppErrorRow[] = []

  async disputedPayouts() {
    return this.disputed
  }
  async overduePayouts() {
    return this.overdue
  }
  async unansweredOrders() {
    return this.orders
  }
  async openIssues() {
    return []
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
  async unsellableProducts() {
    return this.unsellable
  }
  async appErrors() {
    return this.errors
  }
}

function serviceWith(patch: (repo: FakeTriage) => void): OpsTriageService {
  const repo = new FakeTriage()
  patch(repo)
  return new OpsTriageService(repo, clock, APP_URL)
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
          supplierToken: null,
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
          supplierToken: 'tok-1',
          since: new Date('2026-08-25T01:00:00Z'),
        },
      ]
    }).flags()

    expect(flags[0]?.action?.kind).toBe('whatsapp')
    expect(flags[0]?.action?.phone).toBe('923001000003')

    /*
     * 🔴 Paighaam mein LINK hona lazmi hai — yehi is nishan ki jaan hai. WhatsApp ka
     * provider juda nahi, is liye dukan ko order ki khabar sirf isi raste se pohanchti
     * hai. Number hona kaafi nahi tha.
     */
    expect(flags[0]?.action?.text).toContain('https://oyebazar.com/supplier/o/tok-1')
    expect(flags[0]?.action?.text).toContain('BJ-1001')
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

describe('bik na sakne wala maal', () => {
  it('🔴 LIVE magar bina stock ke maal pakra jata hai — reseller us par status laga sakti hai', async () => {
    // Us ka anjaam: order aata hai, `reserve()` mana kar deta hai, aur wo apne customer
    // ke saamne jhooti banti hai
    const { flags } = await serviceWith((repo) => {
      repo.unsellable = [product({ productId: 'gum-shuda' })]
    }).flags()

    expect(flags).toHaveLength(1)
    expect(flags[0]?.kind).toBe('unsellable')
    expect(flags[0]?.severity).toBe('medium')
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
          supplierToken: null,
          since: NOW,
        },
        {
          orderId: 'o2',
          orderNo: 'BJ-2',
          supplierName: 'د',
          supplierPhone: '9230010000001',
          resellerName: 'ص',
          hoursWaiting: 50,
          supplierToken: null,
          since: new Date('2026-08-26T10:00:00Z'),
        },
      ]
    }).flags()

    expect(flags).toHaveLength(1)
    expect(counts.high + counts.medium + counts.low).toBe(flags.length)
  })
})

describe('app ki kharabi', () => {
  it('🔴 ek hi jaisi ghaltiyan EK qatar mein — ginti ke saath', async () => {
    /*
     * Har error alag qatar banane se list foran bekar ho jati hai: ek toota hua button
     * ek ghante mein saikron qataren de sakta hai, aur un ke neeche wo cheezein dab jati
     * hain jin par ops waqai kaam kar sakti hai.
     */
    const { flags } = await serviceWith((repo) => {
      repo.errors = [
        {
          message: 'Cannot read properties of undefined',
          count: 42,
          firstAt: new Date('2026-08-28T09:00:00Z'),
          lastAt: new Date('2026-08-28T11:30:00Z'),
        },
      ]
    }).flags()

    expect(flags).toHaveLength(1)
    expect(flags[0]?.kind).toBe('appError')
    expect(flags[0]?.values.count).toBe(42)
  })

  it('🔴 ek dafa hone wali kharabi bhi `high` hai — ginti us ka darja tay nahi karti', async () => {
    // Ek dafa ki kharabi bhi kisi EK bande ka kaam rok chuki hoti hai, aur wo banda
    // aksar shikayat nahi karta — wo safha band kar ke chala jata hai
    const { flags } = await serviceWith((repo) => {
      repo.errors = [
        { message: 'boom', count: 1, firstAt: NOW, lastAt: NOW },
      ]
    }).flags()

    expect(flags[0]?.severity).toBe('high')
  })
})
