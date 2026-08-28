/**
 * 🔴 Mita hua template pack ko maar nahi sakta.
 *
 * Reseller apna default template mita de to profile par us ka key reh sakta hai (UI ab
 * usay hatata hai, magar purane profile par wo pehle se para ho sakta hai). Us soorat
 * mein render ko aam design par girna chahiye — phenkna nahi, warna us reseller ke raat
 * ke saare pack banna band ho jate hain aur subah bhejne ko kuch nahi hota.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATE_SPEC } from '@oyebazar/shared'
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
    /*
     * 🔴 Spec haath se NAHI banaya — default par ek rang badal diya.
     *
     * Pehle yahan poora spec likha hua tha, aur har naya element (jaise `stock`) is test
     * ko torh deta tha — halanke test ka is se koi taalluq hi nahi. Ye test sirf ek baat
     * poochhta hai: "mojood template par us ka apna rang chalta hai ya nahi?"
     */
    setCustomTemplateLoader(async () => ({
      ...DEFAULT_TEMPLATE_SPEC,
      accent: '#123456',
    }))

    const html = await buildStatusPackHtml('custom:mojood-hai@1', data)
    expect(html).toContain('#123456')
  })
})
