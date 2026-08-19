import Link from 'next/link'
import { BRAND } from '@oyebazar/shared'
import { translator, type Locale } from '@/lib/i18n'

/**
 * Footer gehra hai (kaghaz par nahi) — safha yahan khatam hota hai, aur gehra rang
 * us khatme ko wazan deta hai. Halka footer safhe ko adhoora chhor deta hai.
 */
export function SiteFooter({ locale }: { locale: Locale }) {
  const t = translator(locale)

  return (
    <footer className="mt-16 bg-gradient-to-b from-coal-900 to-coal-950 text-white/70">
      {/* Footer aur header ek hi khandan ke — safha upar-neeche se juda hua lagta hai */}
      <div className="mx-auto grid max-w-shell gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xl font-bold text-white">
            {locale === 'ur' ? BRAND.nameUr : BRAND.name}
          </p>
          <p className="mt-3 text-sm leading-loose">
            {locale === 'ur'
              ? BRAND.directoryTaglineUr
              : 'A free directory of verified wholesalers across Pakistan.'}
          </p>
          <p className="mt-4 text-sm leading-loose text-white/55">
            {locale === 'ur'
              ? 'ری سیلرز کے لیے — ہر روز تیار اسٹیٹس پیک، آپ کے اپنے ریٹ اور نمبر کے ساتھ۔'
              : 'For resellers — ready-made status packs every day, with your own price and number.'}
          </p>
        </div>

        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-300">
            {t('bazaar')}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/bazaar" className="link-tap">
                {locale === 'ur' ? 'سارے ہول سیلرز' : 'All wholesalers'}
              </Link>
            </li>
            <li>
              <Link
                href={{ pathname: '/bazaar', query: { city: 'Karachi' } }}
                className="link-tap"
              >
                {locale === 'ur' ? 'کراچی' : 'Karachi'}
              </Link>
            </li>
            <li>
              <Link
                href={{ pathname: '/bazaar', query: { city: 'Lahore' } }}
                className="link-tap"
              >
                {locale === 'ur' ? 'لاہور' : 'Lahore'}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-300">
            {locale === 'ur' ? 'ری سیلرز کے لیے' : 'For resellers'}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/login" className="link-tap">
                {t('login')}
              </Link>
            </li>
            <li className="flex min-h-tap items-center">{locale === 'ur' ? 'روزانہ ۵ تیار اسٹیٹس پیک' : '5 ready status packs daily'}</li>
            <li className="flex min-h-tap items-center">{locale === 'ur' ? 'اپنا ریٹ، اپنا نمبر' : 'Your price, your number'}</li>
          </ul>
        </div>

        {/*
          Wholesaler ka apna raasta. Pehle portal mojood tha magar poori site par us ka
          koi link nahi tha — dukan wale ko URL khud type karna parta, jo koi nahi karta.
          WhatsApp ka magic link sirf ek order kholta hai; poora portal yahan se milta hai.
        */}
        <div>
          <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-brand-300">
            {t('forWholesalers')}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/supplier/join" className="link-tap font-semibold text-white">
                {t('applyTitle')}
              </Link>
            </li>
            <li>
              <Link href="/supplier/login" className="link-tap">
                {t('wholesalerLogin')}
              </Link>
            </li>
            <li className="flex min-h-tap items-center">{t('wholesalerListFree')}</li>
            <li className="flex min-h-tap items-center">{t('wholesalerManageOrders')}</li>
          </ul>
        </div>
      </div>

      {/* 🔴 Qanooni: Bazaar muft hai aur yahan se order nahi hota — ye jumla jaan boojh kar hai */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-shell flex-wrap items-center justify-between gap-2 px-5 py-5 text-[0.78rem] text-white/50">
          <span>
            {locale === 'ur'
              ? `${BRAND.nameUr} ڈائریکٹری مفت ہے۔ یہاں سے آرڈر نہیں ہوتا — رابطہ براہِ راست ہول سیلر سے ہوتا ہے۔`
              : `${BRAND.name} is a free directory. No ordering happens here — you deal with the wholesaler directly.`}
          </span>
          <span className="numeric text-[0.8rem]">{BRAND.domain}</span>
        </div>
      </div>
    </footer>
  )
}
