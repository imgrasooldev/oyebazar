/** Admin ka intezar — ops rozana bees dafa safha badalti hai, khali screen wahan sab se bura hai. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <div className="h-7 w-40 animate-pulse rounded-card bg-paper-sunken" />
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="card flex items-center justify-between gap-3 p-4">
          <div className="h-3 w-1/3 animate-pulse rounded bg-paper-sunken" />
          <div className="h-3 w-16 animate-pulse rounded bg-paper-sunken" />
        </div>
      ))}
    </div>
  )
}
