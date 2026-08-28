'use client'

import Link, { useLinkStatus } from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { Route } from 'next'

export interface SidebarItem {
  href: Route
  label: string
  /** Bana banaya nishan — server se aata hai (component nahi, element) */
  icon: React.ReactNode
}

/**
 * Bari screen ka side nav — dono portals ke liye ek hi.
 *
 * Teen cheezein pehle nahi thin:
 *
 *  · Apna rang — patti safhe hi ke rang ki thi, is liye "safha kahan shuru hota hai"
 *    ka koi kinara nahi tha. Ab ye gehre rang ka apna khana hai (wohi coal jo upar
 *    header mein hai) — poore app ke rang wahi hain, sirf ye patti ab alag nazar aati hai.
 *
 *  · Kaun sa safha khula hai — koi nishan nahi tha. Paanch khanon mein se kaun sa abhi
 *    chal raha hai, ye har dafa safhe ka unwan parh kar pata karna parta tha.
 *
 *  · Band/khula — chhoti laptop screen (1280) par 224px ki patti mustaqil bethi rehti
 *    thi, aur maal ki qatarein us ke barabar tang ho jati thin. Ab ye simat kar sirf
 *    nishanon ki reh jati hai.
 *
 * 🔴 Yahan `min-h-tap` (44px) NAHI hai — aur ye bhool nahi hai.
 *
 * Wo 44px ungli ka naap hai. Ye patti `hidden lg:block` hai, yani wo sirf us screen par
 * bunti hai jahan mouse chal raha hota hai, aur mouse pixel par lagta hai. Us hadd ne
 * saat khanon ko 308px lamba kar diya tha jabke unhein 260px chahiye — yani har safhe
 * par pachas pixel khali, bina kisi faide ke.
 *
 * 🔴 Band/khula browser ki yaadasht (localStorage) mein rehta hai, cookie mein nahi:
 * ye har banday ki apni pasand hai, us ke apne computer par — server ko is se koi
 * kaam nahi, aur cookie har request ke saath bhejna faaltu bojh hota.
 */
export function PortalSidebar({
  items,
  storageKey,
  labels,
}: {
  items: readonly SidebarItem[]
  /** Har portal ki apni yaadasht — dukan aur reseller ki pasand alag ho sakti hai */
  storageKey: string
  labels: { collapse: string; expand: string }
}) {
  const pathname = usePathname()

  /*
   * Shuru mein hamesha khula.
   *
   * localStorage server par mojood hi nahi, is liye pehli render dono taraf khuli hi
   * banti hai — aur yehi theek hai: agar hum yahan andaza lagate to safha khulte hi
   * patti ek dafa hilti (hydration mismatch), jo har dafa nazar aata.
   */
  const [collapsed, setCollapsed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(storageKey) === '1')
    setReady(true)
  }, [storageKey])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    window.localStorage.setItem(storageKey, next ? '1' : '0')
  }

  return (
    <nav
      className={`sticky top-20 flex flex-col gap-0.5 rounded-card bg-coal-900 p-1.5 text-white shadow-soft transition-[width] duration-200 ease-soft ${
        collapsed ? 'w-[3.75rem]' : 'w-[13rem]'
      } ${ready ? '' : 'opacity-100'}`}
    >
      {items.map((item) => {
        /*
         * Khula hua safha — `startsWith` se, taake andar ke safhe bhi apne khane ko
         * roshan rakhen (misal `/catalogue/<maal>` par bhi "کیٹلاگ" hi jalta rahe).
         */
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            // Band halat mein naam gayab hota hai, is liye tooltip lazmi
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-2.5 rounded-card px-2.5 py-2 text-[0.88rem] font-semibold transition ${
              active ? 'bg-brand-500 text-white shadow-lift' : 'text-white/65 hover:bg-white/10 hover:text-white'
            } ${collapsed ? 'justify-center' : ''}`}
          >
            <NavItemBody icon={item.icon} label={item.label} collapsed={collapsed} />
          </Link>
        )
      })}

      <span aria-hidden="true" className="my-0.5 h-px w-full bg-white/10" />

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? labels.expand : labels.collapse}
        className={`flex items-center gap-2.5 rounded-card px-2.5 py-2 text-[0.78rem] font-semibold text-white/45 transition hover:bg-white/10 hover:text-white ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        {/*
          Teer ka rukh RTL par khud palat jata hai (`rtl:rotate-180`) — Urdu mein patti
          daayen taraf hoti hai, aur wahan "simto" ka matlab doosri simt hai.
        */}
        <span
          className={`shrink-0 transition-transform duration-200 rtl:rotate-180 ${
            collapsed ? 'rotate-180' : ''
          }`}
        >
          <ChevronLeft />
        </span>
        {!collapsed && <span className="truncate">{labels.collapse}</span>}
      </button>
    </nav>
  )
}

/**
 * Khana khud — aur us ka "chal raha hai" wala nishan.
 *
 * 🔴 Ye alag component is liye hai ke `useLinkStatus` sirf Link ke ANDAR kaam karta hai.
 *
 * Masla ye tha: click ke baad 300–400ms (aur naye safhe par kai second) tak safhe par
 * kuch bhi nahi hota — na patti badalti hai, na skeleton aata hai, kyunke navigation
 * server ka jawab aane par "committed" hoti hai. Us khamoshi mein banda samajhta hai
 * ke click laga hi nahi, aur dobara dabata hai (aur phir teesri dafa).
 *
 * Ab click ke usi lamhe nishan ghoomne lagta hai. Safha utni hi der mein aata hai —
 * magar ab wo intezar "kuch ho raha hai" wala hai, "kuch hua hi nahi" wala nahi.
 */
function NavItemBody({
  icon,
  label,
  collapsed,
}: {
  icon: React.ReactNode
  label: string
  collapsed: boolean
}) {
  const { pending } = useLinkStatus()

  return (
    <>
      <span className="shrink-0 [&>svg]:h-[1.15rem] [&>svg]:w-[1.15rem]">{pending ? <Spinner /> : icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </>
  )
}

function Spinner() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-spin" aria-hidden="true">
      {/* Poora daira halka, aur ek chauthai numaya — ghoomne ka ehsaas isi farq se banta hai */}
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.25" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
