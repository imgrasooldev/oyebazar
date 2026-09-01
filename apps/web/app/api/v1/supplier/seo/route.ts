import { z } from 'zod'
import {
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  cleanSeoText,
} from '@oyebazar/core'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/*
 * Zod sirf SHAKAL dekhta hai (matn hai, aur itna lamba nahi ke request hi bhaari ho
 * jaye). Kaatna aur safai `cleanSeoText` karta hai — yani domain, taake wo qaida ek
 * hi jagah rahe aur dukan wale ke safhe aur maal ke safhe par wohi chale.
 */
const BodySchema = z
  .object({
    seoTitle: z.string().max(500).nullable(),
    seoDescription: z.string().max(2_000).nullable(),
  })
  .strict()

/**
 * PUT /api/v1/supplier/seo — dukan ke apne safhe ka unwan aur do line.
 *
 * 🔴 Khali bhejna JAIZ hai aur us ka matlab "hata do" hai — us ke baad safha wapas
 * apna bana hua unwan (naam + sheher + maal ki ginti) istemal karta hai. Yehi wajah hai
 * ke DELETE ka alag rasta nahi banaya: "khaali kar ke save" wo qudrati amal hai jo har
 * banda karta hai, aur usay chup chaap nazar-andaz kar dena us se bura hai.
 */
export async function PUT(request: Request) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, BodySchema)

    await container.repositories.suppliers.saveSeoText(supplier.id, {
      seoTitle: cleanSeoText(body.seoTitle, SEO_TITLE_MAX),
      seoDescription: cleanSeoText(body.seoDescription, SEO_DESCRIPTION_MAX),
    })

    return { ok: true }
  })
}
