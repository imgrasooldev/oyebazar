/**
 * Mahine ka hisab — "YYYY-MM".
 *
 * 🔴 Sab kuch UTC par. Statement dono taraf ek jaisa hona chahiye, aur agar mahina
 * device ke local waqt se banta to Karachi ki shaam aur kisi doosre time zone ki subah
 * do alag mahine de sakti hai — yani do alag kaghaz.
 */
export function monthOrCurrent(value: string | undefined): string {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value

  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Pichhla mahina hamesha, agla sirf tab jab wo guzar chuka ho ya chal raha ho. */
export function monthNav(month: string): { prev: string; next: string | null } {
  const [year, index] = month.split('-').map(Number) as [number, number]

  const shift = (delta: number) => {
    const date = new Date(Date.UTC(year, index - 1 + delta, 1))
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
  }

  const current = monthOrCurrent(undefined)
  const next = shift(1)

  return { prev: shift(-1), next: next <= current ? next : null }
}
