/**
 * 🔴 DEV-OTP TEST — CI blocking.
 *
 * Login ka code dev par safhe par dikhta hai taake har test par terminal na kholna pare.
 * Ye suhoolat production mein pohanch jaye to koi bhi sirf number daal kar kisi ka bhi
 * account khol lega — reseller ka bhi, wholesaler ka bhi. Baji ka poora bharosa isi ek
 * cheez par khara hai.
 *
 * Do taale hain aur dono yahan jaanche jate hain:
 *   1. NODE_ENV production ho to `devOtpFor` foran undefined deta hai
 *   2. Sirf ConsoleMessagingProvider code yaad rakhta hai — asli provider (Wati) mein
 *      aisa koi method hai hi nahi, is liye production mein code kahin se aata hi nahi
 *
 * Teesra: koi service ya route OTP ko response mein seedha na daal de.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { ConsoleMessagingProvider, WatiMessagingProvider } from '@oyebazar/whatsapp'

const REPO_ROOT = join(__dirname, '..', '..', '..', '..')

const silentLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

function walk(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '.next-local') continue
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...walk(path))
    else if (path.endsWith('.ts') || path.endsWith('.tsx')) out.push(path)
  }
  return out
}

describe('🔴 dev OTP production mein na nikle', () => {
  /*
   * 20 second ki chhoot jaan boojh kar: ye test `lib/api/dev-otp` ko naye sire se import
   * karta hai, jo poora container (Prisma samet) le kar aata hai — akela 1.8s leta hai.
   * Poore suite mein sab packages ek saath chalte hain aur ye default 5s ki hadd se
   * nikal jata tha. Ek hifazat ka test waqt ki tangi se girna nahi chahiye: aisa test
   * kabhi kabhi laal ho to log usay "flaky" keh kar dekhna chhor dete hain.
   */
  it('taala 1: NODE_ENV=production par code kabhi nahi milta', { timeout: 20_000 }, async () => {
    vi.stubEnv('NODE_ENV', 'production')
    // Module cache saaf, warna purana NODE_ENV le kar bana hua module milta hai
    vi.resetModules()

    try {
      const { devOtpFor } = await import('../../lib/api/dev-otp')
      expect(devOtpFor('923001234567')).toBeUndefined()
    } finally {
      vi.unstubAllEnvs()
      vi.resetModules()
    }
  })

  it('taala 2: asli provider (Wati) code yaad rakhta hi nahi', () => {
    const wati = new WatiMessagingProvider({ apiUrl: 'https://x', apiKey: 'k' }, silentLogger)

    // Ye method sirf dev wale provider par hona chahiye
    expect('lastOtpFor' in wati).toBe(false)
    expect('lastOtpFor' in new ConsoleMessagingProvider(silentLogger)).toBe(true)
  })

  it('dev provider code yaad rakhta hai — tab hi safha dikha sakta hai', async () => {
    const dev = new ConsoleMessagingProvider(silentLogger)
    await dev.sendTemplate({
      to: '923001234567',
      template: 'baji_login_otp',
      params: { code: '123456', minutes: '5' },
    })

    expect(dev.lastOtpFor('923001234567')).toBe('123456')
    expect(dev.lastOtpFor('923009999999')).toBeUndefined()
  })

  it('koi route OTP ko seedha response mein na daale — sirf devOtpFor ke zariye', () => {
    const routes = walk(join(REPO_ROOT, 'apps', 'web', 'app', 'api'))

    for (const path of routes) {
      const source = readFileSync(path, 'utf8')
      if (!source.includes('devCode')) continue

      // devCode wahi route bhej sakta hai jo dev-otp helper istemal karta hai
      expect(source, `${path} devCode bhejta hai magar devOtpFor use nahi karta`).toContain(
        'devOtpFor',
      )
    }
  })
})
