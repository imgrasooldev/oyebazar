/**
 * Wholesaler ka logo.
 *
 * Logo ho to wohi; na ho to naam ka pehla harf ek rangeen chokhte mein. Khali dabba ya
 * "no image" wali tasveer se ye behtar hai: directory mein aadhe se zyada dukanon ke
 * paas logo hota hi nahi, aur bina nishan ke saare card ek jaise lagte hain — nazar
 * kisi par thehrti hi nahi.
 *
 * 🔴 Rang naam se nikalta hai, random nahi — wohi dukan hamesha wohi rang. Random hota
 * to har refresh par card badalta aur user ko yaad hi na rehta ke kaun sa kaun sa hai.
 */

/** Chand narm rang — sab par safed harf parhne mein aata hai. */
const TONES = [
  'bg-brand-500',
  'bg-accent-500',
  'bg-coal-800',
  'bg-brand-700',
  'bg-accent-700',
  'bg-coal-700',
] as const

function toneFor(name: string): string {
  let total = 0
  for (let i = 0; i < name.length; i += 1) total = (total * 31 + name.charCodeAt(i)) >>> 0
  return TONES[total % TONES.length]!
}

/**
 * Pehla harf — Urdu naam par bhi kaam karta hai (jo bhi pehla harf ho, wohi).
 * Angrezi naam par do lafzon ke pehle harf, jaise "Sialkot Traders" → "ST".
 */
function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const isLatin = /^[\x20-\x7F]+$/.test(name)

  if (isLatin && words.length >= 2) {
    return `${words[0]![0]}${words[1]![0]}`.toUpperCase()
  }
  return (words[0]?.[0] ?? '?').toUpperCase()
}

export function SupplierLogo({
  name,
  logoUrl,
  size = 'md',
}: {
  name: string
  logoUrl?: string | null
  size?: 'sm' | 'md' | 'lg'
}) {
  const box = size === 'lg' ? 'h-14 w-14 text-xl' : size === 'sm' ? 'h-8 w-8 text-xs' : 'h-11 w-11'

  if (logoUrl) {
    return (
      <span className={`${box} shrink-0 overflow-hidden rounded-card bg-paper-sunken`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2 */}
        <img src={logoUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      </span>
    )
  }

  return (
    <span
      aria-hidden
      className={`${box} flex shrink-0 items-center justify-center rounded-card font-bold text-white ${toneFor(name)}`}
    >
      {monogram(name)}
    </span>
  )
}
