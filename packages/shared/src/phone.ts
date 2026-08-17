/**
 * Phone helpers. Storage hamesha E.164-without-plus (923001234567) mein hoti hai —
 * WhatsApp API bhi yehi format leta hai.
 */

export function maskPhone(e164: string): string {
  if (e164.length < 6) return '****'
  return `${e164.slice(0, 4)}****${e164.slice(-3)}`
}

/** Payout account / bank number — kabhi poora na dikhayen (shared phone). */
export function maskAccount(account: string | null): string | null {
  if (!account) return null
  const tail = account.slice(-4)
  return `****${tail}`
}

/** 923001234567 → 0300 1234567 (UI ke liye) */
export function formatPhoneLocal(e164: string): string {
  if (!e164.startsWith('92') || e164.length !== 12) return e164
  const local = `0${e164.slice(2)}`
  return `${local.slice(0, 4)} ${local.slice(4)}`
}

/** wa.me link — Bazaar par supplier ka public number isi se khulta hai */
export function whatsappLink(e164: string, text?: string): string {
  const base = `https://wa.me/${e164}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}
