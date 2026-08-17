import type { Pkr } from '@oyebazar/shared'

/** Ek din ka pack — subah 9 baje jo list broadcast hoti hai, wohi app mein dikhti hai. */
export interface DailyDropView {
  readonly id: string
  readonly dropDate: Date
  readonly status: 'DRAFT' | 'SCHEDULED' | 'SENT'
  readonly sentAt: Date | null
  readonly productIds: readonly string[]
}

/** Broadcast ke liye reseller ki kam se kam maloomat — poora record laane ki zaroorat nahi. */
export interface BroadcastRecipient {
  readonly id: string
  readonly name: string
  readonly whatsappPhone: string
}

/** Reseller ke liye aaj ka pack — us ke apne price ke saath. */
export interface DailyPackItem {
  readonly productId: string
  readonly titleUr: string
  readonly coverImageUrl: string | null
  readonly bajiPrice: Pkr
  readonly myPrice: Pkr
  /** pack pehle se render ho chuka ho to seedha image */
  readonly imageUrl: string | null
}
