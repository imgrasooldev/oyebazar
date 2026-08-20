import type { Metadata } from 'next'
import { SupplierDeliveryRates } from '@/components/supplier-delivery-rates'
import { SupplierPaymentTerm } from '@/components/supplier-payment-term'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'Dukan ke qawaid' }
export const dynamic = 'force-dynamic'

/**
 * Dukan ke apne qawaid — delivery ka rate aur payment ka waada.
 *
 * 🔴 Pehle ye dono paison wale safhe par pare the aur dukan wala unhen dhoondh hi nahi
 * paya: wo maal wale safhe par gaya (jahan maal daalte waqt rate likha jata hai) aur
 * wahan kuch na mil kar samajha ke ye cheez hai hi nahi.
 *
 * Sabaq wahi purana hai: cheez wahan honi chahiye jahan banda usay DHOONDNE jata hai,
 * na ke wahan jahan wo hamare zehni naqshe mein fit baithti hai. Paise wala safha hisab
 * ka hai; qawaid alag cheez hain, is liye alag safha aur nav mein apna naam.
 */
export default async function SupplierSettingsPage() {
  const [{ supplier }, locale] = await Promise.all([requireSupplier(), getLocale()])
  const t = translator(locale)

  const [term, internal] = await Promise.all([
    container.payouts.paymentTerm(supplier.id),
    container.repositories.suppliers.findInternal(supplier.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.3rem] font-bold tracking-tight">{t('shopRules')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-soft">{t('shopRulesBody')}</p>
      </div>

      <SupplierDeliveryRates
        city={internal?.deliveryFeeCity ?? 200}
        other={internal?.deliveryFeeOther ?? 350}
        labels={{
          title: t('deliveryTitle'),
          inCity: t('deliveryInCity'),
          outCity: t('deliveryOutCity'),
          save: t('save'),
          saved: t('deliverySaved'),
          note: t('deliveryNote'),
        }}
      />

      <SupplierPaymentTerm
        current={term}
        labels={{
          title: t('termTitle'),
          sameDay: t('termSameDay'),
          days: t('termDays'),
          saved: t('termSaved'),
          note: t('termNote'),
        }}
      />
    </div>
  )
}
