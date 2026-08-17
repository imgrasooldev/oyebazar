import { mkdir, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ObjectStorage, StoredObject } from '@oyebazar/core'

/**
 * DEV storage — image `apps/web/public/_dev-media/` mein likhti hai, jahan se
 * Next.js usay seedha serve kar deta hai. Koi cloud account chahiye hi nahi.
 *
 * Production mein SupabaseStorage chalti hai — service ko farq nahi parta (dono ObjectStorage hain).
 */
export class LocalDiskStorage implements ObjectStorage {
  constructor(
    private readonly directory: string,
    private readonly baseUrl: string,
  ) {}

  async upload(key: string, body: Buffer): Promise<StoredObject> {
    const path = join(this.directory, key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, body)
    return { key, url: this.publicUrl(key) }
  }

  publicUrl(key: string): string {
    return `${this.baseUrl.replace(/\/$/, '')}/${key}`
  }

  async remove(key: string): Promise<void> {
    await rm(join(this.directory, key), { force: true })
  }
}
