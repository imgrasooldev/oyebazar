/**
 * Product media ke qawaid — kya upload ho sakta hai aur kitna bara.
 *
 * Ye constants shared mein isliye hain ke DONO taraf inhi ki zaroorat hai: browser
 * file chunte hi bata de ("ye video 50MB se bari hai") aur server phir se jaanche.
 * Client wali jaanch sirf mehrbani hai — asli faisla hamesha server par hota hai,
 * kyunke browser ko darmiyan se nikal kar seedha API par bhejna aasan hai.
 *
 * 🔴 Naap ka faisla Sadia aur dukan wale ke internet par hai, hamari disk par nahi.
 * Ek 4K video mobile data par upload hote hote hi hooked chala jata hai; 50MB par
 * hadd is liye hai ke phone ka apna camera clip usually is se neeche rehta hai.
 */

export type MediaKind = 'IMAGE' | 'VIDEO'

/** MIME → file extension. Extension hum khud lagate hain, client ke naam se nahi. */
export const MEDIA_MIME_TYPES = {
  'image/jpeg': { kind: 'IMAGE', extension: 'jpg' },
  'image/png': { kind: 'IMAGE', extension: 'png' },
  'image/webp': { kind: 'IMAGE', extension: 'webp' },
  'video/mp4': { kind: 'VIDEO', extension: 'mp4' },
  'video/quicktime': { kind: 'VIDEO', extension: 'mov' },
  'video/webm': { kind: 'VIDEO', extension: 'webm' },
} as const satisfies Record<string, { kind: MediaKind; extension: string }>

export type MediaMimeType = keyof typeof MEDIA_MIME_TYPES

export const MEDIA_LIMITS = {
  IMAGE: { maxBytes: 8 * 1024 * 1024 },
  VIDEO: { maxBytes: 50 * 1024 * 1024 },
} as const satisfies Record<MediaKind, { maxBytes: number }>

/** Ek product par kitni cheezein — is se zyada par form khud hi bojh ban jata hai. */
export const MAX_MEDIA_PER_PRODUCT = 8

/** `<input accept>` ke liye — dono jagah ek hi list se bane. */
export const MEDIA_ACCEPT_ATTRIBUTE = Object.keys(MEDIA_MIME_TYPES).join(',')

export function isSupportedMime(mime: string): mime is MediaMimeType {
  return mime in MEDIA_MIME_TYPES
}

export function mediaKindOf(mime: MediaMimeType): MediaKind {
  return MEDIA_MIME_TYPES[mime].kind
}

export function mediaExtensionOf(mime: MediaMimeType): string {
  return MEDIA_MIME_TYPES[mime].extension
}

export function maxBytesFor(mime: MediaMimeType): number {
  return MEDIA_LIMITS[mediaKindOf(mime)].maxBytes
}

/** UI ke liye: 8388608 → "8 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
}
