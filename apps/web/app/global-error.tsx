'use client'

import { useEffect } from 'react'
import './globals.css'

/**
 * Aakhri jaal: root layout khud ta toot jaye to yahi chalta hai — is liye `<html>`/`<body>`
 * aur CSS khud lagane parte hain, layout ka kuch nahi milta.
 *
 * Zaban yahan cookie se nahi parhi ja sakti (layout hi nahi chala), is liye Urdu —
 * jo app ki default zaban hai — aur neeche angrezi ek line. Crash ke waqt sahi
 * zaban dhoondne se behtar hai ke paighaam har haal mein parha jaye.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('global_error', (error as Error & { digest?: string }).digest ?? error.message)
  }, [error])

  return (
    <html lang="ur" dir="rtl">
      <body className="font-urdu">
        <main className="flex min-h-screen items-center justify-center bg-paper px-5">
          <div className="card w-full max-w-md p-8 text-center">
            <h1 className="text-[1.25rem] font-bold tracking-tight">کچھ گڑبڑ ہو گئی</h1>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
              ہمارے سرور میں مسئلہ ہے، آپ کی غلطی نہیں۔ دوبارہ کوشش کریں۔
            </p>
            <p dir="ltr" className="mt-1 font-sans text-[0.85rem] text-ink-faint">
              Something went wrong on our side. Please try again.
            </p>
            <button type="button" onClick={reset} className="btn-primary mt-7">
              دوبارہ کوشش کریں
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
