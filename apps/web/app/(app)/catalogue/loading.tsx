/**
 * Catalogue ka apna intezar — maal ke card ki shakl mein.
 *
 * 🔴 Ye pehle group wale `loading.tsx` mein tha, yani `/orders`, `/money`, `/templates`
 * aur `/dashboard` par bhi CATALOGUE ka skeleton dikhta tha.
 *
 * Ghalat shakl ka skeleton koi shakl na hone se BURA hai: aankh us dhanche par jam jati
 * hai jo aane wala hai, aur phir safha aate hi sab kuch jhatke se badal jata hai. Us
 * jhatke ko banda "app atak gayi" parhta hai — halanke sab theek hua.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="h-7 w-48 animate-pulse rounded-card bg-paper-sunken" />
      <div className="h-11 w-full max-w-xl animate-pulse rounded-pill bg-paper-sunken" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => (
          <div key={index} className="card overflow-hidden">
            <div className="aspect-square animate-pulse bg-paper-sunken" />
            <div className="space-y-2 p-3">
              <div className="h-3 w-full animate-pulse rounded bg-paper-sunken" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-paper-sunken" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
