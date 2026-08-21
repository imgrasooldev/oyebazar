import { LazyImage } from '@/components/lazy-image'

/**
 * Banday ka nishan — tasveer ho to tasveer, warna naam ka pehla harf.
 *
 * 🔴 Reseller ki koi tasveer hoti hi nahi (us ka koi photo field hai hi nahi), aur ye
 * jaan boojh kar hai: ye ghar baithi khawateen hain, aur un se chehre ki tasveer
 * maangna is kaam ka taqaza nahi — us ka status pack us ka NAAM aur NUMBER leta hai,
 * chehra nahi. Is liye yahan jhoota khali daira ya koi bana banaya chehra nahi lagta:
 * us ke apne naam ka harf lagta hai.
 *
 * Dukan ka logo mojood hota hai (logoUrl), to wahan asli logo aata hai.
 *
 * Rang naam se banta hai, kisi qatar se nahi: ek hi banda har safhe par usi rang mein
 * dikhta hai, aur wo rang us ki pehchan ban jata hai.
 */
const TONES = [
  'bg-brand-50 text-brand-800',
  'bg-accent-50 text-accent-700',
  'bg-coal-900/[0.07] text-coal-900',
  'bg-red-50 text-red-700',
] as const

function toneFor(name: string): string {
  let sum = 0
  for (const char of name) sum += char.codePointAt(0) ?? 0
  return TONES[sum % TONES.length] ?? TONES[0]
}

/** Pehla harf — Urdu, angrezi, dono chalte hain. */
function initial(name: string): string {
  return [...name.trim()][0] ?? '؟'
}

export function Avatar({
  name,
  imageUrl,
  size = 'md',
  className = '',
}: {
  name: string
  imageUrl?: string | null
  size?: 'sm' | 'md'
  className?: string
}) {
  const box = size === 'sm' ? 'h-8 w-8 text-[0.8rem]' : 'h-10 w-10 text-[0.95rem]'

  if (imageUrl) {
    return (
      <LazyImage
        src={imageUrl}
        alt={name}
        wrapperClassName={`${box} shrink-0 overflow-hidden rounded-pill bg-paper-sunken ${className}`}
        className="h-full w-full object-cover"
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${box} ${toneFor(name)} flex shrink-0 items-center justify-center rounded-pill font-bold ${className}`}
    >
      {initial(name)}
    </span>
  )
}
