import { ForbiddenError } from '@oyebazar/shared'
import { container } from '../container'

/**
 * Ops endpoints ka darwaza — Phase 1 mein ek shared API key.
 *
 * ⚠ Ye ARZI hai. Phase 1 mein ops console Retool hai aur us ke paas ek hi key hoti hai;
 * poora OpsUser login banane se 1–2 hafte jate, jo abhi kisi kaam ka nahi.
 *
 * Jo cheezein isay qabool-e-bardasht rakhti hain:
 *  · key sirf server par (Retool ke secrets mein), browser mein kabhi nahi
 *  · comparison timing-safe hai
 *  · koi key set na ho to endpoints BAND hain (khula chhorna sab se bura anjaam hai)
 *
 * 🔴 Jab ops team 3 logon se barhe ya paisa ke endpoints kisi aur ko dene hon, tab
 * `OpsUser` + session wala login banana LAZMI hai — kis ne kya kiya, ye pata chalna chahiye.
 */
export function requireOpsKey(request: Request): void {
  const expected = process.env.OPS_API_KEY

  if (!expected) {
    // Fail closed — key na hone par ops endpoints band
    throw new ForbiddenError('Ops API abhi configure nahi hui')
  }

  const provided = request.headers.get('x-ops-key') ?? ''
  if (!container.tokens.verifyHash(provided, container.tokens.hash(expected))) {
    throw new ForbiddenError('Ops key theek nahi')
  }
}

/** Har ops harkat kis ke naam par hui — abhi header se, baad mein OpsUser session se. */
export function opsActorId(request: Request): string {
  return request.headers.get('x-ops-user')?.slice(0, 60) || 'ops'
}
