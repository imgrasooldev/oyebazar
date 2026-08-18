import Link from 'next/link'
import type { Metadata } from 'next'
import { BRAND } from '@oyebazar/shared'
import { SupplierApplyForm } from '@/components/supplier-apply-form'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'List your shop',
  description: 'Pakistan ke wholesalers — OyeBazar directory par muft listing.',
}
export const dynamic = 'force-dynamic'

/**
 * "Apni dukan list karwayen".
 *
 * Ye public safha hai (nayi dukan ke paas account hai hi nahi). Darkhwast bhejne se
 * dukan live NAHI hoti — wo PENDING banti hai aur ops portal mein aati hai. Ye baat
 * safhe par saaf likhi hai: jhoota waada baad mein shikayat banta hai.
 */
export default async function SupplierJoinPage() {
  const locale = await getLocale()
  const t = translator(locale)

  return (
    <div className="mx-auto max-w-2xl px-5 py-10">
      <div className="text-center">
        <p className="text-[0.78rem] font-semibold uppercase tracking-[0.14em] text-brand-700">
          {locale === 'ur' ? BRAND.nameUr : BRAND.name}
        </p>
        <h1 className="mt-2 text-[1.6rem] font-bold tracking-tight">{t('applyTitle')}</h1>
        <p className="mx-auto mt-3 max-w-lg text-[0.95rem] leading-relaxed text-ink-soft">
          {t('applyBody')}
        </p>
      </div>

      <div className="mt-8">
        <SupplierApplyForm locale={locale} />
      </div>

      <p className="mt-6 text-center text-sm text-ink-soft">
        {t('alreadyListed')}{' '}
        <Link href="/supplier/login" className="link-tap font-semibold text-brand-700">
          {t('wholesalerLogin')}
        </Link>
      </p>
    </div>
  )
}
