/**
 * 🔴 File ki asli qism — us ke pehle chand bytes se, browser ke bataye hue naam se NAHI.
 *
 * Wajah amli hai: `Content-Type` aur file ka naam dono client bhejta hai, aur dono jhoot
 * ho sakte hain. Dev mein upload `apps/web/public/_dev-media` mein girti hai jahan se
 * Next.js usay HAMARE apne origin se serve karta hai — wahan ek "image/jpeg" jo asal mein
 * HTML hai, us safhe par script chala kar reseller ki session cookie tak pohanch sakti thi.
 *
 * Is liye qism file ke andar ke signature se tay hoti hai, aur extension bhi hum wahin se
 * lagate hain. Client jo kehta hai wo sirf ek mashwara hai.
 */
import { isSupportedMime, type MediaMimeType } from '@oyebazar/shared'

function startsWith(buffer: Buffer, bytes: readonly number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false
  return bytes.every((byte, index) => buffer[offset + index] === byte)
}

function ascii(buffer: Buffer, start: number, end: number): string {
  return buffer.length < end ? '' : buffer.subarray(start, end).toString('latin1')
}

/**
 * ISO base-media (MP4 / MOV) ka brand — `....ftyp<brand>`.
 *
 * QuickTime aur MP4 ka container ek hi hai; farq sirf brand ka hai. iPhone `qt  ` deta
 * hai, Android `isom`/`mp42`. Dono chalte hain, is liye dono ki pehchan yahan hai.
 */
const MP4_BRANDS = ['isom', 'iso2', 'iso4', 'mp41', 'mp42', 'avc1', 'M4V ', 'dash']
const QUICKTIME_BRANDS = ['qt  ']

/** File ki asli MIME, ya `null` agar hum is qism ko qubool nahi karte. */
export function sniffMimeType(buffer: Buffer): MediaMimeType | null {
  // JPEG — FF D8 FF
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'image/jpeg'

  // PNG — 89 "PNG" CR LF SUB LF
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'

  // WEBP — "RIFF" ....  "WEBP"
  if (ascii(buffer, 0, 4) === 'RIFF' && ascii(buffer, 8, 12) === 'WEBP') return 'image/webp'

  // Matroska / WebM — 1A 45 DF A3
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm'

  // ISO base media — bytes 4..8 par "ftyp", brand 8..12 par
  if (ascii(buffer, 4, 8) === 'ftyp') {
    const brand = ascii(buffer, 8, 12)
    if (QUICKTIME_BRANDS.includes(brand)) return 'video/quicktime'
    if (MP4_BRANDS.includes(brand)) return 'video/mp4'
    // Naya brand jo list mein nahi — MP4 hi hai, magar chup chaap qubool nahi karte
    return null
  }

  return null
}

/**
 * Sniff kar ke qism batata hai, aur client ke dawe se milata bhi hai.
 *
 * Farq nikalne par sniff jeetta hai — magar sirf tab jab sniff bhi hamari list mein ho.
 * Yani "mujhe ye samajh nahi aayi" ka jawab hamesha inkaar hai, andaza nahi.
 */
export function resolveMimeType(
  buffer: Buffer,
  declared: string | undefined,
): { ok: true; mime: MediaMimeType } | { ok: false; reason: 'unsupported' | 'mismatch' } {
  const sniffed = sniffMimeType(buffer)
  if (!sniffed) return { ok: false, reason: 'unsupported' }

  // Dawa sahih shakl ka hai magar file kuch aur nikli — ye ghalti nahi, dhoka hai
  if (declared && isSupportedMime(declared) && declared !== sniffed) {
    // MOV/MP4 ka container ek hi hai; browser inhen aapas mein badal deta hai
    const interchangeable =
      (declared === 'video/mp4' && sniffed === 'video/quicktime') ||
      (declared === 'video/quicktime' && sniffed === 'video/mp4')
    if (!interchangeable) return { ok: false, reason: 'mismatch' }
  }

  return { ok: true, mime: sniffed }
}
