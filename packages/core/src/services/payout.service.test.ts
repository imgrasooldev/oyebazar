/**
 * Payout ke qawaid — asal cheez ek hi hai: EK TARAF KA DAWA HISAB BAND NAHI KARTA.
 *
 * Baqi sab us ke gird hai: kis halat se kis halat mein ja sakte hain, kaun kis ki row
 * chhoo sakta hai, aur jhagra hone par wholesaler ka dawa mitta to nahi.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { pkr } from '@oyebazar/shared'
import { PayoutService, PAYOUT_OVERDUE_DAYS, isOverdue } from './payout.service'
import type { PayoutRepository, PayoutStatus, PayoutView } from '../ports/payout-repositories'

const NOW = new Date('2026-08-20T10:00:00Z')

function makeRow(overrides: Partial<PayoutView> = {}): PayoutView {
  return {
    id: 'p1',
    orderId: 'o1',
    orderNo: 'BJ-1005',
    resellerId: 'r1',
    supplierId: 's1',
    amount: pkr(450),
    status: 'PENDING',
    sentAt: null,
    sentReference: null,
    confirmedAt: null,
    disputedAt: null,
    disputeNote: null,
    createdAt: new Date('2026-08-19T10:00:00Z'),
    ...overrides,
  }
}

class FakePayouts implements PayoutRepository {
  rows: PayoutView[] = [makeRow()]
  created: unknown[] = []

  async create(input: { orderId: string; resellerId: string; supplierId: string; amount: number }) {
    this.created.push(input)
  }
  async findByOrderId(orderId: string) {
    return this.rows.find((r) => r.orderId === orderId) ?? null
  }
  async findForSupplier(supplierId: string, id: string) {
    return this.rows.find((r) => r.id === id && r.supplierId === supplierId) ?? null
  }
  async findForReseller(resellerId: string, id: string) {
    return this.rows.find((r) => r.id === id && r.resellerId === resellerId) ?? null
  }
  private patch(id: string, patch: Partial<PayoutView>, allowed: PayoutStatus[]): boolean {
    const target = this.rows.find((r) => r.id === id)
    if (!target || !allowed.includes(target.status)) return false

    this.rows = this.rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    return true
  }
  async markSent(id: string, reference: string, at: Date) {
    return this.patch(id, { status: 'SENT', sentAt: at, sentReference: reference }, [
      'PENDING',
      'DISPUTED',
    ])
  }
  async markConfirmed(id: string, at: Date) {
    return this.patch(id, { status: 'SETTLED', confirmedAt: at }, ['PENDING', 'SENT', 'DISPUTED'])
  }
  async markDisputed(id: string, note: string, at: Date) {
    return this.patch(id, { status: 'DISPUTED', disputedAt: at, disputeNote: note }, [
      'PENDING',
      'SENT',
    ])
  }
  async resolve() {}
  async listForSupplier() {
    return this.rows
  }
  async listForReseller() {
    return this.rows
  }
  async totalsForReseller() {
    return { settled: pkr(0), awaiting: pkr(450) }
  }
  async summariseBySupplier() {
    return []
  }
  async listOverduePending() {
    return this.rows.filter((r) => r.status === 'PENDING')
  }
}

function build() {
  const repo = new FakePayouts()
  const sent: { to: string; template: string }[] = []

  const service = new PayoutService(
    repo,
    // Ledger sirf parhne wale safhon ke liye hai — in tests mein koi is tak nahi pohanchta
    {
      async bySupplierForReseller() {
        return []
      },
      async byResellerForSupplier() {
        return []
      },
      async platformFeeForSupplier() {
        return { earned: pkr(0), invoiced: pkr(0), collected: pkr(0) }
      },
    },
    { reseller: async () => '923001234567', supplier: async () => '923001200000' },
    {
      async sendTemplate(input: { to: string; template: string }) {
        sent.push({ to: input.to, template: input.template })
        return { providerMessageId: 'x' }
      },
      async sendText() {
        return { providerMessageId: 'x' }
      },
    },
    { now: () => NOW },
    { async track() {} },
    { info() {}, warn() {}, error() {} },
  )

  return { service, repo, sent }
}

describe('delivery par hisab khulta hai', () => {
  it('row banti hai jab reseller ka margin ho', async () => {
    const { service, repo } = build()
    await service.openForDeliveredOrder({
      orderId: 'o2',
      resellerId: 'r1',
      supplierId: 's1',
      amount: pkr(450),
    })
    expect(repo.created).toHaveLength(1)
  })

  /** Reseller ne apni lagat par bech diya — dene ko kuch hai hi nahi. */
  it('sifar margin par row nahi banti', async () => {
    const { service, repo } = build()
    await service.openForDeliveredOrder({
      orderId: 'o3',
      resellerId: 'r1',
      supplierId: 's1',
      amount: pkr(0),
    })
    expect(repo.created).toHaveLength(0)
  })
})

describe('wholesaler ka dawa', () => {
  it('reference ke baghair nahi chalta', async () => {
    const { service } = build()
    await expect(service.markSent('s1', 'p1', '12')).rejects.toThrow(/reference/i)
  })

  it('bhejne par reseller ko khabar jati hai', async () => {
    const { service, sent, repo } = build()
    await service.markSent('s1', 'p1', 'EP-99881')

    expect(repo.rows[0]!.status).toBe('SENT')
    expect(repo.rows[0]!.sentReference).toBe('EP-99881')
    expect(sent).toEqual([{ to: '923001234567', template: 'baji_payout_sent' }])
  })

  /** 🔴 Sab se ahem test: wholesaler ke kehne se hisab band NAHI hota. */
  it('"bhej diya" hisab band nahi karta — sirf SENT tak le jata hai', async () => {
    const { service, repo } = build()
    await service.markSent('s1', 'p1', 'EP-99881')
    expect(repo.rows[0]!.status).not.toBe('SETTLED')
  })

  it('doosri dukan ki row nahi chhoo sakta', async () => {
    const { service } = build()
    await expect(service.markSent('s2', 'p1', 'EP-99881')).rejects.toThrow(/not found|Payout/i)
  })

  it('band ho chuka hisab dobara nahi chherta', async () => {
    const { service, repo } = build()
    repo.rows = [makeRow({ status: 'SETTLED' })]
    await expect(service.markSent('s1', 'p1', 'EP-99881')).rejects.toThrow(/band/i)
  })
})

describe('reseller ki tasdeeq', () => {
  it('mil gaye — hisab band', async () => {
    const { service, repo } = build()
    repo.rows = [makeRow({ status: 'SENT', sentReference: 'EP-99881' })]

    await service.confirmReceived('r1', 'p1')
    expect(repo.rows[0]!.status).toBe('SETTLED')
    expect(repo.rows[0]!.confirmedAt).toEqual(NOW)
  })

  /**
   * 🔴 Ye test us bug se bana hai jo asli DB par pakra gaya: reseller ne "mil gaye"
   * dabaya, API ne SETTLED keh diya, magar DB mein row PENDING hi rahi — kyunke service
   * repository ka asli natija parhe baghair apna farz kiya hua jawab laut rahi thi.
   */
  it('jo halat DB mein nahi badli, us par SETTLED nahi kehti', async () => {
    const { service, repo } = build()
    repo.rows = [makeRow({ status: 'SETTLED' })]

    // SETTLED se aage koi halat nahi — service ko yahan jhoot nahi bolna chahiye
    const result = await service.confirmReceived('r1', 'p1')
    expect(result.status).toBe('SETTLED')
    expect(repo.rows[0]!.status).toBe('SETTLED')
  })

  /**
   * Bolton Market ka thok wala EasyPaisa kar ke portal kholta hi nahi. Us ka na dabana
   * is baat ka saboot nahi ke paisa nahi gaya — reseller ke haath mein aana hai.
   */
  it('wholesaler ke dawe ke baghair bhi tasdeeq ho sakti hai', async () => {
    const { service, repo } = build()
    expect(repo.rows[0]!.status).toBe('PENDING')

    await service.confirmReceived('r1', 'p1')
    expect(repo.rows[0]!.status).toBe('SETTLED')
  })

  it('doosri reseller ki row nahi chhoo sakti', async () => {
    const { service } = build()
    await expect(service.confirmReceived('r2', 'p1')).rejects.toThrow(/not found|Payout/i)
  })

  it('nahi mile — jhagra, magar wholesaler ka reference mitta nahi', async () => {
    const { service, repo } = build()
    repo.rows = [makeRow({ status: 'SENT', sentReference: 'EP-99881' })]

    await service.raiseDispute('r1', 'p1', 'Abhi tak kuch nahi aaya')

    expect(repo.rows[0]!.status).toBe('DISPUTED')
    expect(repo.rows[0]!.disputeNote).toBe('Abhi tak kuch nahi aaya')
    // Ops ko dono baatein chahiyen — is liye dawa apni jagah rehta hai
    expect(repo.rows[0]!.sentReference).toBe('EP-99881')
  })

  it('wajah likhe baghair jhagra nahi', async () => {
    const { service } = build()
    await expect(service.raiseDispute('r1', 'p1', ' ')).rejects.toThrow(/wajah/i)
  })

  /** Jhagre ke baad wholesaler dobara bhej sakta hai — raasta band nahi hota. */
  it('jhagre ke baad dobara bhejna mumkin hai', async () => {
    const { service, repo } = build()
    repo.rows = [makeRow({ status: 'DISPUTED' })]

    await service.markSent('s1', 'p1', 'EP-77220')
    expect(repo.rows[0]!.status).toBe('SENT')
  })
})

describe('der', () => {
  it(`${PAYOUT_OVERDUE_DAYS} din se purani khamosh row der ginti hai`, () => {
    const old = makeRow({ createdAt: new Date('2026-08-10T10:00:00Z') })
    expect(isOverdue(old, NOW)).toBe(true)
  })

  it('kal wali row der nahi hai', () => {
    expect(isOverdue(makeRow(), NOW)).toBe(false)
  })

  /** Jis par wholesaler keh chuka hai "bhej diya", us par taqaza nahi — ab bari reseller ki hai. */
  it('SENT row der nahi ginti', () => {
    const sent = makeRow({ status: 'SENT', createdAt: new Date('2026-08-01T10:00:00Z') })
    expect(isOverdue(sent, NOW)).toBe(false)
  })

  it('yaad-dihani wholesaler ko jati hai, reseller ko nahi', async () => {
    const { service, sent } = build()
    const count = await service.remindOverdue()

    expect(count).toBe(1)
    expect(sent).toEqual([{ to: '923001200000', template: 'baji_payout_reminder' }])
  })
})
