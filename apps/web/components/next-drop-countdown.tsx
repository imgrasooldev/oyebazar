'use client'

import { useEffect, useState } from 'react'
import { SparkIcon } from '@/components/icons'
import { translator, type Locale } from '@/lib/i18n'

/**
 * Agle "آج کا پیک" tak ka waqt.
 *
 * 🔴 Ye banawati "flash sale" countdown NAHI hai. Hamara broadcast waqai roz
 * 09:00 PKT par jata hai (apps/worker ka `daily-broadcast` job), is liye ye ghadi
 * ek asli waqia gin rahi hai. Jhooti ghadi pehli subah pakri jati hai.
 *
 * Server par render hote waqt waqt nahi dikhate (hydration mismatch se bachne ke liye) —
 * pehle paint par sirf jumla, phir ghadi.
 */
const BROADCAST_HOUR_PKT = 9
const PKT_OFFSET_MINUTES = 5 * 60

function msUntilNextDrop(now: Date): number {
  // PKT mein abhi kya waqt hai
  const pktNow = new Date(now.getTime() + (PKT_OFFSET_MINUTES + now.getTimezoneOffset()) * 60_000)
  const next = new Date(pktNow)
  next.setHours(BROADCAST_HOUR_PKT, 0, 0, 0)
  if (next <= pktNow) next.setDate(next.getDate() + 1)
  return next.getTime() - pktNow.getTime()
}

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  }
}

export function NextDropCountdown({ locale }: { locale: Locale }) {
  const t = translator(locale)
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setLeft(msUntilNextDrop(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const { h, m, s } = parts(left ?? 0)

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-coal-900 px-6 py-5 text-white shadow-lift">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-brand-500/20 text-brand-300">
          <SparkIcon />
        </span>
        <div>
          <p className="font-bold">{t('nextDropTitle')}</p>
          <p className="text-[0.85rem] text-white/60">{t('nextDropBody')}</p>
        </div>
      </div>

      {left === null ? (
        <span className="text-sm text-white/50">…</span>
      ) : (
        <div className="flex items-center gap-2" dir="ltr">
          {[
            { value: h, label: t('hoursShort') },
            { value: m, label: t('minutesShort') },
            { value: s, label: t('secondsShort') },
          ].map((unit) => (
            <div key={unit.label} className="rounded-xl bg-white/10 px-3 py-2 text-center">
              <span className="numeric block text-xl font-bold leading-none">
                {String(unit.value).padStart(2, '0')}
              </span>
              <span className="mt-1 block text-[0.72rem] uppercase tracking-wider text-white/60">
                {unit.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
