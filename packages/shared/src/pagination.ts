/** Cursor-based pagination — offset kabhi nahi (deep pages par Postgres slow ho jata hai). */
export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export function toPage<T>(items: T[], limit: number, getCursor: (item: T) => string): Page<T> {
  // repository hamesha limit + 1 fetch karti hai — is se pata chalta hai ke aage aur hai ya nahi
  const hasMore = items.length > limit
  const page = hasMore ? items.slice(0, limit) : items
  const last = page.at(-1)
  return {
    items: page,
    nextCursor: hasMore && last ? getCursor(last) : null,
  }
}
