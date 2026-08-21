/**
 * Bazaar ka intezar — khaane wahin jahan asli maal aayega.
 *
 * 🔴 Public safhon par ye tha hi nahi. Ye wo safhe hain jo Google se aate hain aur
 * jinhen pehli dafa aane wala banda kholta hai — us ke liye khali safhe par kuch
 * second khare rehna "site khuli hi nahi" ke barabar hai, aur wo peechay chala jata
 * hai. Skeleton jhoot nahi bolta: wo wohi shakl dikhata hai jo aane wali hai.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-shell px-5 py-8 lg:px-8" aria-busy="true" aria-live="polite">
      {/* Upar ka unwan */}
      <div className="h-8 w-56 animate-pulse rounded-card bg-paper-sunken" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-paper-sunken" />

      {/* Categories ki patti */}
      <div className="mt-7 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="h-9 w-24 shrink-0 animate-pulse rounded-pill bg-paper-sunken"
          />
        ))}
      </div>

      {/* Maal ke card — utne hi jitne asal mein aate hain */}
      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => (
          <div key={index} className="card overflow-hidden p-2.5">
            <div className="aspect-square animate-pulse rounded-card bg-paper-sunken" />
            <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-paper-sunken" />
            <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-paper-sunken" />
          </div>
        ))}
      </div>
    </div>
  )
}
