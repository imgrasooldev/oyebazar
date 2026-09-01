import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { BRAND } from '@oyebazar/shared'
import { LoginForm } from '@/components/login-form'
import { getResellerOrNull } from '@/lib/api/session'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

/*
 * Login `noindex` — is safhe ka Google par koi kaam nahi. Wo kisi sawal ka jawab nahi
 * deta, aur "OyeBazar login" dhoondne wala pehle se hamara banda hai jo seedha aa sakta
 * hai. Us ka index hona sirf ye karta hai ke wo asli safhon ke saath moqabla kare.
 */
export const metadata: Metadata = { title: 'Login', robots: { index: false, follow: true } }
export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const [actor, locale] = await Promise.all([getResellerOrNull(), getLocale()])
  if (actor) redirect('/dashboard')

  const t = translator(locale)

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="text-center">
        <p className="text-3xl font-bold text-brand-700">
          {locale === 'ur' ? BRAND.nameUr : BRAND.name}
        </p>
        <p className="mt-1 text-sm text-ink-soft">{t('resellerPortal')}</p>
      </div>

      <div className="card mt-6 p-5">
        <h1 className="text-xl font-bold">{t('login')}</h1>
        <p className="mt-1 text-sm text-ink-soft">{t('loginBody')}</p>
        <p className="mt-2 text-[0.85rem] font-semibold text-accent-700">{t('newHereRegister')}</p>
        <div className="mt-4">
          <LoginForm locale={locale} />
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-ink-faint">{t('sharedPhoneWarning')}</p>
    </div>
  )
}
