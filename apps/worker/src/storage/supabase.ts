import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ObjectStorage, StoredObject } from '@oyebazar/core'

/**
 * Supabase Storage adapter (aap ka mojooda subscription).
 *
 * Kal agar egress mehnga par gaya to Cloudflare R2 par jana ek nayi class ka kaam hai —
 * service layer ko khabar bhi nahi hogi. Yehi GOLDEN RULE #5 ka faida hai.
 */
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
