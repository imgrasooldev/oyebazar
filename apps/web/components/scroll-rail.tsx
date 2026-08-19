'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Bagal mein sarakne wali qatar — categories jaisi lambi patti ke liye.
 *
 * 🔴 Pehle sirf `overflow-x-auto` tha. Phone par ungli se sarakna chalta tha, magar
 * laptop par koi ishara hi nahi tha ke aur categories bhi hain — patti daen kinare par
 * kati hui nazar aati thi aur bas. Aksar log samajhte hain ke itni hi hain.
 *
 * Ab: kinare par narm dhundlaka (aur cheezein hain), aur teer wale button (mouse wale
 * ke liye). Ungli se sarakna waise hi chalta hai — wo browser ka apna kaam hai, hum us
 * ke beech mein nahi aate.
 */
export function ScrollRail({
  children,
  labels,
}: {
  children: React.ReactNode
  labels: { prev: string; next: string }
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [atStart, setAtStart] = useState(true)
  const [atEnd, setAtEnd] = useState(false)

  function measure() {
    const node = ref.current
    if (!node) return

    /*
     * RTL par `scrollLeft` manfi hota hai (Urdu safha) — is liye us ki qadar par nahi,
     * us ke faasle par chalte hain. Warna Urdu mein teer ulte kaam karte the.
     */
    const distance = Math.abs(node.scrollLeft)
    const max = node.scrollWidth - node.clientWidth

    setAtStart(distance < 8)
    setAtEnd(distance > max - 8)
  }

  useEffect(() => {
    measure()
    const node = ref.current
    if (!node) return

    // Category ki tadaad badle to kinare bhi dobara napne chahiyen
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  function nudge(direction: 1 | -1) {
    const node = ref.current
    if (!node) return

    const rtl = getComputedStyle(node).direction === 'rtl'
    node.scrollBy({ left: direction * (rtl ? -1 : 1) * (node.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <div ref={ref} onScroll={measure} className="rail scroll-smooth">
        {children}
      </div>

      {/* Dhundlaka — sirf us taraf jahan waqai aur cheezein hain */}
      {!atStart && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 w-10 bg-gradient-to-r from-paper to-transparent rtl:bg-gradient-to-l"
        />
      )}
      {!atEnd && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-0 w-10 bg-gradient-to-l from-paper to-transparent rtl:bg-gradient-to-r"
        />
      )}

      {/* Teer sirf bari screen par — phone par ungli hi kaafi hai, aur wahan jagah bhi nahi */}
      {!atStart && (
        <button
          type="button"
          aria-label={labels.prev}
          onClick={() => nudge(-1)}
          className="absolute -start-1 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-paper-raised text-ink-soft shadow-soft transition hover:text-ink lg:flex"
        >
          ‹
        </button>
      )}
      {!atEnd && (
        <button
          type="button"
          aria-label={labels.next}
          onClick={() => nudge(1)}
          className="absolute -end-1 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-paper-raised text-ink-soft shadow-soft transition hover:text-ink lg:flex"
        >
          ›
        </button>
      )}
    </div>
  )
}
