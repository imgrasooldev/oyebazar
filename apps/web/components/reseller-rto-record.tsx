import type { ResellerRiskRecord } from '@oyebazar/core'
import { formatPkr } from '@oyebazar/shared'
import type { Locale } from '@/lib/i18n'

/**
 * Reseller ka RTO record — dukan ko order QUBOOL karne se pehle.
 *
 * 🔴 Wapsi ka nuqsan dukan uthati hai: courier dono taraf ka kirchaya leta hai aur maal
 * bhi wapas aa jata hai. Faisla us ka hai, magar faisle ke waqt us ke paas koi ishara
 * hota hi nahi tha — pata us waqt chalta tha jab maal wapas darwaze par hota.
 *
 * Ye ilzam nahi, ginti hai: kitne bheje, kitne pohanche, kitne wapas aaye. Faisla phir
 * bhi dukan ka — hum sirf wo dikhate hain jo hamare paas pehle se likha hai.
 *
 * Rate sirf MUKAMMAL hue orders par ginta hai (pohanche + wapas aaye). Chal rahe order
 * shamil karte to har naya banda achha lagta, kyunke us ke saare order abhi raste mein
 * hote hain.
 */
export function ResellerRtoRecord({
  record,
  locale,
}: {
  record: ResellerRiskRecord | undefined
  locale: Locale
}) {
  const t = LABELS[locale]

  // Naya rishta — koi record hi nahi. "0 RTO" likhna us ko achha dikhata hai jab ke
  // abhi kuch sabit hi nahi hua
  if (!record || record.delivered + record.rto === 0) {
    return <span className="text-[0.75rem] text-ink-faint">{t.noRecord}</span>
  }

  const bad = (record.rtoRate ?? 0) >= 20
  const watch = !bad && (record.rtoRate ?? 0) >= 10

  return (
    <span
      className={`inline-flex flex-wrap items-baseline gap-x-1.5 rounded-pill px-2.5 py-1 text-[0.75rem] font-semibold ${
        bad
          ? 'bg-red-50 text-red-700'
          : watch
            ? 'bg-brand-50 text-brand-800'
            : 'bg-accent-50 text-accent-700'
      }`}
    >
      {t.title}
      <span dir="ltr" className="numeric">
        {record.rto}/{record.delivered + record.rto}
      </span>
      {record.rtoRate !== null && (
        <span dir="ltr" className="numeric">
          ({record.rtoRate}%)
        </span>
      )}

      {/*
        Kharcha sirf tab jab waqai kuch gaya ho. Har qatar par "Rs 0" likhna us jagah
        ko bhar deta hai jahan asal khabar aani chahiye.
      */}
      {record.rtoDeliveryCost > 0 && (
        <span dir="ltr" className="numeric font-normal">
          · {formatPkr(record.rtoDeliveryCost)}
        </span>
      )}
    </span>
  )
}

const LABELS = {
  ur: { title: 'واپسی:', noRecord: 'اس کے ساتھ پہلا آرڈر' },
  rm: { title: 'Wapsi:', noRecord: 'Is ke saath pehla order' },
  en: { title: 'Returns:', noRecord: 'First order with them' },
} as const satisfies Record<Locale, Record<string, string>>
