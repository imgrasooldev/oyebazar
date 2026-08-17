import type { BroadcastRecipient, DailyDropView } from '../domain/daily-drop'

export interface DailyDropRepository {
  findByDate(date: Date): Promise<DailyDropView | null>
  create(date: Date, productIds: readonly string[]): Promise<DailyDropView>
  markSent(dropId: string, at: Date, sentCount: number): Promise<void>

  /**
   * Wo products jo pichhle N dinon mein drop ho chuke hain.
   * Curation ka sab se ahem input — wohi maal dobara bhejna reseller ki nazar mein
   * "kuch naya nahi aaya" hai, aur wo agle din khol kar bhi nahi dekhti.
   */
  findRecentlyDroppedProductIds(since: Date): Promise<string[]>
}

export interface BroadcastAudienceRepository {
  /**
   * Broadcast kis ko jayega. SUSPENDED aur LIMITED bahar rehti hain.
   * `activeSince` diya jaye to sirf wo jo haal mein active thin (Meta ki quality rating
   * girne se bachne ke liye — jo kabhi nahi kholti, us ko roz bhejna nuqsan hai).
   */
  listActive(options: { activeSince?: Date; limit: number; cursor?: string }): Promise<{
    recipients: BroadcastRecipient[]
    nextCursor: string | null
  }>

  markLimited(resellerId: string, reason: string): Promise<void>
}

export interface OutboundMessageLog {
  readonly toPhone: string
  readonly template: string
  readonly resellerId?: string | undefined
  readonly providerMessageId?: string | undefined
  readonly status: 'sent' | 'failed'
  readonly errorCode?: string | undefined
  readonly payload: Record<string, unknown>
}

export interface MessageLogRepository {
  record(message: OutboundMessageLog): Promise<void>
  /** Ek number par haal ke nakaam messages — 3 se zyada ho to us number par bhejna band. */
  countRecentFailures(phone: string, since: Date): Promise<number>
}
