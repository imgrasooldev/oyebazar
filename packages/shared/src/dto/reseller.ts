import { z } from 'zod'

export const ResellerTierSchema = z.enum(['NEW', 'BRONZE', 'SILVER', 'GOLD'])

/** /api/v1/me — profile + performance summary. Koi payout account plain text mein nahi. */
export const ResellerProfileDTO = z
  .object({
    id: z.string(),
    name: z.string(),
    /** masked: 0300****321 — shared phone ki wajah se */
    whatsappPhoneMasked: z.string(),
    city: z.string(),
    area: z.string().nullable(),
    tier: ResellerTierSchema,
    /** masked: ****4521 */
    payoutAccountMasked: z.string().nullable(),
    joinedAt: z.string(),
  })
  .strict()

export const ResellerPerformanceDTO = z
  .object({
    ordersThisMonth: z.number().int().nonnegative(),
    deliveredThisMonth: z.number().int().nonnegative(),
    /** RTO % — reseller ko dikhana zaroori hai, ye us ka apna number hai */
    rtoRatePct: z.number().nonnegative(),
    earningsThisMonth: z.number().int().nonnegative(),
    statusPacksShared: z.number().int().nonnegative(),
  })
  .strict()

export type ResellerProfile = z.infer<typeof ResellerProfileDTO>
export type ResellerPerformance = z.infer<typeof ResellerPerformanceDTO>
