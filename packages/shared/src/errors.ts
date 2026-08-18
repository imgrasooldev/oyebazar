/**
 * Domain errors — HTTP se azad. API layer inhen status codes par map karti hai
 * (apps/web/lib/api/error-handler.ts), core inhen throw karta hai.
 *
 * Wire format hamesha: { error: { code, message, details? } }
 */

export type AppErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'NOT_REGISTERED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INVALID_STATE_TRANSITION'
  | 'OUT_OF_STOCK'
  | 'NOT_IMPLEMENTED'
  | 'INTERNAL'

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly details?: unknown

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = new.target.name
    this.code = code
    this.details = details
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, details: this.details } }
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Input theek nahi hai', details?: unknown) {
    super('VALIDATION_FAILED', message, details)
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = 'Pehle login karen') {
    super('UNAUTHENTICATED', message)
  }
}

/**
 * Number theek hai, code bhi theek — magar is number ka account abhi hai hi nahi.
 *
 * Alag error is liye ke ye ghalti nahi hoti: login safha isi code par register ka form
 * khol deta hai. UNAUTHENTICATED bhejte to user ko "kuch galat hai" jaisa lagta, halanke
 * usay sirf naam aur sheher batana hai.
 */
export class NotRegisteredError extends AppError {
  constructor(message = 'Ye number abhi register nahi hai') {
    super('NOT_REGISTERED', message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Ijazat nahi hai') {
    super('FORBIDDEN', message)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super('NOT_FOUND', id ? `${resource} nahi mila (${id})` : `${resource} nahi mila`)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONFLICT', message, details)
  }
}

export class RateLimitedError extends AppError {
  constructor(
    message = 'Bohat zyada koshishen. Thori dair baad dobara try karen',
    readonly retryAfterMs?: number,
  ) {
    super('RATE_LIMITED', message, { retryAfterMs })
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super('INVALID_STATE_TRANSITION', `Order ${from} se ${to} par nahi ja sakta`, { from, to })
  }
}

export class OutOfStockError extends AppError {
  constructor(details?: unknown) {
    super('OUT_OF_STOCK', 'Ye item is waqt mojood nahi hai', details)
  }
}

export class NotImplementedError extends AppError {
  constructor(what: string) {
    super('NOT_IMPLEMENTED', `${what} abhi available nahi hai`)
  }
}
