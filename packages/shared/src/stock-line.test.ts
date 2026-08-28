/**
 * 🔴 Zyada tar test ye poochhte hain ke line par kya NAHI aana chahiye.
 *
 * Wajah: ye line customer ke saamne jati hai, aur us par jhoot ka natija reseller
 * bhugatti hai. Khatam shuda size likhne ka matlab hai ke customer wohi maangti hai jo
 * mojood nahi, aur phir reseller ko mana karna parta hai — us ki apni sakh se.
 */
import { describe, expect, it } from 'vitest'
import { PACK_LOW_STOCK, stockLine } from './stock-line'

const v = (size: string | null, colour: string | null, stockQty: number) => ({
  size,
  colour,
  stockQty,
})

describe('maal ki line', () => {
  it('size aur rang saath likhe jate hain', () => {
    expect(stockLine([v('S', 'Red', 9), v('M', 'Blue', 9)], 'en')).toBe('S · M · Red · Blue')
  })

  it('🔴 jo size khatam ho chuka wo likha hi nahi jata', () => {
    const line = stockLine([v('S', null, 0), v('M', null, 9), v('L', null, 9)], 'en')
    expect(line).toBe('M · L')
    expect(line).not.toContain('S')
  })

  it('🔴 sab khatam ho to line hi nahi banti — khali dabba "toota hua" parha jata hai', () => {
    expect(stockLine([v('S', null, 0), v('M', null, 0)])).toBeNull()
  })

  it('koi variant hi na ho to bhi null', () => {
    expect(stockLine([])).toBeNull()
  })

  it('dohra naam ek hi dafa — teen SKU ek hi rang ke ho sakte hain', () => {
    expect(stockLine([v('S', 'Red', 9), v('M', 'Red', 9), v('L', 'Red', 9)], 'en')).toBe(
      'S · M · L · Red',
    )
  })

  it('chaar se ziyada rang par naam ki jagah ginti — warna line poora pack kha jati', () => {
    const many = ['Red', 'Blue', 'Green', 'Black', 'White'].map((c) => v(null, c, 9))
    expect(stockLine(many, 'en')).toBe('5 colours')
  })

  it('khali aur space wale naam gir jate hain', () => {
    expect(stockLine([v('  ', '', 9), v('L', 'Red', 9)], 'en')).toBe('L · Red')
  })
})

describe('jaldi ka ehsaas — magar sirf jab sach ho', () => {
  it(`hadd (${PACK_LOW_STOCK}) par ginti aati hai`, () => {
    expect(stockLine([v('M', null, PACK_LOW_STOCK)], 'en')).toContain(`Only ${PACK_LOW_STOCK} left`)
  })

  it('🔴 bohat maal ho to ginti NAHI — "47 bache hain" khabar nahi, shor hai', () => {
    expect(stockLine([v('M', null, 47)], 'en')).toBe('M')
  })

  it('ginti sab variants ki jama hoti hai, ek ki nahi', () => {
    // 2 + 2 = 4, jo hadd ke andar hai
    expect(stockLine([v('S', null, 2), v('M', null, 2)], 'en')).toContain('Only 4 left')
  })

  it('Urdu mein Urdu ke lafz', () => {
    expect(stockLine([v(null, null, 2)], 'ur')).toBe('صرف 2 باقی')
  })
})
