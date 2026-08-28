/**
 * 🔴 Zyada tar test ye poochhte hain ke nishan KYUN NAHI laga.
 *
 * Laal nishan dukan ko order mana karne ki taraf le jata hai — aur mana kiya hua order
 * reseller ka nuqsan hai, jo us ne kiya hi kuch nahi hota. Is liye "nishan na lagana"
 * wala rasta utni hi ehtiyat maangta hai jitna nishan lagana.
 */
import { describe, expect, it } from 'vitest'
import { assessRtoRisk, HIGH_AT, MIN_AREA_SAMPLE, type OrderRiskInput } from './rto-risk'

/** Bilkul aam order — koi wajah nahi, koi nishan nahi. */
const plain: OrderRiskInput = {
  deliveryFee: 200,
  total: 2_000,
  hasLocationPin: true,
  customer: { delivered: 0, rto: 0 },
  area: { delivered: 0, rto: 0 },
  reseller: { delivered: 0, rto: 0 },
  supplierMedianOrder: 2_000,
}

const withInput = (patch: Partial<OrderRiskInput>): OrderRiskInput => ({ ...plain, ...patch })

describe('wapsi ka andaza — order qubool karne se pehle', () => {
  it('🔴 aam order par kuch nahi dikhta — warna nishan bemani ho jata hai', () => {
    const risk = assessRtoRisk(plain)
    expect(risk.band).toBe('quiet')
    expect(risk.reasons).toHaveLength(0)
  })

  it('🔴 naye ilaqe par nishan nahi — do orders koi chalan nahi bante', () => {
    const risk = assessRtoRisk(withInput({ area: { delivered: 0, rto: 2 } }))
    expect(risk.reasons.some((reason) => reason.code === 'areaReturns')).toBe(false)
  })

  it('ilaqe ka chalan poore namoone par ginta hai', () => {
    const rto = 4
    const delivered = MIN_AREA_SAMPLE - rto
    const risk = assessRtoRisk(withInput({ area: { delivered, rto } }))
    const reason = risk.reasons.find((row) => row.code === 'areaReturns')
    expect(reason?.value).toBe(50)
  })

  it('🔴 naye reseller par nishan nahi — do orders se chalan nahi banta', () => {
    const risk = assessRtoRisk(withInput({ reseller: { delivered: 0, rto: 2 } }))
    expect(risk.reasons.some((reason) => reason.code === 'resellerReturns')).toBe(false)
  })

  it('jis customer ne pehle bhi wapas kiya aur kabhi liya nahi — sab se bhaari', () => {
    const risk = assessRtoRisk(withInput({ customer: { delivered: 0, rto: 1 } }))
    expect(risk.band).toBe('high')
    expect(risk.reasons[0]?.code).toBe('customerReturned')
  })

  it('wapas kiya magar liya bhi hai — nishan halka hai', () => {
    const risk = assessRtoRisk(withInput({ customer: { delivered: 3, rto: 1 } }))
    expect(risk.points).toBeLessThan(HIGH_AT)
    expect(risk.reasons[0]?.code).toBe('customerReturned')
  })

  it('🔴 pehle maal le chuke customer par ACHHI khabar bhi dikhti hai', () => {
    const risk = assessRtoRisk(withInput({ customer: { delivered: 2, rto: 0 } }))
    expect(risk.band).toBe('known')
    expect(risk.points).toBeLessThan(0)
  })

  it('🔴 aazmaya hua customer doosre isharon ko dabata hai — banda wohi hai', () => {
    const risky = withInput({
      hasLocationPin: false,
      area: { delivered: 4, rto: 4 },
      reseller: { delivered: 2, rto: 2 },
    })

    expect(assessRtoRisk(risky).band).toBe('high')
    expect(assessRtoRisk({ ...risky, customer: { delivered: 3, rto: 0 } }).band).toBe('watch')
  })

  it('pin na hone par nishan lagta hai — aur yahi wahid qabil-e-ilaj wajah hai', () => {
    const risk = assessRtoRisk(withInput({ hasLocationPin: false }))
    expect(risk.reasons.map((reason) => reason.code)).toContain('noPin')
  })

  it('bara order dukan ke APNE darmiyane se napa jata hai', () => {
    const jeweller = assessRtoRisk(withInput({ total: 6_000, supplierMedianOrder: 5_000 }))
    const kiryana = assessRtoRisk(withInput({ total: 6_000, supplierMedianOrder: 800 }))

    expect(jeweller.reasons.some((reason) => reason.code === 'bigOrder')).toBe(false)
    expect(kiryana.reasons.some((reason) => reason.code === 'bigOrder')).toBe(true)
  })

  it('🔴 pehli dukan par darmiyana sifar hota hai — us par "bara order" nahi ginte', () => {
    const risk = assessRtoRisk(withInput({ total: 90_000, supplierMedianOrder: 0 }))
    expect(risk.reasons.some((reason) => reason.code === 'bigOrder')).toBe(false)
  })

  it('wajah bhaari se halki tarteeb mein aati hai — pehli satar sab se ahem', () => {
    const risk = assessRtoRisk(
      withInput({ hasLocationPin: false, customer: { delivered: 0, rto: 2 } }),
    )
    const points = risk.reasons.map((reason) => reason.points)
    expect([...points].sort((a, b) => b - a)).toEqual(points)
  })

  it('nuqsan sirf wo jo likha hua hai — dukan ka apna delivery rate', () => {
    expect(assessRtoRisk(withInput({ deliveryFee: 350 })).costIfReturned).toBe(350)
  })
})
