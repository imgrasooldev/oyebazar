/** Dukan ke portal ka intezar — qatarein wahin jahan asli qatarein aayengi. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-44 animate-pulse rounded-card bg-paper-sunken" />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="card flex items-center gap-3 p-3">
          <div className="h-14 w-14 shrink-0 animate-pulse rounded-card bg-paper-sunken" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-paper-sunken" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-paper-sunken" />
          </div>
        </div>
      ))}
    </div>
  )
}
