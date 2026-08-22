/**
 * 🔴 Purane spec ka CSS haraf ba haraf wohi rehna chahiye.
 *
 * Naye ikhtiyari khaane (colour/opacity/rotate/font/pill) us spec par ek lafz bhi
 * ziyada na likhen jis mein wo hain hi nahi. Agar likhen, to har wo template jo pehle
 * se bana hua hai us ka CSS badal jayega — aur us ke saath har wo pack jo cache mein
 * para hai, bina kisi ke kuch badle.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATE_SPEC, templateSpecToCss } from './template-spec'

describe('🔴 purane template ka CSS na badle', () => {
  it('bina ikhtiyari khaanon wale spec par koi nayi line nahi', () => {
    const css = templateSpecToCss(DEFAULT_TEMPLATE_SPEC)

    for (const property of ['opacity:', 'transform: rotate', 'font-family:', 'color: #']) {
      expect(css, `"${property}" purane spec ke CSS mein nahi hona chahiye`).not.toContain(property)
    }
  })

  it('khana dene par hi wo CSS mein aata hai', () => {
    const css = templateSpecToCss({
      ...DEFAULT_TEMPLATE_SPEC,
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        title: { ...DEFAULT_TEMPLATE_SPEC.elements.title, opacity: 50, font: 'naskh', rotate: -5 },
      },
    })

    expect(css).toContain('opacity: 0.5')
    expect(css).toContain("font-family: 'Noto Naskh Arabic', serif")
    expect(css).toContain('transform: rotate(-5deg)')
  })

  it('rotate 0 line nahi likhta — 0 aur "diya hi nahi" ka nateeja ek hai', () => {
    const css = templateSpecToCss({
      ...DEFAULT_TEMPLATE_SPEC,
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        title: { ...DEFAULT_TEMPLATE_SPEC.elements.title, rotate: 0 },
      },
    })
    expect(css).not.toContain('transform: rotate')
  })
})
