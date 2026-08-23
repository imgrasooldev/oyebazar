/**
 * 🔴 Mita hua template pack ko maar nahi sakta.
 *
 * Reseller apna default template mita de to profile par us ka key reh sakta hai (UI ab
 * usay hatata hai, magar purane profile par wo pehle se para ho sakta hai). Us soorat
 * mein render ko aam design par girna chahiye — phenkna nahi, warna us reseller ke raat
 * ke saare pack banna band ho jate hain aur subah bhejne ko kuch nahi hota.
 */
import { describe, expect, it } from 'vitest'
import { pkr } from '@oyebazar/shared'
import { buildStatusPackHtml, setCustomTemplateLoader } from './template'

const data = {
  titleUr: 'لان کا جوڑا',
  categoryNameUr: 'لان',
  price: pkr(2850),
  resellerName: 'صادیہ بی بی',
  resellerPhone: '923412098891',
  photoUrl: null,
}

describe('🔴 gum shuda apna template', () => {
  it('phenkta nahi — aam design par girta hai', async () => {
    setCustomTemplateLoader(async () => null)

    const html = await buildStatusPackHtml('custom:mit-chuka-hai@7', data)

    expect(html).toContain('لان کا جوڑا')
    expect(html).toContain('--accent')
  })

  it('mojood template par wohi apna design chalta hai', async () => {
    setCustomTemplateLoader(async () => ({
      version: 1 as const,
      accent: '#123456',
      accentText: '#ffffff',
      card: 'none' as const,
      scrim: 50,
      frame: 0,
      radius: 0,
      badgeText: 'نیا',
      elements: {
        badge: { show: true, x: 4, y: 9, size: 44 },
        title: { show: true, x: 4, y: 62, size: 64 },
        price: { show: true, x: 4, y: 75, size: 78 },
        name: { show: true, x: 4, y: 85, size: 46 },
        phone: { show: true, x: 55, y: 85, size: 46 },
        cta: { show: true, x: 4, y: 91, size: 40 },
        note: { show: true, x: 4, y: 53, size: 40, pill: true },
      },
    }))

    const html = await buildStatusPackHtml('custom:mojood-hai@1', data)
    expect(html).toContain('#123456')
  })
})
