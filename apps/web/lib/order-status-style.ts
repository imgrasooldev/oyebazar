import type { OrderStatusValue } from '@oyebazar/shared'

/**
 * Order ke har haal ka apna rang.
 *
 * Sadia ki list mein 20 orders hote hain — rang se ek nazar mein pata chalna chahiye
 * ke kis par us ka kaam baqi hai. Sirf "تصدیق باقی" wale ko garam rang milta hai;
 * baqi khamosh rehte hain, warna sab kuch cheekhta hai aur kuch nazar nahi aata.
 */
export function orderStatusStyle(status: OrderStatusValue): string {
  switch (status) {
    case 'PENDING_CONFIRM':
      return 'bg-gold-100 text-gold-700'
    case 'CONFIRMED':
    case 'SENT_TO_SUPPLIER':
      return 'bg-brand-50 text-brand-700'
    case 'ACCEPTED':
      return 'bg-emerald-50 text-emerald-700'
    // Maal bandh gaya magar chala nahi — abhi khamosh rang, kaam wholesaler par hai
    case 'PACKED':
      return 'bg-sky-50 text-sky-700'
    case 'REJECTED':
      return 'bg-red-50 text-red-700'
    case 'DISPATCHED':
      return 'bg-sky-50 text-sky-700'
    case 'DELIVERED':
      return 'bg-emerald-50 text-emerald-700'
    case 'RTO':
      return 'bg-red-50 text-red-700'
    case 'CANCELLED':
      return 'bg-paper-sunken text-ink-faint'
  }
}
