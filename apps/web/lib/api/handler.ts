/**
 * API layer helpers.
 *
 * Har route handler `apiHandler` se guzarta hai taake:
 *  · domain errors sahih HTTP status par map hon
 *  · wire format hamesha ek jaisa rahe: { error: { code, message, details? } }
 *  · stack trace kabhi client tak na jaye
 */
import { NextResponse } from 'next/server'
import { ZodError, type ZodTypeAny, type z } from 'zod'
import { AppError, ValidationError, type AppErrorCode } from '@oyebazar/shared'
import { container } from '../container'

const STATUS_BY_CODE: Record<AppErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  // Account mojood hi nahi — client is par register ka form kholta hai
  NOT_REGISTERED: 404,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INVALID_STATE_TRANSITION: 409,
  OUT_OF_STOCK: 409,
  NOT_IMPLEMENTED: 501,
  INTERNAL: 500,
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    /*
     * 🔴 Paighaam mein wo khaana likha jata hai jo galat hai.
     *
     * Pehle sirf "Input theek nahi hai" jata tha. Dukan wala bees khaanon wala form bhar
     * kar Add dabata, ye ek jumla milta, aur usay pata hi nahi chalta ke kya theek karna
     * hai — na naam, na qatar ka number. Aksar wo poora form dobara bharta, wohi ghalti
     * karta, aur teesri baar chhor kar chala jata.
     *
     * `issues` ka `path` hi asal khabar hai: `variants.2.size` yani "teesri qatar ka size".
     */
    const first = error.issues[0]
    const where = first?.path.join(' → ')
    const message = where ? `${where}: ${first?.message}` : 'Input theek nahi hai'

    const validation = new ValidationError(message, error.flatten().fieldErrors)
    return NextResponse.json(validation.toJSON(), { status: 400 })
  }

  if (error instanceof AppError) {
    return NextResponse.json(error.toJSON(), { status: STATUS_BY_CODE[error.code] })
  }

  container.logger.error('unhandled_api_error', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  })

  return NextResponse.json(
    { error: { code: 'INTERNAL', message: 'Kuch masla ho gaya. Dobara koshish karen' } },
    { status: 500 },
  )
}

export async function apiHandler<T>(work: () => Promise<T>): Promise<NextResponse> {
  try {
    return NextResponse.json(await work())
  } catch (error) {
    return apiError(error)
  }
}

/** Query string ko Zod schema se parse karta hai (raw searchParams kabhi use na karen). */
export function parseQuery<S extends ZodTypeAny>(request: Request, schema: S): z.infer<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries())
  return schema.parse(params)
}

export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  const raw: unknown = await request.json().catch(() => {
    throw new ValidationError('Body JSON nahi hai')
  })
  return schema.parse(raw)
}

/** Rate limiting ke liye client IP — Fly.io proxy ke peechay. */
export function clientIp(request: Request): string {
  return (
    request.headers.get('fly-client-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}
