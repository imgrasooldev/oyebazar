/**
 * Google par kya likha aaye — dono khaane, dono marzi ke.
 *
 * `null` ka matlab "hata do" hai: safha wapas apna bana hua unwan istemal karega.
 */
export interface SeoTextInput {
  readonly seoTitle: string | null
  readonly seoDescription: string | null
}

