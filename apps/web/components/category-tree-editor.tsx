'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { CategoryNode } from '@oyebazar/core'

/**
 * Category ka darakht — banao, naam badlo, jagah badlo, tarteeb do.
 *
 * Do tareeqe jaan boojh kar saath saath hain:
 *
 *  · Drag & drop — tez, aur bari tabdeeli ke liye qudrati.
 *  · Buttons (upar/neeche/andar/bahar) — kyunke drag har jagah bharosay ke laiq nahi:
 *    trackpad par lamba safha khenchte waqt haath phisalta hai, aur touch par to ye
 *    aksar chalta hi nahi. Ek hi kaam ke do raaste rakhna yahan fazool nahi hai.
 *
 * Koi library nahi — HTML5 ke apne drag events kaafi hain. Ek drag-drop library
 * (dnd-kit/react-beautiful-dnd) is admin safhe par 40-60 KB daal deti, aur poora
 * nizam is se halka rakha gaya hai.
 */

type Flat = { node: CategoryNode; depth: number }

/** Darakht ko ek qatar mein — dikhane ke liye gehrai ke saath. */
function flatten(nodes: readonly CategoryNode[], depth = 0): Flat[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)])
}

async function call(url: string, method: string, body?: unknown): Promise<string | null> {
  const res = await fetch(url, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  if (res.ok) return null

  const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return data?.error?.message ?? 'Could not save — try again'
}

export function CategoryTreeEditor({
  tree,
  canManage,
}: {
  tree: readonly CategoryNode[]
  canManage: boolean
}) {
  const router = useRouter()
  const rows = flatten(tree)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined)

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    const message = await action()
    setBusy(false)

    if (message) {
      setError(message)
      return
    }
    router.refresh()
  }

  const moveTo = (id: string, newParentId: string | null) =>
    run(() => call(`/api/v1/admin/categories/${id}`, 'PATCH', { action: 'move', newParentId }))

  /** Bhai-behnon mein ek qadam upar/neeche — poori list bhej kar. */
  const nudge = (node: CategoryNode, direction: -1 | 1) => {
    const siblings = (node.parentId ? findNode(tree, node.parentId)?.children : tree) ?? []
    const index = siblings.findIndex((sibling) => sibling.id === node.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= siblings.length) return

    const ordered = siblings.map((sibling) => sibling.id)
    ordered.splice(index, 1)
    ordered.splice(target, 0, node.id)

    return run(() =>
      call('/api/v1/admin/categories', 'PATCH', {
        parentId: node.parentId,
        orderedIds: ordered,
      }),
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-card bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>
      )}

      {canManage && (
        <button
          type="button"
          onClick={() => setAddingUnder(null)}
          className="rounded-pill bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + Top-level category
        </button>
      )}

      {addingUnder !== undefined && (
        <NewCategoryForm
          parentId={addingUnder}
          busy={busy}
          onCancel={() => setAddingUnder(undefined)}
          onSave={(values) =>
            run(async () => {
              const message = await call('/api/v1/admin/categories', 'POST', {
                ...values,
                parentId: addingUnder,
              })
              if (!message) setAddingUnder(undefined)
              return message
            })
          }
        />
      )}

      <ul className="card divide-y divide-paper-sunken">
        {rows.map(({ node, depth }) => (
          <li
            key={node.id}
            // Jis par drag guzar raha hai us par halka rang — warna pata hi nahi
            // chalta ke cheez kis ke andar giregi
            className={`px-3 py-2 transition ${
              dropTarget === node.id ? 'bg-brand-50' : dragId === node.id ? 'opacity-40' : ''
            }`}
            draggable={canManage && editing !== node.id}
            onDragStart={() => setDragId(node.id)}
            onDragEnd={() => {
              setDragId(null)
              setDropTarget(null)
            }}
            onDragOver={(event) => {
              if (!canManage || !dragId || dragId === node.id) return
              event.preventDefault()
              setDropTarget(node.id)
            }}
            onDragLeave={() => setDropTarget((current) => (current === node.id ? null : current))}
            onDrop={(event) => {
              event.preventDefault()
              setDropTarget(null)
              if (!dragId || dragId === node.id) return
              void moveTo(dragId, node.id)
              setDragId(null)
            }}
          >
            <div
              className="flex flex-wrap items-center gap-2"
              style={{ paddingInlineStart: `${depth * 20}px` }}
            >
              {depth > 0 && <span className="text-ink-faint">└</span>}

              {editing === node.id ? (
                <RenameForm
                  node={node}
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSave={(values) =>
                    run(async () => {
                      const message = await call(`/api/v1/admin/categories/${node.id}`, 'PATCH', {
                        action: 'rename',
                        ...values,
                      })
                      if (!message) setEditing(null)
                      return message
                    })
                  }
                />
              ) : (
                <>
                  <span className="font-semibold">{node.nameEn}</span>
                  <span className="text-ink-soft" dir="rtl">
                    {node.nameUr}
                  </span>
                  <code className="text-[0.72rem] text-ink-faint">{node.slug}</code>

                  {/*
                    Do ginti alag alag: isi category par kitna maal, aur poori shaakh mein
                    kitna. Sirf shaakh wali dikhate to "khali" category mitane ki koshish
                    par error samajh nahi aata.
                  */}
                  <span className="text-[0.72rem] text-ink-faint">
                    {node.productCount} here
                    {node.branchProductCount !== node.productCount && (
                      <> · {node.branchProductCount} in branch</>
                    )}
                  </span>

                  {canManage && (
                    <span className="ms-auto flex flex-wrap items-center gap-1">
                      <TreeButton label="↑" title="Move up" onClick={() => void nudge(node, -1)} />
                      <TreeButton label="↓" title="Move down" onClick={() => void nudge(node, 1)} />
                      <TreeButton
                        label="→"
                        title="Make child of the row above"
                        onClick={() => {
                          const siblings =
                            (node.parentId ? findNode(tree, node.parentId)?.children : tree) ?? []
                          const index = siblings.findIndex((sibling) => sibling.id === node.id)
                          const above = siblings[index - 1]
                          if (above) void moveTo(node.id, above.id)
                        }}
                      />
                      <TreeButton
                        label="←"
                        title="Move out one level"
                        onClick={() => {
                          const parent = node.parentId ? findNode(tree, node.parentId) : null
                          void moveTo(node.id, parent?.parentId ?? null)
                        }}
                      />
                      <TreeButton label="Rename" onClick={() => setEditing(node.id)} />
                      <TreeButton label="+ Sub" onClick={() => setAddingUnder(node.id)} />
                      <TreeButton
                        label="Delete"
                        tone="danger"
                        onClick={() => {
                          void run(() => call(`/api/v1/admin/categories/${node.id}`, 'DELETE'))
                        }}
                      />
                    </span>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      {canManage && (
        <p className="text-[0.78rem] text-ink-faint">
          Drag a row onto another to make it a child. Use ← to move it back out. Deleting is
          blocked while a category still holds products or sub-categories.
        </p>
      )}
    </div>
  )
}

function findNode(nodes: readonly CategoryNode[], id: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
}

function TreeButton({
  label,
  title,
  tone = 'plain',
  onClick,
}: {
  label: string
  title?: string
  tone?: 'plain' | 'danger'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className={`rounded-card px-2 py-1 text-[0.72rem] font-semibold transition ${
        tone === 'danger'
          ? 'text-red-600 hover:bg-red-50'
          : 'text-ink-soft hover:bg-paper-sunken hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}

function RenameForm({
  node,
  busy,
  onSave,
  onCancel,
}: {
  node: CategoryNode
  busy: boolean
  onSave: (values: { nameUr: string; nameEn: string }) => void
  onCancel: () => void
}) {
  const [nameEn, setNameEn] = useState(node.nameEn)
  const [nameUr, setNameUr] = useState(node.nameUr)

  return (
    <span className="flex flex-wrap items-center gap-2">
      <input
        value={nameEn}
        onChange={(event) => setNameEn(event.target.value)}
        className="rounded-card bg-paper-sunken px-3 py-1 text-sm"
        placeholder="English name"
      />
      <input
        value={nameUr}
        onChange={(event) => setNameUr(event.target.value)}
        dir="rtl"
        className="rounded-card bg-paper-sunken px-3 py-1 text-sm"
        placeholder="اردو نام"
      />
      <TreeButton label={busy ? '…' : 'Save'} onClick={() => onSave({ nameUr, nameEn })} />
      <TreeButton label="Cancel" onClick={onCancel} />
      {/* Slug jaan boojh kar nahi badalta — purane WhatsApp links usi par khulte hain */}
      <span className="text-[0.7rem] text-ink-faint">URL stays {node.slug}</span>
    </span>
  )
}

function NewCategoryForm({
  parentId,
  busy,
  onSave,
  onCancel,
}: {
  parentId: string | null
  busy: boolean
  onSave: (values: { nameUr: string; nameEn: string }) => void
  onCancel: () => void
}) {
  const [nameEn, setNameEn] = useState('')
  const [nameUr, setNameUr] = useState('')

  return (
    <div className="card flex flex-wrap items-center gap-2 p-3">
      <span className="text-[0.78rem] text-ink-faint">
        {parentId ? 'New sub-category' : 'New top-level category'}
      </span>
      <input
        value={nameEn}
        onChange={(event) => setNameEn(event.target.value)}
        className="rounded-card bg-paper-sunken px-3 py-1.5 text-sm"
        placeholder="English name"
      />
      <input
        value={nameUr}
        onChange={(event) => setNameUr(event.target.value)}
        dir="rtl"
        className="rounded-card bg-paper-sunken px-3 py-1.5 text-sm"
        placeholder="اردو نام"
      />
      <button
        type="button"
        disabled={busy || nameEn.trim().length < 2 || nameUr.trim().length < 2}
        onClick={() => onSave({ nameUr, nameEn })}
        className="rounded-pill bg-brand-500 px-4 py-1.5 text-[0.78rem] font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? '…' : 'Create'}
      </button>
      <TreeButton label="Cancel" onClick={onCancel} />
    </div>
  )
}
