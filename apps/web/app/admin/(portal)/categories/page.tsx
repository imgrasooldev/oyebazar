import type { Metadata } from 'next'
import { canDo, MAX_CATEGORY_DEPTH } from '@oyebazar/core'
import { CategoryTreeEditor } from '@/components/category-tree-editor'
import { requireOpsUser } from '@/lib/api/admin-session'
import { container } from '@/lib/container'

export const metadata: Metadata = {
  title: 'Categories · Admin',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Category ka darakht.
 *
 * Pehle categories sirf seed mein thin: nayi shaakh ka matlab tha code badlo, review
 * karao, deploy karo. Is karobar mein ye ghalat hai — "Eid Sale" ya "Winter Collection"
 * us din chahiye hoti hai jis din bazaar mein aati hai, agle sprint mein nahi.
 *
 * Gehrai ki hadd hai magar do darjay se bohot zyada: sab kuch `path` par chalta hai,
 * is liye "is shaakh ka saara maal" har darje par ek hi shart hai.
 */
export default async function AdminCategoriesPage() {
  const { user } = await requireOpsUser()
  const tree = await container.categoryAdmin.tree()

  const total = countAll(tree)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.4rem] font-bold tracking-tight">Categories</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">
          {total} categories, up to {MAX_CATEGORY_DEPTH + 1} levels deep. Renaming is safe —
          the URL slug never changes, so old WhatsApp links keep working.
        </p>
      </div>

      <CategoryTreeEditor tree={tree} canManage={canDo(user.role, 'manageCategories')} />
    </div>
  )
}

function countAll(nodes: readonly { children: readonly unknown[] }[]): number {
  return nodes.reduce(
    (sum, node) => sum + 1 + countAll(node.children as readonly { children: readonly unknown[] }[]),
    0,
  )
}
