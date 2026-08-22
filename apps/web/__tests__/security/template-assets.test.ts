/**
 * 🔴 TEMPLATE ASSET TEST — CI blocking.
 *
 * Reseller apne template par logo laga sakti hai. Wo tasveer hamara RENDER WORKER khud
 * ja kar laata hai (inline karne ke liye). Yani agar spec mein bahar ka koi bhi pata
 * mehfooz ho gaya to:
 *
 *  · Hamara server us pate par request bhejta hai — koi bhi hamare server se apni
 *    marzi ke pate par call karwa sakta hai, andar wale network samet.
 *  · Wo tasveer kal badal sakti hai. Aaj logo, kal kuch aur — aur wo har us pack par
 *    chhap jayega jo us waqt bana. Hum ne to sirf ek link mehfooz kiya tha.
 *
 * Jaanch DONO raston par honi chahiye (banane aur badalne), aur ye test us baat ko bhi
 * dekhta hai — kyunke ek jagah bhool jana bilkul utna hi bura hai jitna koi jaanch na hona.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_TEMPLATE_SPEC, ValidationError } from '@oyebazar/shared'
import { assertOwnAssets } from '../../lib/api/template-assets'

const REPO_ROOT = join(__dirname, '..', '..', '..', '..')
const OURS = 'https://cdn.oyebazar.com/media/'

function specWithLogo(url: string) {
  return {
    ...DEFAULT_TEMPLATE_SPEC,
    layers: [{ kind: 'image' as const, url, show: true, x: 5, y: 5, width: 18 }],
  }
}

describe('🔴 template ka logo sirf hamari apni storage se', () => {
  it('hamara apna pata chalta hai', () => {
    expect(() => assertOwnAssets(specWithLogo(`${OURS}abc.png`), OURS)).not.toThrow()
  })

  it('bahar ka pata rad hota hai', () => {
    expect(() => assertOwnAssets(specWithLogo('https://evil.example/x.png'), OURS)).toThrow(
      ValidationError,
    )
  })

  it('shuruaat mein hamara naam daal dene se bhi nahi chalta', () => {
    // `https://evil.example/https://cdn.oyebazar.com/...` jaisi koshish
    expect(() =>
      assertOwnAssets(specWithLogo(`https://evil.example/${OURS}x.png`), OURS),
    ).toThrow(ValidationError)
  })

  it('base khali ho to kuch bhi qubool na ho — fail closed', () => {
    // Storage ka base URL na mile (config ki ghalti) to sab kuch rad, sab kuch qubool nahi
    expect(() => assertOwnAssets(specWithLogo(`${OURS}abc.png`), '')).toThrow(ValidationError)
  })

  it('text wale layer par koi jaanch nahi — wahan koi pata hai hi nahi', () => {
    const spec = {
      ...DEFAULT_TEMPLATE_SPEC,
      layers: [{ kind: 'text' as const, text: 'مفت ڈیلیوری', show: true, x: 5, y: 5, size: 40 }],
    }
    expect(() => assertOwnAssets(spec, OURS)).not.toThrow()
  })

  it('DONO raste jaanch lagate hain — banana aur badalna', () => {
    const routes = [
      join(REPO_ROOT, 'apps', 'web', 'app', 'api', 'v1', 'templates', 'route.ts'),
      join(REPO_ROOT, 'apps', 'web', 'app', 'api', 'v1', 'templates', '[id]', 'route.ts'),
    ]

    for (const path of routes) {
      const source = readFileSync(path, 'utf8')
      expect(source, `${path} spec mehfooz karta hai magar assertOwnAssets nahi chalata`).toContain(
        'assertOwnAssets(',
      )
    }
  })

  it('koi aur raasta chup chaap spec mehfooz na kar de', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((entry) => {
        const path = join(dir, entry)
        return statSync(path).isDirectory() ? walk(path) : path.endsWith('.ts') ? [path] : []
      })

    for (const path of walk(join(REPO_ROOT, 'apps', 'web', 'app', 'api'))) {
      const source = readFileSync(path, 'utf8')
      // Jo bhi route TemplateSpec ko parse kar ke mehfooz karta hai, usay jaanch bhi karni hai
      if (!source.includes('TemplateSpecSchema')) continue
      expect(source, `${path} TemplateSpec leta hai magar assertOwnAssets nahi chalata`).toContain(
        'assertOwnAssets',
      )
    }
  })
})
