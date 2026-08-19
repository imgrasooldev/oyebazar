import { z } from 'zod'
import { MAX_MEDIA_PER_PRODUCT } from '@oyebazar/shared'
import { apiHandler, parseBody } from '@/lib/api/handler'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'

export const runtime = 'nodejs'

/**
 * Mojooda maal ki tasveerein — lagana, hatana, cover badalna, tarteeb.
 *
 * Ye alag endpoint is liye hai ke maal banane ke baad bhi tasveer badalni parti hai:
 * pehli tasveer dhundhli aa gayi, ya naya rang aa gaya, ya video baad mein banaya.
 * Pehle iska koi raasta hi nahi tha — dukan wale ko poora maal dobara banana parta
 * tha, aur us par chalte hue order purane product ke saath reh jate.
 *
 * 🔴 Har method mein ownership repository ki query ke andar hai (`supplierId` shart
 * mein), yahan kisi `if` par nahi.
 */

const AddSchema = z
  .object({
    media: z
      .array(
        z
          .object({
            url: z.string().url().max(500),
            type: z.enum(['IMAGE', 'VIDEO']),
            /**
             * Kis rang/size ki tasveer — na ho to poore maal ki.
             *
             * Repository is id ko jaanchti hai (sirf ISI maal ke jorhe qubool): client
             * se aayi id par bharosa kar lete to doosre maal ke variant par tasveer
             * chipkai ja sakti thi.
             */
            variantId: z.string().min(1).nullable().optional(),
          })
          .strict(),
      )
      .min(1)
      .max(MAX_MEDIA_PER_PRODUCT),
  })
  .strict()

/** POST — nayi tasveerein/video lagana (upload pehle /supplier/media par hoti hai). */
export async function POST(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, AddSchema)
    const { productId } = await ctx.params

    await container.supplierCatalogue.addMedia(
      supplier.id,
      productId,
      body.media.map((item) => ({ ...item, isStatusSource: false })),
    )
    return { ok: true, added: body.media.length }
  })
}

const PatchSchema = z.union([
  // Ye tasveer cover/status wali bane
  z.object({ statusSourceId: z.string().min(1).max(40) }).strict(),
  // Tarteeb badli — pehli tasveer catalogue par cover ke baad wali jagah leti hai
  z.object({ order: z.array(z.string().min(1).max(40)).min(1).max(MAX_MEDIA_PER_PRODUCT) }).strict(),
])

export async function PATCH(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, PatchSchema)
    const { productId } = await ctx.params

    if ('statusSourceId' in body) {
      await container.supplierCatalogue.setStatusSource(supplier.id, productId, body.statusSourceId)
      return { ok: true, statusSourceId: body.statusSourceId }
    }

    await container.supplierCatalogue.reorderMedia(supplier.id, productId, body.order)
    return { ok: true, order: body.order }
  })
}

const DeleteSchema = z.object({ mediaId: z.string().min(1).max(40) }).strict()

export async function DELETE(request: Request, ctx: { params: Promise<{ productId: string }> }) {
  return apiHandler(async () => {
    const { supplier } = await requireSupplier()
    const body = await parseBody(request, DeleteSchema)
    const { productId } = await ctx.params

    await container.supplierCatalogue.removeMedia(supplier.id, productId, body.mediaId)
    return { ok: true }
  })
}
