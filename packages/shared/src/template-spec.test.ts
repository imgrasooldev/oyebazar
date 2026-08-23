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

/**
 * 🔴 `pillColour` bhi usi usool par — na ho to CSS haraf ba haraf wohi.
 *
 * Ye khana `PILL_ON` ko ek tay-shuda string se function bana kar aaya. Aisi tabdeeli
 * khamoshi se cache tor sakti hai: agar `background:` ki line ka ek haraf bhi badle to
 * har bana hua pack dobara render hoga — bina kisi reseller ke kuch badle.
 */
describe('🔴 peechay ka rang', () => {
  const withPill = (extra: Record<string, unknown>) =>
    templateSpecToCss({
      ...DEFAULT_TEMPLATE_SPEC,
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        badge: { ...DEFAULT_TEMPLATE_SPEC.elements.badge, pill: true, ...extra },
      },
    })

  it('rang na diya jaye to wohi purana var(--accent)', () => {
    expect(withPill({})).toContain('background: var(--accent);')
  })

  it('rang dene par wohi rang lagta hai', () => {
    const css = withPill({ pillColour: '#123456' })
    expect(css).toContain('background: #123456;')
    expect(css).not.toContain('background: var(--accent);')
  })

  it('dabba band ho to rang CSS mein aata hi nahi', () => {
    const css = templateSpecToCss({
      ...DEFAULT_TEMPLATE_SPEC,
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        badge: { ...DEFAULT_TEMPLATE_SPEC.elements.badge, pill: false, pillColour: '#123456' },
      },
    })
    expect(css).not.toContain('#123456')
  })
})

/**
 * 🔴 Reseller ka chuna hua rang pill se HAAR nahi sakta.
 *
 * `pillOn` apne saath `color: var(--badge-text)` laata hai. Wo rang se PEHLE likha jaye
 * to CSS mein baad wali line jeet jati hai aur chunao zaya ho jata hai. Live par chala
 * kar yehi pakra: qeemat par peela chuna, likhai safed hi rahi.
 */
describe('🔴 rang aur pill ek saath', () => {
  const cssFor = (extra: Record<string, unknown>) =>
    templateSpecToCss({
      ...DEFAULT_TEMPLATE_SPEC,
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        badge: { ...DEFAULT_TEMPLATE_SPEC.elements.badge, ...extra },
      },
    })

  it('pill ke saath chuna hua rang pill ke BAAD likha jata hai', () => {
    const css = cssFor({ pill: true, colour: '#facc15' })
    expect(css.indexOf('color: #facc15;')).toBeGreaterThan(css.indexOf('color: var(--badge-text);'))
  })

  it('bina pill ke rang apni purani jagah par hi rehta hai', () => {
    const css = cssFor({ colour: '#facc15' })
    expect(css).toContain('color: #facc15;')
    expect(css).not.toContain('var(--badge-text)')
  })

  it('apni layer par bhi wohi usool', () => {
    const css = templateSpecToCss({
      ...DEFAULT_TEMPLATE_SPEC,
      layers: [
        { kind: 'text', text: 'مفت ڈیلیوری', show: true, x: 8, y: 40, size: 40, pill: true, colour: '#facc15' },
      ],
    })
    expect(css.indexOf('color: #facc15;')).toBeGreaterThan(css.indexOf('color: var(--badge-text);'))
  })

  it('bina rang wali layer ka CSS haraf ba haraf wohi rehta hai', () => {
    const css = templateSpecToCss({
      ...DEFAULT_TEMPLATE_SPEC,
      layers: [{ kind: 'text', text: 'مفت ڈیلیوری', show: true, x: 8, y: 40, size: 40 }],
    })
    expect(css).toContain('color: #ffffff;')
  })
})
