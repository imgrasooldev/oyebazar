import { z } from 'zod'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * POST /api/v1/status-pack/pitch — "is maal par kya likhoon?"
 *
 * 🔴 Ye wo ek qadam hai jahan reseller ruk jati hai. Tasveer hum bana dete hain, rate
 * hum likh dete hain, aur phir wo khali khana dekh kar status lagaye baghair chali jati
 * hai. Teen jumle us khali khane ka jawab hain.
 *
 * 🔴 Ye route KABHI nakaam nahi hota (siwaye login/rate-limit ke). Model band ho, key
 * khatam ho, network kharab ho — jawab phir bhi aata hai, hamare apne khanon se
 * (dekhen `createPitchWriter`). Jis din ye khali jawab dene lage, us din feature ka
 * hona aur na hona barabar hai.
 */
const PitchRequest = z.object({ productId: z.string().min(1) }).strict()

export async function POST(request: Request) {
  return apiHandler(async () => {
    const { reseller } = await requireReseller()
    const body = await parseBody(request, PitchRequest)

    const { product } = await container.catalogue.getById(reseller.id, body.productId)

    const lines = await container.pitch.forProduct({
      titleUr: product.titleUr,
      titleEn: product.titleEn,
      categoryNameUr: product.category.nameUr,
      categoryNameEn: product.category.nameEn,
      city: product.supplier.city,
      /*
       * Stock ki khabar saath jati hai — "aaj hi nikle ga" wala jumla khali maal par
       * likh dena reseller ko us ke customer ke saamne jhooti bana deta hai.
       */
      hasStock: product.inStock && product.stockLeft > 0,
      descriptionUr: product.descriptionUr,
      /*
       * Likhawat pack ki apni zaban se — reseller ke UI ki zaban se nahi. Wo do alag
       * faisle hain: Roman likhne wali reseller bhi apne customers ko Urdu pack bhejti
       * hai (dekhen `PackOptions.lang`).
       *
       * 🔴 Do paimane poore mel nahi khate: pack ki zaban `ur | en` hai, aur jumlon ki
       * likhawat `ur | roman`. Angrezi pack par ROMAN jumle jate hain, angrezi nahi —
       * aur ye jaan boojh kar hai. Pakistani customer ke status par angrezi jumla parha
       * hi nahi jata; "Maal dekh kar paise den" wo padhta bhi hai aur us par amal bhi
       * karta hai. Jis din waqai angrezi jumle chahiye honge, `PitchInput.script` mein
       * teesri qadar daalni paregi — us waqt tak ye us se behtar hai jo maujood hai.
       */
      script: reseller.packDefaults.lang === 'en' ? 'roman' : 'ur',
    })

    return { lines }
  })
}
