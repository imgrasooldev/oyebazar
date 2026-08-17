import { PrismaClient } from '@prisma/client'

/**
 * Prisma singleton. Next.js dev mein hot-reload par har baar naya client banta hai
 * aur Neon ke connections khatam ho jate hain — isliye globalThis par cache.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export type { PrismaClient }
