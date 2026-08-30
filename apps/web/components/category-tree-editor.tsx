'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { CategoryNode } from '@oyebazar/core'

/**
 * Category ka darakht — WordPress ke menu editor ki tarz par.
 *
 * Do cheezen us design se li hain, aur dono waje se:
 *
 *  · Har qatar ek dabba hai jise handle (⠿) se uthaya jata hai. Poori qatar ko
 *    draggable banane se naam par click kar ke rename karna mushkil ho jata hai —
 *    browser text chunne ki jagah drag shuru kar deta hai.
 *  · Girne ki jagah SAAF nazar aati hai: qataron ke beech lakeer (wahan bhai ban kar
 *    girega) aur qatar ke andar rang (wahan bachcha ban kar). WordPress mein yehi wo
 *    ek cheez hai jo bataati hai ke "andar" ja raha hai ya "neeche".
 *
 * Buttons bhi mojood hain (← → ↑ ↓): drag trackpad par phisalta hai aur touch par
 * aksar chalta hi nahi. Ek kaam ke do raaste yahan fazool nahi.
 *
 * Koi drag library nahi — HTML5 ke apne events kaafi hain. dnd-kit is safhe par 40+ KB
 * daal deti, aur poora nizam is se halka rakha gaya hai.
 */

type Flat = { node: CategoryNode; depth: number }

function flatten(nodes: readonly CategoryNode[], depth = 0): Flat[] {
  return nodes.flatMap((node) => [{ node, depth }, ...flatten(node.children, depth + 1)])
}

/** Kisi node ka darja — hint mein "level 3" likhne ke liye. */
function depthOf(nodes: readonly CategoryNode[], id: string, depth = 0): number {
  for (const node of nodes) {
    if (node.id === id) return depth
    const found = depthOf(node.children, id, depth + 1)
    if (found >= 0) return found
  }
  return -1
}

function findNode(nodes: readonly CategoryNode[], id: string): CategoryNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNode(node.children, id)
    if (found) return found
  }
  return null
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

/** Girne ki do soortein: kisi ke ANDAR, ya kisi ke NEECHE (us ka bhai ban kar). */
type DropSpot = { id: string; mode: 'inside' | 'after' } | null

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
  const [spot, setSpot] = useState<DropSpot>(null)
  const [editing, setEditing] = useState<string | null>(null)

  /*
   * 🔴 Drag ke waqt kinare par safha KHUD sarakta hai.
   *
   * HTML5 ka drag-and-drop ye kaam khud nahi karta. Nateeja ye tha ke jis category ko
   * upar le jana ho, wo utni hi door ja sakti thi jitni screen par nazar aa rahi thi —
   * aur category ka darakht poori screen se lamba hota hai. Yani neeche wali cheez ko
   * sab se upar le jana MUMKIN hi nahi tha; banda uthata, kinare par pohanchta, aur
   * chhor deta. Us ne ye samjha hota ke drag "kaam nahi karta".
   *
   * Raftaar kinare se faasle ke hisab se hai, ek muqarrar qadam nahi: hadd ke qareeb
   * halki, bilkul kinare par poori. Muqarrar raftaar dono taraf se buri hoti hai —
   * itni halki ke sabr khatam ho jaye, ya itni tez ke nishana guzar jaye.
   *
   * `y` shuru mein `null` hai, sifar nahi. Sifar ka matlab hota "sab se upar" aur
   * safha uthate hi bhaagna shuru kar deta, chahe maus beech mein ho.
   */
  useEffect(() => {
    if (!dragId) return

    /** Kinare se itne px ke andar sarakna shuru — ungli/maus ke liye kushada hadd */
    const EDGE = 120
    /** Ek frame mein zyada se zyada itna — 60fps par taqreeban 1000px fi second */
    const MAX_STEP = 16

    let y: number | null = null
    let frame = 0

    const onOver = (event: DragEvent) => {
      y = event.clientY
    }

    const tick = () => {
      frame = requestAnimationFrame(tick)
      if (y === null) return

      const height = window.innerHeight
      if (y < EDGE) window.scrollBy(0, -MAX_STEP * (1 - y / EDGE))
      else if (y > height - EDGE) window.scrollBy(0, MAX_STEP * (1 - (height - y) / EDGE))
    }

    window.addEventListener('dragover', onOver)
    frame = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('dragover', onOver)
      cancelAnimationFrame(frame)
    }
  }, [dragId])

  const [addingUnder, setAddingUnder] = useState<string | null | undefined>(undefined)
  const [confirming, setConfirming] = useState<string | null>(null)

  /*
   * Ghisatte waqt upar ek patti chipki rehti hai jo saaf lafzon mein batati hai ke abhi
   * chhorne par kya banega. WordPress ka asal sabaq yehi hai: nesting ka faisla maus ki
   * jagah se hota hai, is liye us faisle ko dikhana lazmi hai — warna banda kheenchta
   * hai, chhorta hai, aur nateeja us se alag nikalta hai jo wo chahta tha.
   */
  const draggedNode = dragId ? findNode(tree, dragId) : null
  const targetNode = spot ? findNode(tree, spot.id) : null
  const hint =
    draggedNode && targetNode && spot
      ? spot.mode === 'inside'
        ? {
            text: `${draggedNode.nameEn} → inside ${targetNode.nameEn}`,
            detail: `becomes level ${depthOf(tree, targetNode.id) + 2}`,
          }
        : {
            text: `${draggedNode.nameEn} ↓ after ${targetNode.nameEn}`,
            detail: `stays level ${depthOf(tree, targetNode.id) + 1}`,
          }
      : null

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

  const siblingsOf = (node: CategoryNode) =>
    (node.parentId ? findNode(tree, node.parentId)?.children : tree) ?? []

  const moveTo = (id: string, newParentId: string | null) =>
    run(() => call(`/api/v1/admin/categories/${id}`, 'PATCH', { action: 'move', newParentId }))

  /** Kisi ke neeche, us ka bhai ban kar — jagah bhi wahi aur tarteeb bhi. */
  async function dropAfter(dragged: CategoryNode, target: CategoryNode) {
    if (dragged.parentId !== target.parentId) {
      await run(() =>
        call(`/api/v1/admin/categories/${dragged.id}`, 'PATCH', {
          action: 'move',
          newParentId: target.parentId,
        }),
      )
      return
    }

    const ordered = siblingsOf(target)
      .map((sibling) => sibling.id)
      .filter((id) => id !== dragged.id)
    const at = ordered.indexOf(target.id)
    ordered.splice(at + 1, 0, dragged.id)

    await run(() =>
      call('/api/v1/admin/categories', 'PATCH', {
        parentId: target.parentId,
        orderedIds: ordered,
      }),
    )
  }

  const nudge = (node: CategoryNode, direction: -1 | 1) => {
    const siblings = siblingsOf(node)
    const index = siblings.findIndex((sibling) => sibling.id === node.id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= siblings.length) return

    const ordered = siblings.map((sibling) => sibling.id)
    ordered.splice(index, 1)
    ordered.splice(target, 0, node.id)

    return run(() =>
      call('/api/v1/admin/categories', 'PATCH', { parentId: node.parentId, orderedIds: ordered }),
    )
  }

  return (
    <div className="space-y-3">
      {error && <p className="rounded-card bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}

      {canManage && (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setAddingUnder(null)}
            className="rounded-pill bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Top-level category
          </button>
          <p className="text-[0.78rem] text-ink-faint">
            Drag by <span className="font-semibold">⠿</span> — drop on a row to nest inside it, or
            on the line between rows to place it there.
          </p>
        </div>
      )}

      {addingUnder !== undefined && (
        <NewCategoryForm
          parentId={addingUnder}
          parentName={addingUnder ? (findNode(tree, addingUnder)?.nameEn ?? '') : null}
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

      {/*
        Ishara — tairta hua, layout se bahar.
        🔴 Pehle ye `sticky` tha aur qatar mein apni jagah ghairta tha: drag shuru hote
        hi saari qatarein 50px neeche khisak jatin, yani jis cheez par cursor tha wo
        badal jati. Ab `fixed` hai — aata jata hai magar kuch hilta nahi.
      */}
      {hint && (
        <div className="fixed inset-x-0 bottom-6 z-40 mx-auto flex w-fit flex-wrap items-center gap-2 rounded-pill bg-coal-900 px-5 py-2.5 text-sm text-white shadow-lift">
          <span className="font-semibold">{hint.text}</span>
          <span className="text-white/60">{hint.detail}</span>
        </div>
      )}

      <ul className="space-y-1.5">
        {rows.map(({ node, depth }) => {
          const dragging = dragId === node.id
          const inside = spot?.id === node.id && spot.mode === 'inside'
          const after = spot?.id === node.id && spot.mode === 'after'

          return (
            <li
              key={node.id}
              style={{ marginInlineStart: `${depth * 24}px` }}
              // Nested rows par baen halki lakeer — darakht ki shakl ek nazar mein
              className={depth > 0 ? 'border-s border-dashed border-ink-faint/30 ps-3' : ''}
            >

              <div
                draggable={canManage && editing !== node.id}
                onDragStart={(event) => {
                  setDragId(node.id)
                  event.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setSpot(null)
                }}
                onDragOver={(event) => {
                  if (!canManage || !dragId || dragId === node.id) return
                  event.preventDefault()

                  /*
                   * Qatar ka neechla chautha hissa = "is ke neeche", baqi = "is ke andar".
                   * Ye WordPress wali baat hai: ek hi qatar par do maqsad, aur farq sirf
                   * is se ke maus kahan hai — warna nesting ke liye alag button banana
                   * parta aur har chhoti tabdeeli do click maangti.
                   */
                  const box = event.currentTarget.getBoundingClientRect()
                  const nearBottom = event.clientY > box.bottom - box.height / 4
                  const mode = nearBottom ? 'after' : 'inside'

                  /*
                   * `dragover` maus ke har halke se hilne par chalta hai — kai dafa fi
                   * second. Har baar state likhne se React har baar dobara render karta
                   * hai aur wohi jhilmilahat banti hai. Sirf tab likho jab waqai kuch
                   * badla ho.
                   */
                  setSpot((current) =>
                    current?.id === node.id && current.mode === mode
                      ? current
                      : { id: node.id, mode },
                  )
                }}
                /*
                 * `onDragLeave` jaan boojh kar nahi hai. Wo har us waqt bhi chalta hai
                 * jab maus qatar ke ANDAR kisi chhote element (naam, badge, button) par
                 * jaye — yani halat baar baar khali ho kar wapas banti hai. Nishan agli
                 * qatar par jate hi khud badal jata hai, aur drag khatam hone par saaf
                 * ho jata hai; is se zyada kuch chahiye hi nahi.
                 */
                onDrop={(event) => {
                  event.preventDefault()
                  const mode = spot?.mode ?? 'inside'
                  setSpot(null)
                  if (!dragId || dragId === node.id) return

                  const dragged = findNode(tree, dragId)
                  setDragId(null)
                  if (!dragged) return

                  if (mode === 'after') void dropAfter(dragged, node)
                  else void moveTo(dragged.id, node.id)
                }}
                className={`card relative flex flex-wrap items-center gap-2 px-3 py-2.5 transition ${
                  dragging ? 'opacity-40' : ''
                } ${dragId ? '[&_*]:pointer-events-none' : ''} ${
                  inside
                    ? // Andar ja raha hai: poora dabba ghera hua, aur baen taraf mota
                      // nishan — yani "ye us ka naya ghar hai"
                      'ring-2 ring-brand-500 border-s-4 border-brand-500 bg-brand-50/60'
                    : ''
                }`}
              >
                {/*
                  🔴 Ye lakeer `absolute` hai, layout mein nahi.
                  Pehle ye qatar ke ooper ek asli dabba tha — us ke aate hi qatar neeche
                  khisak jati, cursor doosre element par chala jata, halat badal jati,
                  lakeer gayab ho jati, qatar wapas apni jagah... aur poora safha kaanpne
                  lagta tha. Ab jagah nahi ghairta, is liye kuch hilta bhi nahi.
                */}
                {after && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 -bottom-[3px] flex items-center gap-2"
                  >
                    <span className="h-[3px] flex-1 rounded-full bg-brand-500" />
                    <span className="rounded-pill bg-brand-500 px-2 text-[0.68rem] font-semibold leading-4 text-white">
                      here
                    </span>
                  </span>
                )}

                {canManage && (
                  <span
                    aria-hidden="true"
                    title="Drag to move"
                    className="cursor-grab select-none px-1 text-ink-faint active:cursor-grabbing"
                  >
                    ⠿
                  </span>
                )}

                {/* Ghisatte waqt andar ke purze maus na chheenen — warna wahi jhilmilahat */}
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
                    <code className="rounded bg-paper-sunken px-1.5 py-0.5 text-[0.7rem] text-ink-faint">
                      {node.slug}
                    </code>

                    {/*
                      Do ginti alag: isi par kitna maal, aur poori shaakh mein kitna.
                      Sirf shaakh wali dikhate to "khali" category mitane par error
                      samajh nahi aata.
                    */}
                    <span className="text-[0.72rem] text-ink-faint">
                      {node.productCount} here
                      {node.branchProductCount !== node.productCount && (
                        <> · {node.branchProductCount} in branch</>
                      )}
                    </span>

                    {canManage && (
                      <span className="ms-auto flex flex-wrap items-center gap-0.5">
                        <TreeButton label="↑" title="Move up" onClick={() => void nudge(node, -1)} />
                        <TreeButton label="↓" title="Move down" onClick={() => void nudge(node, 1)} />
                        <TreeButton
                          label="→"
                          title="Nest inside the row above"
                          onClick={() => {
                            const siblings = siblingsOf(node)
                            const above = siblings[siblings.findIndex((s) => s.id === node.id) - 1]
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

                        {/*
                          Mitane se pehle poochha jata hai. Server bhari hui category ko
                          waise bhi rokta hai, magar khali category ek click mein gum ho
                          jana bhi ghalti hi hai — aur wapas laane ka koi rasta nahi.
                        */}
                        {confirming === node.id ? (
                          <>
                            <TreeButton
                              label={busy ? '…' : 'Yes, delete'}
                              tone="danger"
                              onClick={() =>
                                void run(async () => {
                                  const message = await call(
                                    `/api/v1/admin/categories/${node.id}`,
                                    'DELETE',
                                  )
                                  setConfirming(null)
                                  return message
                                })
                              }
                            />
                            <TreeButton label="Keep" onClick={() => setConfirming(null)} />
                          </>
                        ) : (
                          <TreeButton
                            label="Delete"
                            tone="danger"
                            onClick={() => setConfirming(node.id)}
                          />
                        )}
                      </span>
                    )}
                  </>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
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
      <span className="text-[0.7rem] text-ink-faint">URL stays /{node.slug}</span>
    </span>
  )
}

function NewCategoryForm({
  parentId,
  parentName,
  busy,
  onSave,
  onCancel,
}: {
  parentId: string | null
  parentName: string | null
  busy: boolean
  onSave: (values: { nameUr: string; nameEn: string }) => void
  onCancel: () => void
}) {
  const [nameEn, setNameEn] = useState('')
  const [nameUr, setNameUr] = useState('')

  return (
    <div className="card flex flex-wrap items-center gap-2 border-s-4 border-brand-500 p-3">
      <span className="text-[0.78rem] font-semibold text-ink-soft">
        {parentId ? `New sub-category under ${parentName}` : 'New top-level category'}
      </span>
      <input
        value={nameEn}
        onChange={(event) => setNameEn(event.target.value)}
        className="rounded-card bg-paper-sunken px-3 py-1.5 text-sm"
        placeholder="English name"
        autoFocus
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
        className="rounded-pill bg-brand-500 px-4 py-1.5 text-[0.78rem] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
      >
        {busy ? '…' : 'Create'}
      </button>
      <TreeButton label="Cancel" onClick={onCancel} />
    </div>
  )
}
