import Link from 'next/link'
import type { CategoryTreeNode } from '@oyebazar/core'
import { ChevronIcon } from '@/components/icons'
import { pickName, translator, type Locale } from '@/lib/i18n'

/**
 * Categories ka mega-menu — bari category par hover, saath mein us ki sub-categories.
 *
 * 🔴 JavaScript ke baghair (CSS `group-hover`). Wajah: ye safhe ka sab se pehla element
 * hai; agar iske liye JS ka intezar karna pare to sasta phone use dabata rahega aur
 * kuch nahi hoga. CSS hover foran chalta hai, chahe bundle abhi load bhi na hua ho.
 *
 * Mobile par flyout nahi hota — wahan chips ki patti hai (CategoryStrip).
 *
 * Sirf pehli VISIBLE_COUNT categories dikhti hain: poori list is list ko itna lamba kar
 * deti thi ke hero ke saath mil kar pehla poora screen sirf navigation ban jata tha aur
 * asli maal neeche chhup jata. Baqi "sab dekhen" ke peechay hain.
 */
const VISIBLE_COUNT = 8
export function CategoryMenu({
  tree,
  locale,
  itemsLabel,
  title,
  viewAllLabel,
}: {
  tree: CategoryTreeNode[]
  locale: Locale
  itemsLabel: string
  title: string
  viewAllLabel: string
}) {
  const t = translator(locale)

  return (
    <div className="card relative overflow-visible">
      <p className="px-5 pb-2 pt-4 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink-faint">
        {title}
      </p>

      <ul className="pb-2">
        {tree.slice(0, VISIBLE_COUNT).map((category) => (
          <li key={category.slug} className="group/cat static">
            <Link
              href={{ pathname: '/bazaar', query: { category: category.slug } }}
              className="flex items-center gap-3 px-5 py-2 text-[0.95rem] text-ink-soft transition group-hover/cat:bg-brand-50 group-hover/cat:text-brand-800"
            >
              <Thumb url={category.coverImageUrl} />
              <span className="flex-1 truncate">{pickName(locale, category)}</span>
              <ChevronIcon className="h-3.5 w-3.5 shrink-0 text-ink-faint transition group-hover/cat:text-brand-600 rtl:rotate-180" />
            </Link>

            {/* Flyout — sirf desktop par, aur sirf jab sub-categories hon */}
            {category.children.length > 0 && (
              <div className="pointer-events-none absolute inset-y-0 start-full z-40 hidden w-[34rem] ps-3 opacity-0 transition duration-150 group-hover/cat:pointer-events-auto group-hover/cat:opacity-100 lg:block">
                <div className="card h-full overflow-y-auto p-5 shadow-lift">
                  <div className="mb-4 flex items-baseline justify-between gap-3">
                    <p className="text-[1.05rem] font-bold">{pickName(locale, category)}</p>
                    <span className="numeric text-xs text-ink-faint">
                      {category.productCount} {itemsLabel}
                    </span>
                  </div>

                  <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {category.children.map((child) => (
                      <li key={child.slug}>
                        <Link
                          href={{ pathname: '/bazaar', query: { category: child.slug } }}
                          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink-soft transition hover:bg-paper-sunken hover:text-brand-800"
                        >
                          <Thumb url={child.coverImageUrl} size="sm" />
                          <span className="flex-1 truncate">{pickName(locale, child)}</span>
                          <span className="numeric shrink-0 text-xs text-ink-faint">
                            {child.productCount}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={{ pathname: '/bazaar', query: { category: category.slug } }}
                    className="section-link mt-4 inline-flex items-center gap-1"
                  >
                    {viewAllLabel}
                    <ChevronIcon className="h-3.5 w-3.5 rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Link
        href="/bazaar"
        className="block rounded-b-card bg-paper-sunken px-5 py-3 text-sm font-semibold text-brand-800 transition hover:bg-brand-50"
      >
        {t('viewAllCategories')}
      </Link>
    </div>
  )
}

/**
 * Category ka chhota nishan.
 *
 * Nazar tasveer par pehle jati hai, lafz baad mein — khaas kar us user ke liye jo tez
 * parhna nahi janti. Tasveer na ho to khali dabba, "?" ya toota hua icon nahi: khali
 * jagah shor nahi machati.
 *
 * next/image nahi — ye URLs storage/CDN se aate hain aur yahan naap pehle se tay hai,
 * to optimizer ka koi faida nahi (baqi app bhi yahi karti hai).
 */
function Thumb({ url, size = 'md' }: { url: string | null; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8'

  return (
    <span
      className={`${box} shrink-0 overflow-hidden rounded-lg bg-paper-sunken`}
      aria-hidden
    >
      {url && (
        // eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
    </span>
  )
}
