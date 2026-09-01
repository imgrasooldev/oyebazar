import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { getResellerOrNull } from '@/lib/api/session'
import { LanguageToggle } from '@/components/language-toggle'
import { Avatar } from '@/components/avatar'
import { LogoutButton } from '@/components/logout-button'
import { RouteProgress } from '@/components/route-progress'
import { PortalSidebar } from '@/components/portal-sidebar'
import {
  GridIcon,
  ListIcon,
  MoneyIcon,
  SparkIcon,
  StoreIcon,
  TemplateIcon,
} from '@/components/icons'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

/**
 * APP zone (login ke baad) — yahan price dikhta hai aur Content Studio chalta hai.
 *
 * Do shakl, ek code:
 *  · Phone par — neeche patti, app jaisi. Sadia ka poora kaam angoothe se hota hai.
 *  · Computer par — side mein nav aur upar khata (dashboard jaisa). Bari screen par
 *    neeche ki patti ajeeb lagti hai aur beech ka poora area zaya jata hai.
 *
 * 🔴 Logout HAR screen par mojood hai — shared phone rule. Ye design choice nahi,
 *    security requirement hai (28% aurtein doosre ka phone use karti hain).
 */
/*
 * Tarteeb kaam ke hisaab se hai, safhon ki ginti ke nahi:
 * roz ka kaam pehle (dashboard → catalogue), phir us ka nateeja (orders → paisa).
 *
 * Templates catalogue ke saath hai kyunke design ka faisla wahin hota hai jahan pack
 * banta hai — halanke ye mahine mein ek dafa ka kaam hai, roz ka nahi.
 */
/**
 * Poora reseller portal `noindex` — ek hi jagah, layout par.
 *
 * 🔴 Ye har safhe par alag alag lagane se BEHTAR hai aur wajah tajurbe ki hai: naya
 * safha banane wala usay bhoolta hai, aur bhoolne ka koi nishan nahi banta. Layout par
 * hone ka matlab hai ke is folder mein jo bhi safha banega wo khud-ba-khud bahar rahega.
 *
 * In safhon par bina login ke aane wale ko `redirect('/login')` milta hai, yani Google
 * ko yahan sirf login ka safha nazar aata — har alag pate par wohi. Wo "soft 404" ki
 * shakl banti hai, aur us se site ka crawl budget usi jagah lag jata hai jahan dikhane
 * ko kuch hai hi nahi.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

const NAV = [
  { href: '/dashboard', key: 'dashboard', tab: 'tabDashboard', Icon: SparkIcon },
  { href: '/catalogue', key: 'catalogue', tab: 'tabCatalogue', Icon: GridIcon },
  /*
   * Dukanein — catalogue ke theek baad.
   *
   * 🔴 Ye safar pehle sirf `/bazaar` par tha, yani us banday ke liye jo login kiye
   * baghair aata hai. Reseller ke portal mein dukan ka zikr tak nahi tha — jabke poora
   * wada yehi hai ke wo dukan chun sakti hai.
   */
  { href: '/wholesalers', key: 'wholesalersNav', tab: 'tabWholesalers', Icon: StoreIcon },
  { href: '/templates', key: 'templatesNav', tab: 'tabTemplates', Icon: TemplateIcon },
  { href: '/orders', key: 'orders', tab: 'tabOrders', Icon: ListIcon },
  { href: '/money', key: 'moneyNav', tab: 'tabMoney', Icon: MoneyIcon },
  { href: '/bazaar', key: 'bazaar', tab: 'tabBazaar', Icon: StoreIcon },
] as const

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [actor, locale] = await Promise.all([getResellerOrNull(), getLocale()])
  if (!actor) redirect('/login')

  const t = translator(locale)
  const label = (key: (typeof NAV)[number]['key']) =>
    key === 'dashboard' ? t('dashboardNav') : t(key)

  return (
    <div className="min-h-screen bg-paper pb-24 lg:pb-0">
      {/* Click ka foran jawab — dekhen RouteProgress */}
      <RouteProgress />

      <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-app items-center justify-between gap-3 px-4 py-2 lg:px-6">
          {/*
            Naam aur "kis ka portal" — EK qatar mein, do mein nahi.

            Do qatarein header ko 78px lamba kar rahi thin. Wo lambai har safhe se katti
            hai (header chipka hua hai), aur badle mein sirf ek lafz dikhati hai jo banda
            pehli dafa ke baad kabhi nahi parhta.
          */}
          <Link
            href="/dashboard"
            className="flex min-h-tap items-center gap-2 leading-none lg:min-h-0"
          >
            <span className="font-nastaliq text-[1.2rem] font-bold text-brand-700">
              {locale === 'ur' ? BRAND.nameUr : BRAND.name}
            </span>
            <span aria-hidden="true" className="hidden h-3.5 w-px bg-line sm:block" />
            <span className="hidden text-[0.72rem] text-ink-faint sm:block">
              {t('resellerPortal')}
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/*
              Apna nishan aur naam — shared phone par pehla sawal yehi hota hai ke abhi
              kaun logged in hai (aur ye 28% ghar hain). Nishan phone par bhi rehta hai,
              naam sirf bari screen par jahan jagah hai.
            */}
            <Link
              href="/dashboard"
              className="flex min-h-tap items-center gap-2 rounded-pill px-1.5 transition hover:bg-paper-sunken lg:min-h-0 lg:py-1"
              title={actor.reseller.name}
            >
              <Avatar name={actor.reseller.name} size="sm" />
              <span className="hidden max-w-[10rem] truncate text-sm font-semibold text-ink sm:inline">
                {actor.reseller.name}
              </span>
            </Link>
            <span className="rounded-pill bg-coal-900 px-1">
              <LanguageToggle locale={locale} />
            </span>
            <LogoutButton label={t('logout')} />
          </div>
        </div>
      </header>

      {/*
        Kinare aur beech ka faasla — pehle 32px har taraf tha (gutter + gap-8).

        🔴 Wo jagah maal se cheeni ja rahi thi. 1280 ki screen par patti ke dono taraf
        aur beech mein 96px sirf khali hawa thi, aur usi wajah se catalogue mein maal ki
        qatar mein ek khana kam aata tha.
      */}
      <div className="mx-auto flex max-w-app gap-4 px-4 py-5 lg:gap-5 lg:px-6">
        {/* Side nav sirf bari screen par — phone par neeche wali patti kaam karti hai */}
        <aside className="hidden shrink-0 lg:block">
          <PortalSidebar
            storageKey="oyebazar_reseller_nav"
            items={NAV.map((item) => ({
              href: item.href,
              label: label(item.key),
              icon: <item.Icon className="h-5 w-5" />,
            }))}
            labels={{ collapse: t('navCollapse'), expand: t('navExpand') }}
          />
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      {/*
        Neeche ki patti — mobile app jaisi. Har kaam ek tap.

        🔴 `grid-cols-7` ki ginti NAV ke saath badalni parti hai. Tailwind class ka naam
        chalte waqt nahi bana sakta (wo build par CSS nikalta hai), is liye ye hath se
        likha hua hai — NAV mein koi cheez daalen ya nikalen to yahan bhi badlen, warna
        patti do qatar mein toot jati hai aur aakhri item screen se bahar chala jata hai.

        🔴 Aur theek yehi hua tha: yahan `6` likha tha jabke NAV mein SAAT khane hain,
        yani "Bazaar" doosri qatar mein utar chuka tha — aur upar wala `pb-24` sirf EK
        qatar jitni jagah chhorta hai, is liye wo qatar safhe ke aakhri maal ke upar
        chark jati thi.

        `pb-[env(safe-area-inset-bottom)]`: iPhone ke home bar ke peechay na chhupe.
      */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-paper-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-app grid-cols-7">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-h-tap min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[0.62rem] font-semibold text-ink-faint transition hover:bg-brand-50 hover:text-brand-700"
            >
              <item.Icon className="h-[1.15rem] w-[1.15rem] shrink-0" />
              <span className="w-full truncate text-center">{t(item.tab)}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
