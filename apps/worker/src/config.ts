import { z } from 'zod'

/**
 * Env config — boot par ek hi baar validate hota hai.
 * Ghalat config par worker foran mar jata hai, aadhe raste mein nahi (jab 10,000 jobs qatar mein hon).
 */
const ConfigSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  redisUrl: z.string().min(1).optional(),
  /** Playwright contexts — CPU cores × 1.5, max 8 (memory ~80MB per context) */
  renderConcurrency: z.coerce.number().int().min(1).max(8).default(4),
  healthPort: z.coerce.number().int().default(8080),
  storage: z.discriminatedUnion('kind', [
    z.object({
      kind: z.literal('local'),
      /** dev: apps/web/public/_dev-media — image seedha localhost:3000 se serve hoti hai */
      directory: z.string(),
      publicUrl: z.string(),
    }),
    z.object({
      kind: z.literal('supabase'),
      url: z.string().url(),
      serviceKey: z.string().min(1),
      bucket: z.string().min(1),
    }),
  ]),
})

export type WorkerConfig = z.infer<typeof ConfigSchema>

/** `.env` mein khali qeemat ka matlab "set nahi hai" — warna `REDIS_URL=""` validation torta hai. */
function optional(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined
}

export function loadConfig(cwd: string): WorkerConfig {
  const useSupabase = Boolean(
    optional(process.env.SUPABASE_URL) && optional(process.env.SUPABASE_SERVICE_KEY),
  )

  return ConfigSchema.parse({
    nodeEnv: process.env.NODE_ENV,
    redisUrl: optional(process.env.REDIS_URL),
    renderConcurrency: process.env.RENDER_CONCURRENCY,
    healthPort: process.env.PORT,
    storage: useSupabase
      ? {
          kind: 'supabase',
          url: process.env.SUPABASE_URL,
          serviceKey: process.env.SUPABASE_SERVICE_KEY,
          bucket: process.env.SUPABASE_BUCKET ?? 'status-packs',
        }
      : {
          kind: 'local',
          directory: process.env.LOCAL_MEDIA_DIR ?? `${cwd}/../web/public/_dev-media`,
          publicUrl: process.env.R2_PUBLIC_URL ?? 'http://localhost:3000/_dev-media',
        },
  })
}
