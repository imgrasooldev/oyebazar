import Link from 'next/link'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { SupplierLoginForm } from '@/components/supplier-login-form'
import { getSupplierOrNull } from '@/lib/api/supplier-session'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'Wholesaler',
  // Portal search mein nahi aana chahiye — ye dukan walon ka darwaza hai, public safha nahi
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function SupplierLoginPage() {
  const [supplier, locale] = await Promise.all([getSupplierOrNull(), getLocale()])
  if (supplier) redirect('/supplier/orders')

  const t = translator(locale)

  return (
    <div className="mx-auto max-w-md px-5 py-12">
      <div className="text-center">
        <p className="text-3xl font-bold text-brand-600">
          {locale === 'ur' ? BRAND.nameUr : BRAND.name}
        </p>
        <p className="mt-1 text-sm font-semibold text-ink-soft">{t('wholesalerPortal')}</p>
      </div>

      <div className="card mt-7 p-6">
        <h1 className="text-xl font-bold">{t('login')}</h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{t('wholesalerLoginBody')}</p>
        <div className="mt-5">
          <SupplierLoginForm locale={locale} />
        </div>
      </div>

      {/* Jo abhi listed nahi — un ke liye raasta yahin hona chahiye, warna wo wapas chale jate hain */}
      <p className="mt-6 text-center text-sm text-ink-soft">
        {t('applyBody').split('.')[0]}.{' '}
        <Link href="/supplier/join" className="link-tap font-semibold text-brand-700">
          {t('applyTitle')}
        </Link>
      </p>
    </div>
  )
}
