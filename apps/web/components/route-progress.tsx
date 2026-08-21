'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

/**
 * Safha badalne ki patli si lakeer — upar, poori chaurai par.
 *
 * 🔴 Masla asal mein "slow" ka nahi tha, KHAMOSHI ka tha.
 *
 * App Router mein dynamic safhe par navigation us waqt "committed" hoti hai jab server
 * ka jawab aa jaye. Us se pehle — 300–400ms, aur naye safhe par kai second — screen par
 * bilkul kuch nahi badalta: na patti, na skeleton (skeleton bhi commit ke baad aata
 * hai). Us khamoshi mein banda samajhta hai ke click laga hi nahi aur dobara dabata hai.
 *
 * Ye lakeer click ke usi lamhe chal parti hai. Waqt utna hi lagta hai — magar ab wo
 * "kuch ho raha hai" wala intezar hai.
 *
 * Sidebar ka apna nishan alag hai (wahan usi khane par ghoomta hai). Ye us ke liye hai
 * jo baqi poore safhe par hai: card, button, neeche wali patti.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const [running, setRunning] = useState(false)

  // Naya safha aa gaya — lakeer khatam
  useEffect(() => {
    setRunning(false)
  }, [pathname])

  useEffect(() => {
    function onClick(event: MouseEvent) {
      // Naye tab wala click (Ctrl/Cmd/middle) safha badalta hi nahi
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
        return
      if (event.button !== 0) return

      const link = (event.target as HTMLElement | null)?.closest?.('a')
      if (!link) return

      const href = link.getAttribute('href')
      if (!href || link.target === '_blank' || link.hasAttribute('download')) return
      // Sirf apne app ke andar ke raste — bahar jane par to poora safha hi badal jata hai
      if (!href.startsWith('/')) return

      // Usi safhe ka link — kuch hoga hi nahi, to lakeer bhi nahi chalni chahiye
      const target = new URL(href, window.location.origin)
      if (target.pathname === window.location.pathname && target.search === window.location.search)
        return

      setRunning(true)
    }

    document.addEventListener('click', onClick, { capture: true })
    return () => document.removeEventListener('click', onClick, { capture: true })
  }, [])

  /*
   * Hifazati waqt: navigation kisi wajah se na ho (server ne ghalti di, ya route hi
   * mojood nahi) to lakeer hamesha ke liye chalti reh jati — jo us se bhi bura hai jis
   * masle ko ye theek karne aayi thi.
   */
  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => setRunning(false), 15_000)
    return () => clearTimeout(timer)
  }, [running])

  if (!running) return null

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden bg-brand-500/15"
    >
      {/*
        Lakeer aage barhti hai magar kabhi 100% par nahi pohanchti — asal waqt hamein
        pata hi nahi hota, aur jhooti "poori" lakeer dikha kar rukna is se bura hai.
        Safha aate hi ye poora khana gayab ho jata hai.
      */}
      <span className="route-progress block h-full w-full origin-left bg-brand-500 rtl:origin-right" />
    </span>
  )
}
