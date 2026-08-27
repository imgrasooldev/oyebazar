/**
 * Maal ka safha — do khaane, jaise asal safhe par.
 *
 * 🔴 Ye safha portal ka sab se BHAARI hai (tasveer, rate ka slider, aur pack banane ka
 * poora studio), yani yahan intezar sab se zyada mehsoos hota hai. Aur reseller yahan
 * roz aati hai — har maal par.
 *
 * Do khaane isi liye ke asal safha bhi do khaane ka hai: baen taraf tasveer, daen taraf
 * kaam. Skeleton usi tarteeb mein rakhne se safha aane par cheezein apni jagah par
 * UTARTI hain, jagah badal kar nahi.
 */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-4 w-24 animate-pulse rounded bg-paper-sunken" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="aspect-square animate-pulse bg-paper-sunken" />
          <div className="space-y-3 p-5">
            <div className="h-3 w-28 animate-pulse rounded bg-paper-sunken" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-paper-sunken" />
            <div className="h-4 w-40 animate-pulse rounded bg-paper-sunken" />
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="h-24 animate-pulse bg-paper-sunken" />
          <div className="space-y-4 p-5">
            <div className="h-8 w-40 animate-pulse rounded bg-paper-sunken" />
            <div className="h-2 w-full animate-pulse rounded-pill bg-paper-sunken" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 animate-pulse rounded-card bg-paper-sunken" />
              <div className="h-16 animate-pulse rounded-card bg-paper-sunken" />
            </div>
            <div className="h-12 w-full animate-pulse rounded-pill bg-paper-sunken" />
          </div>
        </div>
      </div>
    </div>
  )
}
