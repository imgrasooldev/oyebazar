import type { SupplierPaymentRecord as PaymentRecord } from '@oyebazar/core'
import type { Locale } from '@/lib/i18n'

/**
 * "Ye dukan paise waqt par deti hai ya nahi" — reseller ko order lagane se PEHLE.
 *
 * 🔴 Ye ilzam nahi, ginti hai. Har lafz kisi na kisi row se banta hai: kitne hisab band
 * hue, aosat kitne din mein, kitna abhi baqi hai. "Achhi dukan" / "buri dukan" jaisa
 * koi faisla hum nahi sunate — number rakh dete hain, faisla reseller ka.
 *
 * Ye sirf login ke andar dikhta hai, public Bazaar par nahi: Bazaar Google par hai aur
 * wahan yehi number poori duniya ke saamne ek ilzam ban jata hai.
 */
export function SupplierPaymentRecord({
  record,
  locale,
}: {
  /*
   * `supplierId` yahan jaan boojh kar nahi hai. Ye purza reseller ke safhe par lagta
   * hai, aur wahan dukan ki id bhi utni hi mamnu hai jitna naam — is liye type khud
   * usay andar aane hi nahi deta.
   */
  record: Omit<PaymentRecord, 'supplierId'> | null
  locale: Locale
}) {
  const t = LABELS[locale]

  /*
   * Nayi dukan — abhi koi record nahi, magar waada phir bhi hai.
   *
   * Pehle yahan sirf "koi record nahi" likha aata tha. Ab waada bhi likhte hain: naye
   * wholesaler ko bhi kuch keh sakne ka mauqa milna chahiye, warna nayi dukan hamesha
   * khamosh — aur khamoshi shak hi paida karti hai.
   */
  if (!record || record.total === 0) {
    return (
      <p className="text-[0.78rem] text-ink-faint">
        {record ? (
          <>
            {t.promise}{' '}
            {record.promisedDays === 0 ? (
              t.sameDay
            ) : (
              <>
                <span dir="ltr" className="numeric">
                  {record.promisedDays}
                </span>{' '}
                {t.days}
              </>
            )}
            <span className="mx-1.5">·</span>
          </>
        ) : null}
        {t.noRecord}
      </p>
    )
  }

  const late = record.oldestOpenDays >= 14 || record.disputed > 0
  const slow = !late && (record.oldestOpenDays >= 7 || (record.avgDaysToSettle ?? 0) > 7)

  return (
    <div
      className={`rounded-card px-3 py-2 text-[0.78rem] ${
        late
          ? 'bg-red-50 text-red-700'
          : slow
            ? 'bg-brand-50 text-brand-800'
            : 'bg-accent-50 text-accent-700'
      }`}
    >
      {/* Waada pehle, phir asal — isi tarteeb se donon ka moqabla nazar aata hai */}
      <p className="font-semibold">
        {t.promise}{' '}
        {record.promisedDays === 0 ? (
          t.sameDay
        ) : (
          <>
            <span dir="ltr" className="numeric">
              {record.promisedDays}
            </span>{' '}
            {t.days}
          </>
        )}
        <span className="mx-1.5">·</span>
        {t.title}{' '}
        <span dir="ltr" className="numeric">
          {record.settled}/{record.total}
        </span>{' '}
        {t.settled}
        {record.avgDaysToSettle !== null && (
          <>
            {' · '}
            {t.avg}{' '}
            <span dir="ltr" className="numeric">
              {record.avgDaysToSettle}
            </span>{' '}
            {t.days}
          </>
        )}
      </p>

      {/*
        Baqaya sirf tab likha jata hai jab wo waqai purana ho. Har dukan par "0 baqi"
        likhna us jagah ko bhar deta hai jahan asal khabar aani chahiye.
      */}
      {record.open > 0 && record.oldestOpenDays >= 3 && (
        <p className="mt-0.5">
          <span dir="ltr" className="numeric">
            {record.open}
          </span>{' '}
          {t.open}
          {' · '}
          {t.oldest}{' '}
          <span dir="ltr" className="numeric">
            {record.oldestOpenDays}
          </span>{' '}
          {t.days}
          {record.disputed > 0 && (
            <>
              {' · '}
              <span dir="ltr" className="numeric">
                {record.disputed}
              </span>{' '}
              {t.disputed}
            </>
          )}
        </p>
      )}
    </div>
  )
}

const LABELS = {
  ur: {
    title: 'حساب:',
    settled: 'بند',
    avg: 'اوسط',
    days: 'دن',
    open: 'باقی',
    oldest: 'سب سے پرانا',
    disputed: 'تنازعہ',
    promise: 'وعدہ',
    sameDay: 'اُسی دن',
    noRecord: 'ابھی کوئی ادائیگی کا ریکارڈ نہیں',
  },
  rm: {
    title: 'Hisab:',
    settled: 'band',
    avg: 'aosat',
    days: 'din',
    open: 'baqi',
    oldest: 'sab se purana',
    disputed: 'jhagra',
    promise: 'Waada',
    sameDay: 'usi din',
    noRecord: 'Abhi koi adaigi ka record nahi',
  },
  en: {
    title: 'Payments:',
    settled: 'settled',
    avg: 'avg',
    days: 'days',
    open: 'open',
    oldest: 'oldest',
    disputed: 'disputed',
    promise: 'Promise',
    sameDay: 'same day',
    noRecord: 'No payment record yet',
  },
  // Teen zubanon ka poora set lazmi — `satisfies` yahin par rok deta hai agar koi
  // zaban ya koi lafz chhoot jaye
} as const satisfies Record<Locale, Record<string, string>>
