'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Maal ki tasveer — aane se pehle chamak (shimmer), aane par narmi se ubharti hui.
 *
 * 🔴 Sasti internet par tasveer aane mein waqt lagta hai, aur is app ki poori jaan
 * tasveerein hi hain. Pehle us intezar mein khali khaana khara rehta tha — aur khali
 * khaana "kuch nahi hai" kehta hai, "aa rahi hai" nahi. Phir tasveer ek jhatke se aa
 * jati thi.
 *
 * Utni hi der lagti hai. Farq sirf itna hai ke ab us der ka jawab screen par mojood hai.
 *
 * `loading="lazy"` pehle se tha aur wohi rehna chahiye: catalogue mein 48 tasveerein
 * hoti hain aur neeche wali tab hi utarti hain jab wahan tak scroll ho — ye us phone
 * par sab se bara faida hai jis par ye safha khulta hai.
 */
export function LazyImage({
  src,
  alt,
  className = '',
  wrapperClassName = '',
  eager = false,
}: {
  src: string
  alt: string
  /** Tasveer par khud lagne wali classes */
  className?: string
  /** Bahar wale khane par — shakl (aspect, rounding) yahin se aati hai */
  wrapperClassName?: string
  /**
   * Pehli nazar mein aane wali tasveer (misal safhe ke upar ki).
   * `lazy` un par ulta nuqsan hai: browser unhen bhi der se maangta hai.
   */
  eager?: boolean
}) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement>(null)

  /*
   * Cache wali tasveer `onLoad` se PEHLE aa chuki hoti hai (خاص کر peechay jane par).
   * Us soorat mein hum hamesha ke liye chamak dikhate rehte — is liye pehli render ke
   * baad ek dafa khud poochh lete hain ke tasveer mukammal hai ya nahi.
   */
  useEffect(() => {
    if (ref.current?.complete) setLoaded(true)
  }, [])

  return (
    <span className={`${wrapperClassName} ${loaded ? '' : 'shimmer'} block`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs; next/image Phase 2 */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        // Tasveer ka decode main thread ko na rokay — scroll atakta hai warna
        decoding="async"
        onLoad={() => setLoaded(true)}
        /*
         * Tasveer na aaye (link toot gaya) to bhi chamak band — warna wo khana hamesha
         * chamakta rehta hai aur banda samajhta hai ke abhi aa rahi hai.
         */
        onError={() => setLoaded(true)}
        className={`fade-media ${loaded ? 'loaded' : ''} ${className}`}
      />
    </span>
  )
}
