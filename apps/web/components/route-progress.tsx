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
/**
 * Wo navigation jo click se nahi, code se hoti hai (`router.push`).
 *
 * 🔴 Filter, tarteeb aur grid/qatar ke button `<a>` nahi hain — wo URL khud badalte
 * hain. Yani jis lakeer ne click ka jawab dena tha, wo un par chalti hi nahi thi, aur
 * wahi jagah hai jahan intezar sab se zyada khalta hai: reseller filter dabati hai aur
 * poori list dobara banti hai.
 *
 * Ek chhota sa paighaam kaafi hai — RouteProgress ko kisi component se joRne (ya har
 * jagah state pass karne) se ye behtar hai.
 */
export const ROUTE_PROGRESS_EVENT = 'oyebazar:navigating'

export function signalNavigation(): void {
  window.dispatchEvent(new CustomEvent(ROUTE_PROGRESS_EVENT))
}

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

    function onSignal() {
      setRunning(true)
    }

    document.addEventListener('click', onClick, { capture: true })
    window.addEventListener(ROUTE_PROGRESS_EVENT, onSignal)
    return () => {
      document.removeEventListener('click', onClick, { capture: true })
      window.removeEventListener(ROUTE_PROGRESS_EVENT, onSignal)
    }
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

  /*
   * Safhe ko halka karna — `<html>` par ek nishan, aur baqi kaam CSS ka.
   *
   * 🔴 BLUR nahi, sirf halka (opacity). `filter: blur()` poore safhe ki layer har frame
   * par dobara rasterise karwata hai; 15 hazar wale Android par — yani theek us phone
   * par jis ke liye ye app hai — wo lag deta hai. Natija ulta: jis cheez se safha TEZ
   * mehsoos karana tha, wo usay SUST kar deti. Opacity compositor par chalti hai (GPU),
   * aur us ka kharcha taqreeban sifar hai.
   *
   * Aur ek wajah: halka safha PARHA ja sakta hai, blur wala nahi. Us ek second mein
   * purana safha abhi bhi kaam ka hai — banda samajh sakta hai ke us ne ghalat jagah
   * click kar diya.
   */
  useEffect(() => {
    const root = document.documentElement
    if (running) root.dataset.navigating = ''
    else delete root.dataset.navigating

    return () => {
      delete root.dataset.navigating
    }
  }, [running])

  if (!running) return null

  return (
    <>
      {/*
        Beech wala nishan — magar DER se aata hai (CSS mein `animation-delay`).

        🔴 Jo navigation 200ms mein ho jaye us par nishan dikhana nuqsan hai: wo ek
        jhapki (flash)ban jata hai, aur jhapki "kuch kharab hua" parhi jati hai. Nishan
        sirf us intezar ke liye hai jo waqai mehsoos hota hai.
      */}
      <span
        aria-hidden="true"
        className="route-spinner pointer-events-none fixed inset-0 z-40 flex items-center justify-center"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper-raised shadow-lift">
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 animate-spin text-brand-600">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
            <path
              d="M21 12a9 9 0 0 0-9-9"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
        </span>
      </span>

    <span
      aria-hidden="true"
      /*
        4px, 2px nahi.
        🔴 2px ki lakeer safhe ke bilkul upar thi — theek wahan jahan click karne wale ki
        nazar hoti hi nahi. Jo ishara dikhta na ho wo ishara nahi hota; us ki saari
        mehnat rayegan jati hai. 4px abhi bhi halka hai magar aankh ke kone mein aa jata
        hai.
      */
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-brand-500/15"
    >
      {/*
        Lakeer aage barhti hai magar kabhi 100% par nahi pohanchti — asal waqt hamein
        pata hi nahi hota, aur jhooti "poori" lakeer dikha kar rukna is se bura hai.
        Safha aate hi ye poora khana gayab ho jata hai.
      */}
      <span className="route-progress block h-full w-full origin-left bg-brand-500 rtl:origin-right" />
    </span>
    </>
  )
}
