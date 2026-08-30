'use client'

import { useState } from 'react'
import { SparkIcon } from '@/components/icons'

type Draft = {
  titleUr: string
  titleEn: string
  descriptionUr: string
  categorySlug: string | null
}

/**
 * "Tasveer se bhar do" — dukan wale ke liye.
 *
 * 🔴 Ye feature kis MASLE ke liye hai:
 *
 * Bolton Market ka thok wala tasveer khainchna jaanta hai; us ke phone mein sau
 * tasveerein pari hain. Jo wo NAHI karta wo hai har maal ka Urdu naam, angrezi naam,
 * tafseel aur category likhna — chaar khaane, chalees maal, ek sau saath khaane. Wo
 * teesre maal par safha band kar deta hai, aur hamari supply wahin ruk jati hai.
 *
 * 🔴 Jawab MASHWARA hai, faisla nahi. Khaane bhar jate hain aur dukan wala unhen badal
 * sakta hai; kuch mehfooz nahi hota jab tak wo khud "Save" na dabaye. Seedha mehfooz
 * karna do wajah se ghalat hota: model ghalti karta hai (aur us ghalti par DUKAN ka
 * naam chhapta hai), aur us ka apna ilm hamesha behtar hai — maal us ke haath mein hai.
 *
 * 🔴 Nakaami par KUCH nahi hota — koi khaana nahi badalta. Ye jaan boojh kar hai:
 * dukan wala waise hi haath se likhta rehta hai jaise wo pehle likhta tha, aur wo
 * bilkul wohi surat hai jo is button se pehle thi. Adhoora bharna is se kahin bura
 * hota: wo dekhta ke khaane bhar gaye, "Save" dabata, aur maal adhoore naam ke saath
 * catalogue par chala jata.
 */
export function DescribeFromPhoto({
  imageUrl,
  hint,
  onDraft,
  labels,
}: {
  /** Pehli tasveer — na ho to button dikhta hi nahi */
  imageUrl: string | null
  /**
   * Dukan wale ka apna ishara, DABANE KE WAQT parha jata hai.
   *
   * 🔴 Ye function hai, string nahi. Khaana uncontrolled hai (dekhen add-product form),
   * yani us ki mojooda qeemat sirf usi lamhe DOM se milti hai. String lene ka matlab
   * hota ke hum wo qeemat pakar lete jo render ke waqt thi — aur wo aksar khali hoti,
   * kyunke dukan wala tasveer chadhane ke BAAD likhta hai.
   */
  hint: () => string
  onDraft: (draft: Draft) => void
  labels: {
    action: string
    working: string
    failed: string
    note: string
  }
}) {
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)

  /*
   * Tasveer na ho to KUCH nahi dikhta.
   *
   * Button ko band (disabled) dikhana bhi ek rasta tha, magar us se dukan wala usay
   * dabata hai, kuch nahi hota, aur wajah dhoondhta hai. Jo cheez abhi kaam nahi kar
   * sakti, us ka behtar jawab uska na hona hai.
   */
  if (!imageUrl) return null

  async function describe() {
    setPending(true)
    setFailed(false)

    try {
      const response = await fetch('/api/v1/supplier/products/describe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          ...(hint().trim() ? { hint: hint().trim() } : {}),
        }),
      })

      if (!response.ok) {
        setFailed(true)
        return
      }

      const draft = (await response.json()) as Draft | null
      if (!draft?.titleEn) {
        setFailed(true)
        return
      }
      onDraft(draft)
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="rounded-card bg-paper-sunken p-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => void describe()}
          className="inline-flex min-h-tap items-center gap-2 rounded-pill bg-coal-900 px-4 text-[0.8rem] font-semibold text-white transition hover:bg-coal-900/85 disabled:opacity-60"
        >
          <SparkIcon className="h-4 w-4 text-brand-300" />
          {pending ? labels.working : labels.action}
        </button>

        {/*
          🔴 Ye jumla button ke SAATH hai, dabane ke baad nahi.

          Dukan wale ko pehle se maloom hona chahiye ke jo aayega wo badla ja sakta hai.
          Baad mein batane ka matlab hota ke wo pehli dafa bhar kar seedha "Save" daba
          deta — aur us ek dafa ki ghalti us ke apne naam se catalogue par chhap jati.
        */}
        <span className="min-w-0 flex-1 text-[0.74rem] leading-snug text-ink-faint">
          {labels.note}
        </span>
      </div>

      {failed && <p className="mt-2 text-[0.76rem] text-red-600">{labels.failed}</p>}
    </div>
  )
}
