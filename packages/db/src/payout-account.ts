import type { PayoutAccount, PayoutMethod } from '@oyebazar/core'

/**
 * DB ke chaar khaane → ek khata (ya `null`).
 *
 * 🔴 Adhoora khata `null` banta hai, adhoora object nahi. DB mein chaar alag nullable
 * khaane hain aur un ki soorat-e-haal solah tarah ki ho sakti hai; is ke aage wale poore
 * code ko un solah mein se sirf DO se wasta hona chahiye: khata hai, ya nahi hai.
 *
 * Aur ye faisla ek hi jagah hona chahiye — warna ek safha "number to hai" keh kar naam
 * ke baghair qatar chhap deta hai, aur dukan wala us par paisa bhej deta hai.
 */
export function payoutAccountFrom(row: {
  payoutMethod: PayoutMethod | null
  payoutAccount: string | null
  payoutTitle: string | null
  payoutBankName: string | null
}): PayoutAccount | null {
  if (!row.payoutMethod || !row.payoutAccount || !row.payoutTitle) return null

  return {
    method: row.payoutMethod,
    number: row.payoutAccount,
    title: row.payoutTitle,
    bankName: row.payoutBankName,
  }
}

/** Ulta rasta — khata → DB ke khaane. `null` sab kuch mita deta hai. */
export function payoutAccountColumns(account: PayoutAccount | null, at: Date) {
  return {
    payoutMethod: account?.method ?? null,
    payoutAccount: account?.number ?? null,
    payoutTitle: account?.title ?? null,
    payoutBankName: account?.bankName ?? null,
    payoutUpdatedAt: at,
  }
}

export const PAYOUT_ACCOUNT_SELECT = {
  payoutMethod: true,
  payoutAccount: true,
  payoutTitle: true,
  payoutBankName: true,
  payoutUpdatedAt: true,
} as const
