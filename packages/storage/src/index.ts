/**
 * @oyebazar/storage — `ObjectStorage` port ke peechay ki duniya.
 *
 * GOLDEN RULE #5: koi service seedha SDK call nahi karti. Aaj Supabase Storage hai,
 * kal egress mehnga par gaya to R2 — us waqt sirf ye package badlega.
 *
 * Ye package do jagah chalta hai aur yehi is ke alag hone ki wajah hai:
 *  · worker  — status pack render kar ke yahan rakhta hai
 *  · web     — wholesaler ki upload ki hui tasveerein aur videos yahan jati hain
 *
 * Pehle ye adapters sirf `apps/worker` mein the. Web ko upload chahiye tha to nakal
 * karne ka raasta khula tha — aur nakal ka anjaam hamesha yehi hota hai ke kal koi
 * bucket ya cache header ek jagah badalta hai aur doosri jagah purana reh jata hai.
 */
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join, normalize, sep } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ObjectStorage, StoredObject } from '@oyebazar/core'

export { sniffMimeType, resolveMimeType } from './sniff'

/**
 * DEV storage — file `apps/web/public/_dev-media/` mein likhti hai, jahan se Next.js
 * usay seedha serve kar deta hai. Koi cloud account chahiye hi nahi.
 */
export class LocalDiskStorage implements ObjectStorage {
  constructor(
    private readonly directory: string,
    private readonly baseUrl: string,
  ) {}

  async upload(key: string, body: Buffer): Promise<StoredObject> {
    const path = this.resolve(key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, body)
    return { key, url: this.publicUrl(key) }
  }

  publicUrl(key: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${key}`
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true })
  }

  /**
   * 🔴 Key ko directory ke andar hi rakhta hai.
   *
   * Render ki keys hamesha hamari apni banayi hui hoti hain, magar ab upload wala
   * raasta bhi isi class par aata hai. `../../` wali key se disk par kahin bhi likha
   * ja sakta tha — is liye shart yahan hai, har caller par nahi chhori.
   */
  private resolve(key: string): string {
    const path = normalize(join(this.directory, key))
    const root = normalize(this.directory)
    if (path !== root && !path.startsWith(root.endsWith(sep) ? root : root + sep)) {
      throw new Error(`Storage key directory se bahar ja rahi hai: ${key}`)
    }
    return path
  }
}

/** Production storage (aap ka mojooda Supabase subscription). */
export class SupabaseStorage implements ObjectStorage {
  private readonly client: SupabaseClient

  constructor(
    url: string,
    serviceKey: string,
    private readonly bucket: string,
  ) {
    this.client = createClient(url, serviceKey, { auth: { persistSession: false } })
  }

  async upload(key: string, body: Buffer, contentType = 'image/png'): Promise<StoredObject> {
    const { error } = await this.client.storage.from(this.bucket).upload(key, body, {
      contentType,
      // wohi cache key dobara aaye to overwrite — render deterministic hai
      upsert: true,
      cacheControl: '31536000',
    })

    if (error) throw new Error(`Supabase upload fail: ${error.message}`)
    return { key, url: this.publicUrl(key) }
  }

  publicUrl(key: string): string {
    return this.client.storage.from(this.bucket).getPublicUrl(key).data.publicUrl
  }

  async remove(key: string): Promise<void> {
    await this.client.storage.from(this.bucket).remove([key])
  }
}

export type StorageConfig =
  | { readonly kind: 'local'; readonly directory: string; readonly publicUrl: string }
  | {
      readonly kind: 'supabase'
      readonly url: string
      readonly serviceKey: string
      readonly bucket: string
    }

export function createStorage(config: StorageConfig): ObjectStorage {
  return config.kind === 'supabase'
    ? new SupabaseStorage(config.url, config.serviceKey, config.bucket)
    : new LocalDiskStorage(config.directory, config.publicUrl)
}

/**
 * `.env` se storage ka faisla — web aur worker dono yahi function bulate hain.
 *
 * SUPABASE_URL aur SUPABASE_SERVICE_KEY dono ho to cloud, warna local disk. Aadha
 * bhara hua config (sirf URL, key nahi) jaan boojh kar local par girta hai: upload
 * chalta rehta hai aur naya developer atakta nahi.
 */
export function storageConfigFrom(
  env: NodeJS.ProcessEnv,
  fallbackDirectory: string,
): StorageConfig {
  const url = nonEmpty(env['SUPABASE_URL'])
  const serviceKey = nonEmpty(env['SUPABASE_SERVICE_KEY'])

  if (url && serviceKey) {
    return { kind: 'supabase', url, serviceKey, bucket: env['SUPABASE_BUCKET'] ?? 'status-packs' }
  }

  return {
    kind: 'local',
    directory: env['LOCAL_MEDIA_DIR'] ?? fallbackDirectory,
    publicUrl: env['R2_PUBLIC_URL'] ?? 'http://localhost:3000/_dev-media',
  }
}

function nonEmpty(value: string | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined
}
