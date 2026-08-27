/**
 * Customer ke pate wale safhe ka intezar.
 *
 * 🔴 Ye safha `(public)` group se BAHAR hai (taake us par marketplace ka header na aaye),
 * aur us group ka `loading.tsx` saath nahi aaya — yani yahan intezar mein bilkul KHALI
 * safed safha aata tha.
 *
 * Aur ye theek wo shakhs hai jo sab se kam intezar karta hai: na wo hamein jaanta hai,
 * na us ne ye app chuni hai. Us ne WhatsApp par ek link daba diya hai. Khali safed safha
 * "link toota hua hai" parha jata hai, aur wo wapas chala jata hai — aur us ke saath us
 * reseller ka order bhi jata hai jis ne link bheja tha.
 */
export default function Loading() {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-8" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-40 animate-pulse rounded bg-paper-sunken" />
        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-paper-sunken" />
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-card bg-paper-raised p-3 shadow-soft">
        <div className="h-16 w-16 shrink-0 animate-pulse rounded-card bg-paper-sunken" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-paper-sunken" />
          <div className="h-4 w-24 animate-pulse rounded bg-paper-sunken" />
        </div>
      </div>

      {/* Teen khaane — naam, number, pata — jaise asal form mein */}
      <div className="mt-6 space-y-4">
        {[3.5, 3.5, 6].map((height, index) => (
          <div key={index} className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-paper-sunken" />
            <div
              className="w-full animate-pulse rounded-card bg-paper-sunken"
              style={{ height: `${height}rem` }}
            />
          </div>
        ))}
      </div>
    </main>
  )
}
