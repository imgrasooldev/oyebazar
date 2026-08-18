import { ConsoleMessagingProvider } from '@oyebazar/whatsapp'
import { container } from '../container'

/**
 * Dev par login ka code safhe par dikhane ke liye.
 *
 * 🔴 Do taale, aur dono zaroori hain:
 *   1. NODE_ENV production ho to hamesha undefined — chahe kuch bhi ho.
 *   2. Provider ConsoleMessagingProvider na ho to code mojood hi nahi hota — asli
 *      provider (Wati) kuch yaad nahi rakhta.
 *
 * Ek taala kaafi tha, magar dono is liye ke ye woh cheez hai jis ka production mein
 * leak hona kisi ka bhi account khulwa sakta hai. Ek shart bhoolne ki gunjaish nahi.
 */
export function devOtpFor(phoneE164: string): string | undefined {
  if (process.env.NODE_ENV === 'production') return undefined

  const messaging = container.messaging
  if (!(messaging instanceof ConsoleMessagingProvider)) return undefined

  return messaging.lastOtpFor(phoneE164)
}
