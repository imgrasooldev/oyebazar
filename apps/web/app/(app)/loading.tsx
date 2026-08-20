/**
 * Reseller portal ka intezar wala safha.
 *
 * 🔴 Is ke baghair click par KUCH nahi hota tha: banda dabata tha, safha wahin khara
 * rehta tha, aur do second baad naya safha aa jata. Wo do second "app tooti hui hai"
 * jaise mehsoos hote hain — halanke kaam ho raha hota hai.
 *
 * Next is file ko dekhte hi navigation par foran dikha deta hai. Koi spinner nahi:
 * dhaanche ki shakl (headings aur cards ke khaali dabbe) batati hai ke aage kya aane
 * wala hai, aur safha aane par cheezein apni jagah par hi utarti hain.
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
