import type { PackOptions, Pkr } from '@oyebazar/shared'

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
  /**
   * Is reseller ke apne pack faislay — raat ki pre-generation inhi par chalti hai.
   *
   * 🔴 Ye yahan hona zaroori hai. Bina is ke jis reseller ne apna number chhupaya hai,
   * us ka subah 9 baje wala pack phir bhi number ke saath banta rehta — aur wo hamara
   * sab se ziyada dekha jane wala pack hai. Us ka switch us jagah bekar ho jata jahan
   * us ka sab se ziyada matlab hai.
   */
  readonly packDefaults: PackOptions
}

/** Reseller ke liye aaj ka pack — us ke apne price ke saath. */
export interface DailyPackItem {
  readonly productId: string
  readonly titleUr: string
  /** Angrezi/Roman zaban ke liye — warna English par bhi Urdu naam dikhta hai */
  readonly titleEn: string
  readonly coverImageUrl: string | null
  readonly bajiPrice: Pkr
  readonly myPrice: Pkr
  /** pack pehle se render ho chuka ho to seedha image */
  readonly imageUrl: string | null
}
