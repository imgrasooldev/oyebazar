'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Pack ko seedha WhatsApp / Instagram / Facebook par bhejna.
 *
 * 🔴 Ye phone ka APNA share sheet kholta hai — hum kisi platform se jurte nahi.
 *
 * Wajah sirf sahulat nahi, ek pakki hadd hai: WhatsApp ke official API mein Status ka
 * koi darwaza hai HI nahi. Jo log "status automation" bechte hain wo ghair-sarkari
 * libraries chalate hain, jin ka anjaam number ka BAN hai — aur reseller ka number hi us
 * ka poora karobar hai, us ke saare customer usi par hain. Us khatre ke muqable mein do
 * tap kuch bhi nahi.
 *
 * Aur is ek button se teenon jagah ho jati hain: Status, Instagram, Facebook — jo bhi us
 * ke phone par laga hua ho. Na koi token hamare paas, na koi App Review, na kisi ke
 * account ka ikhtiyar hamare zimme.
 */
export function SharePackButton({
  packId,
  caption,
  label,
  onShared,
}: {
  packId: string
  /** Saath jane wala matn — kuch app ise saath rakhte hain, kuch sirf tasveer bhejte hain */
  caption: string
  label: string
  /** Wohi ginti jo download par chalti hai — share bhi "istemal hua" hai */
  onShared: () => void
}) {
  const [supported, setSupported] = useState(false)
  const [busy, setBusy] = useState(false)

  /*
   * Tasveer pehle se utaar li jati hai — click ka INTEZAR nahi kiya jata.
   *
   * 🔴 `navigator.share()` sirf us lamhe chalta hai jo user ke apne tap se juda ho. Agar
   * hum click ke BAAD tasveer utarne lagen, to wo rishta toot jata hai (khaas kar iPhone
   * par) aur browser share sheet kholne se mana kar deta — bilkul khamoshi se. Is liye
   * ungli lagte hi (`pointerdown`) file banni shuru ho jati hai, aur click ke waqt wo
   * aksar tayyar mil jati hai.
   */
  const file = useRef<File | null>(null)
  const fetching = useRef<Promise<File | null> | null>(null)

  useEffect(() => {
    /*
     * Sahara hai ya nahi — asli File se jaancha jata hai.
     *
     * Sirf `navigator.share` ka hona kaafi nahi: bohat se computer browser matn to
     * share kar lete hain magar FILE nahi. Un par ye button laga dena reseller ko us
     * raste par bhejna hai jo us ke yahan hai hi nahi.
     */
    try {
      const probe = new File([new Blob([''])], 'p.jpg', { type: 'image/jpeg' })
      setSupported(Boolean(navigator.canShare?.({ files: [probe] })))
    } catch {
      setSupported(false)
    }
  }, [])

  function warm() {
    if (file.current || fetching.current) return
    fetching.current = fetch(`/api/v1/status-pack/${packId}/image`)
      .then(async (res) => {
        if (!res.ok) return null
        const blob = await res.blob()
        const made = new File([blob], `oyebazar-${packId}.jpg`, {
          type: blob.type || 'image/jpeg',
        })
        file.current = made
        return made
      })
      .catch(() => null)
  }

  async function share() {
    setBusy(true)
    warm()
    const ready = file.current ?? (await fetching.current)
    setBusy(false)

    if (!ready) return

    try {
      await navigator.share({ files: [ready], text: caption })
      onShared()
    } catch {
      /*
       * Yahan khamoshi jaan boojh kar hai.
       *
       * Share sheet band karna sab se aam soorat hai, aur wo GHALTI nahi — banda apna
       * irada badal deta hai. Us par laal paighaam dikhana usay ye batata hai ke kuch
       * toot gaya, jabke sab theek hua.
       */
    }
  }

  if (!supported) return null

  return (
    <button
      type="button"
      onPointerDown={warm}
      onClick={() => void share()}
      disabled={busy}
      className="btn-primary w-full !py-2 text-[0.8rem] disabled:opacity-60"
    >
      <ShareIcon className="h-4 w-4" />
      {busy ? '…' : label}
    </button>
  )
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3v13M12 3l-4 4M12 3l4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
