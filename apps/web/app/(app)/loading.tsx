/**
 * Reseller portal ka intezar wala safha — SAARE safhon ka sanjha.
 *
 * 🔴 Is ke baghair click par KUCH nahi hota tha: banda dabata tha, safha wahin khara
 * rehta tha, aur do second baad naya safha aa jata. Wo do second "app tooti hui hai"
 * jaise mehsoos hote hain — halanke kaam ho raha hota hai.
 *
 * 🔴 Aur ye ab NEUTRAL hai — pehle yahan catalogue ke card ka grid tha, jo `/orders`,
 * `/money`, `/templates` aur `/dashboard` par bhi chhap jata tha. Ghalat shakl ka
 * skeleton koi shakl na hone se bura hai: aankh us dhanche par jam jati hai jo aane
 * wala hai, aur safha aate hi sab kuch JHATKE se badal jata hai. Wo jhatka banda "app
 * atak gayi" parhta hai.
 *
 * Yahan sirf wo hissa hai jo har safhe par waqai ek jaisa hai: unwan, ek line, aur kuch
 * qatarein. Jis safhe ki apni shakl ahem hai (catalogue, maal ka safha, order) us ki
 * apni `loading.tsx` hai.
 */
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div>
        <div className="h-7 w-56 animate-pulse rounded-card bg-paper-sunken" />
        <div className="mt-2 h-4 w-72 max-w-full animate-pulse rounded bg-paper-sunken" />
      </div>

      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="card space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 shrink-0 animate-pulse rounded-card bg-paper-sunken" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3.5 w-1/3 animate-pulse rounded bg-paper-sunken" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-paper-sunken" />
            </div>
          </div>
          <div className="h-3 w-full animate-pulse rounded bg-paper-sunken" />
        </div>
      ))}
    </div>
  )
}
