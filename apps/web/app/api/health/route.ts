import { NextResponse } from 'next/server'
import { prisma } from '@oyebazar/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/health — Fly ka darwaza par dastak.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 Is se pehle web par koi health check tha hi NAHI (worker par tha). Fly khud kehta
 * tha: "No health checks found". Us ka matlab ye tha ke agar app HANG ho jaye — DB ka
 * connection atak jaye, memory bhar jaye, event loop ruk jaye — to Fly usay kabhi
 * restart nahi karta. Site mari padi rehti aur pata us waqt chalta jab koi shikayat
 * kare. Aur is karobar mein shikayat aksar aati hi nahi; banda chala jata hai.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 🔴 Ye route jaan boojh kar KAM cheezein dekhta hai.
 *
 * Health check ka kaam ye batana hai ke "kya is machine ko restart karne se faida hoga".
 * Redis band ho, WhatsApp ka provider na chal raha ho, storage sust ho — in mein se kisi
 * par bhi machine restart karne se kuch theek nahi hota, ulta chalte hue safhe bhi mar
 * jate hain. Is liye yahan sirf do cheezein dekhi jati hain:
 *
 *   1. Process jawab de raha hai (yehi route chal jana us ka saboot hai)
 *   2. DB tak pohanch hai — kyunke har safha us par khara hai, aur atka hua Prisma pool
 *      wohi soorat hai jise restart WAQAI theek karta hai
 */

/**
 * DB ka jawab itni der mein aa jana chahiye.
 *
 * 🔴 Ye hadd `fly.web.toml` ke `timeout` se KAM honi chahiye, warna Fly pehle haath
 * khareench leta hai aur hamara apna jawab kabhi nahi banta — jis se logs mein wajah
 * likhi hi nahi jati aur agla banda andhere mein dhoondta hai.
 */
const DB_TIMEOUT_MS = 3_000

export async function GET() {
  const started = Date.now()

  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('db timeout')), DB_TIMEOUT_MS),
      ),
    ])
  } catch (error) {
    /*
     * 503 — "abhi kaam ka nahi hoon". Fly is par pehle traffic rokta hai aur baar baar
     * nakaam hone par machine badalta hai (dekhen fly.web.toml).
     *
     * Wajah jawab mein likhi jati hai: logs se pehle wo yahan nazar aa jati hai, aur
     * raat ko us ek satar se kaafi waqt bach jata hai.
     */
    return NextResponse.json(
      { ok: false, db: 'down', error: error instanceof Error ? error.message : 'unknown' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { ok: true, db: 'up', ms: Date.now() - started },
    { headers: { 'cache-control': 'no-store' } },
  )
}
