/**
 * "Kitna arsa pehle" — sirf ginti, alfaz nahi.
 *
 * Zaban se alag rakha hai jaan boojh kar: ye function batata hai "3 din", aur "پہلے /
 * pehle / ago" i18n lagati hai. Warna teen zubanon ka tarjuma is file mein ghus aata.
 *
 * Ginti hamesha neeche ki taraf (floor): 90 minute "1 ghanta" hai, "2 ghante" nahi —
 * "abhi abhi" jaisa dikhana jhoot hai, aur is directory mein taazgi hi bharosa hai.
 */
export type RelativeUnit = 'now' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

export interface RelativeTime {
  readonly unit: RelativeUnit
  readonly value: number
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
/** Auston mahina — 30 din. Directory par mahine ka theek hisaab kisi kaam ka nahi. */
const MONTH = 30 * DAY
const YEAR = 365 * DAY

export function relativeTime(from: Date | string, now: Date): RelativeTime {
  const then = typeof from === 'string' ? new Date(from) : from
  // Mustaqbil ka waqt (server/DB ka farq) — "abhi abhi" hi sab se kam ghalat jawab hai
  const ms = Math.max(0, now.getTime() - then.getTime())

  if (ms < MINUTE) return { unit: 'now', value: 0 }
  if (ms < HOUR) return { unit: 'minute', value: Math.floor(ms / MINUTE) }
  if (ms < DAY) return { unit: 'hour', value: Math.floor(ms / HOUR) }
  if (ms < WEEK) return { unit: 'day', value: Math.floor(ms / DAY) }
  if (ms < MONTH) return { unit: 'week', value: Math.floor(ms / WEEK) }
  if (ms < YEAR) return { unit: 'month', value: Math.floor(ms / MONTH) }
  return { unit: 'year', value: Math.floor(ms / YEAR) }
}

/** Naya maal = 7 din ke andar. Isi par Bazaar ka "naya" tamgha lagta hai. */
export function isFresh(from: Date | string, now: Date): boolean {
  const then = typeof from === 'string' ? new Date(from) : from
  return now.getTime() - then.getTime() < WEEK
}
