'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_TEMPLATE_SPEC,
  TEMPLATE_PRESETS,
  formatPkr,
  pkr,
  templateSpecToCss,
  type TemplateSpec,
} from '@oyebazar/shared'
import { translator, type Locale } from '@/lib/i18n'

/**
 * ⭐ Reseller ka apna template banane ka safha.
 *
 * Teen usool jo poore design ko chalate hain:
 *
 *  1. **Jo dikh raha hai wohi banega.** Preview wohi `templateSpecToCss` istemal karta
 *     hai jo worker istemal karta hai — rang aur jagah ka hisaab do jagah alag nahi
 *     likha gaya. Sirf naap chhota hai (transform: scale).
 *
 *  2. **Cheez par tap karo, us ka qabu wahin khule.** Door wali list mein "title ka
 *     naap" dhoondhna seekhna parta hai; tasveer par us cheez ko chhoo kar us ka
 *     toolbar dekhna nahi parta. Yehi Canva ka asal sabaq hai.
 *
 *  3. **Har ghalti wapas ho sakti hai.** Undo ke baghair log darte darte kaam karte
 *     hain aur azmate hi nahi — aur azmaye baghair koi design achha nahi banta.
 *
 * 🔴 JO CHEEZ YAHAN JAAN BOOJH KAR NAHI HAI: apni marzi ke naye text box.
 *
 * Chhe cheezein tay hain aur har ek ASLI DATA se bandhi hui hai — qeemat wohi jo
 * reseller ne slider par tay ki, naam wohi jo us ka hai. Azad text box us bandhan ko
 * tor deta: reseller "Rs 2,850" haath se likh deti, phir rate badalti, aur tasveer par
 * purana rate chhapta rehta — aur us ka customer usi purane rate par order karta.
 * Layers wala editor is se alag cheez hai aur usay alag se socha jana chahiye.
 *
 * 🔴 Preview ka base CSS `templates/base.css` ki naqal hai (neeche `PREVIEW_BASE_CSS`).
 * Wo file worker ke paas hai aur is bundle mein nahi aati. Naqal hone ki wajah se wo
 * asal se hat sakti hai — YAAD RAHE: asli faisla hamesha render ka hai, preview taqreeb
 * hai. Jo yahan theek dikhe magar render mein toote, us ka ilaj base.css mein hai.
 */

const CANVAS_W = 1080
const CANVAS_H = 1920

/** `templates/base.css` ka wo hissa jo preview ke liye chahiye — dekhen upar wala note. */
const PREVIEW_BASE_CSS = `
/*
 * 🔴 \`position: absolute\` aur \`left/top\` YAHIN likhe hain, Tailwind ki class se nahi.
 *
 * Pehle class \`absolute left-0 top-0\` thi. Us ki specificity (0,1,0) is rule ke
 * barabar hai, aur ye <style> Tailwind ki sheet ke BAAD aata hai — is liye jeet is ka
 * \`position: relative\` gaya. Us soorat mein 1080px chaura stage 302px ke dabbe mein
 * flow karta tha, aur RTL hone ki wajah se poora canvas dabbe se BAHAR baayen taraf
 * nikal jata tha (left: -648). Dabbe par \`overflow: hidden\` hai, yani reseller ko
 * khali canvas dikhta tha — koi error nahi, bas kuch nazar nahi aata tha.
 *
 * \`left: 0\` (RTL mein bhi) is liye ke transform-origin bhi 0 0 hai: dono ek hi kone
 * se naapte hain, to scale ke baad stage theek dabbe mein baith jata hai.
 */
.tpl-stage {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  width: ${CANVAS_W}px;
  height: ${CANVAS_H}px;
  overflow: hidden;
  background: #fff;
  font-family: 'Noto Nastaliq Urdu', serif;
  direction: rtl;
  --scale: 1;
}
.tpl-stage .photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.tpl-stage .scrim { position: absolute; inset: 0; }
.tpl-stage .content { position: absolute; inset: 0; }
.tpl-stage .badge {
  background: var(--accent); color: var(--badge-text);
  font-weight: 700; line-height: 2.2;
  padding: 8px 36px 20px; border-radius: 999px;
  white-space: nowrap;
}
.tpl-stage .bottom { color: #fff; }
.tpl-stage .title {
  font-weight: 700; line-height: 2.1; color: #fff;
  text-shadow: 0 4px 24px rgba(0,0,0,.6);
  max-width: 84%;
}
.tpl-stage .price {
  background: var(--accent); color: var(--badge-text);
  font-weight: 700; line-height: 1.9;
  padding: 10px 44px 26px; border-radius: 28px;
  direction: ltr; font-family: system-ui, sans-serif;
  display: inline-block; white-space: nowrap;
}
.tpl-stage .seller-name { font-weight: 700; line-height: 2.1; color: #fff; white-space: nowrap; }
.tpl-stage .seller-phone { font-weight: 700; color: #fff; white-space: nowrap; }
.tpl-stage .seller-phone .ltr { direction: ltr; font-family: system-ui, sans-serif; display: inline-block; }
.tpl-stage .cta { line-height: 2.1; color: #fff; opacity: .92; white-space: nowrap; }
`

const ELEMENTS = ['badge', 'title', 'price', 'name', 'phone', 'cta'] as const
type ElementKey = (typeof ELEMENTS)[number]

const ELEMENT_LABEL: Record<ElementKey, 'elBadge' | 'elTitle' | 'elPrice' | 'elName' | 'elPhone' | 'elCta'> = {
  badge: 'elBadge',
  title: 'elTitle',
  price: 'elPrice',
  name: 'elName',
  phone: 'elPhone',
  cta: 'elCta',
}

/**
 * Kya chuna hua hai — ya to tay-shuda cheez, ya reseller ka apna text (`L0`, `L1`…).
 *
 * Dono ka mizaj (jagah, naap, rang, likhai) bilkul ek jaisa hai, sirf un ka data alag
 * jagah rehta hai. Is liye poora editor `Sel` par chalta hai aur sirf do function
 * (`part` / `patchPart`) jaante hain ke qadar kahan se aani hai.
 */
type Sel = ElementKey | `L${number}`

/** Jo khaane dono mein mushtarak hain — toolbar, drag aur keyboard sirf inhen chhute hain. */
type PartStyle = {
  show: boolean
  x: number
  y: number
  size: number
  colour?: string | undefined
  opacity?: number | undefined
  rotate?: number | undefined
  font?: 'nastaliq' | 'naskh' | 'latin' | undefined
  pill?: boolean | undefined
}

function layerIndex(sel: Sel): number | null {
  return sel.startsWith('L') ? Number(sel.slice(1)) : null
}

function part(spec: TemplateSpec, sel: Sel): PartStyle | null {
  const index = layerIndex(sel)
  if (index === null) return spec.elements[sel as ElementKey]
  return spec.layers?.[index] ?? null
}

/** Canvas par mojood har cheez — snap aur list dono isi se bante hain. */
function allParts(spec: TemplateSpec): { sel: Sel; style: PartStyle }[] {
  return [
    ...ELEMENTS.map((key) => ({ sel: key as Sel, style: spec.elements[key] })),
    ...(spec.layers ?? []).map((layer, index) => ({ sel: `L${index}` as Sel, style: layer })),
  ]
}

/**
 * Snap ki hadd — feesad mein.
 *
 * 1.5% taqreeban 16px hai 1080 ke canvas par. Is se kam par snap mehsoos hi nahi hota;
 * is se zyada par cheez apni jagah se khisak kar chipak jati hai aur banda larne lagta hai.
 */
const SNAP_TOLERANCE = 1.5

/** Kinare ka aam faasla — Canva ki tarah safhe ke apne guides. */
const EDGE_GUIDES = [4, 50, 96]

export interface EditorTemplate {
  id: string
  name: string
  spec: TemplateSpec
  /** Server se aaya hua — key isi se banti hai (`custom:<id>@<revision>`). */
  revision: number
}

interface Props {
  templates: EditorTemplate[]
  /** Abhi kaun sa default hai — `custom:<id>@<n>` ya built-in ki key ya null. */
  defaultTemplateKey: string | null
  locale: Locale
}

export function TemplateEditor({ templates: initial, defaultTemplateKey, locale }: Props) {
  const t = translator(locale)
  const [templates, setTemplates] = useState(initial)
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null)
  const [defaultKey, setDefaultKey] = useState(defaultTemplateKey)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const first = initial[0]
  const [name, setName] = useState(first?.name ?? '')
  const [spec, setSpec] = useState<TemplateSpec>(first?.spec ?? DEFAULT_TEMPLATE_SPEC)

  /*
   * Undo/redo — poore spec ki tasveerein, chhote chhote patch nahi.
   *
   * Spec ek chhota object hai (chand sau bytes), is liye har qadam ki poori naqal
   * rakhna sasta hai — aur "kya kis se banta hai" wala poora hisaab bach jata hai, jo
   * asal mein wo jagah hai jahan undo tootta hai.
   */
  const [past, setPast] = useState<TemplateSpec[]>([])
  const [future, setFuture] = useState<TemplateSpec[]>([])

  const [selected, setSelected] = useState<Sel | null>(null)
  const [drag, setDrag] = useState<{ key: Sel; mode: 'move' | 'size' } | null>(null)
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })
  const [zoom, setZoom] = useState(0.28)

  const stageRef = useRef<HTMLDivElement>(null)

  /** Har tabdeeli undo ke dhair par — magar drag ke dauran nahi, warna 60 qadam ban jate. */
  const commit = useCallback((next: TemplateSpec) => {
    setSpec((current) => {
      setPast((history) => [...history.slice(-49), current])
      setFuture([])
      return next
    })
    setSaved(false)
  }, [])

  /** Drag ke dauran — dhair par nahi, sirf spec badalta hai. */
  const live = useCallback((next: (current: TemplateSpec) => TemplateSpec) => {
    setSpec(next)
    setSaved(false)
  }, [])

  function patch(next: Partial<TemplateSpec>) {
    commit({ ...spec, ...next })
  }

  /** Tay-shuda cheez ya apna text — dono ek hi raste se badalte hain. */
  function patchPart(sel: Sel, next: Partial<PartStyle>, toHistory = true) {
    const apply = (current: TemplateSpec): TemplateSpec => {
      const index = layerIndex(sel)
      if (index === null) {
        const key = sel as ElementKey
        return {
          ...current,
          elements: { ...current.elements, [key]: { ...current.elements[key], ...next } },
        }
      }

      const layers = [...(current.layers ?? [])]
      const layer = layers[index]
      if (!layer) return current
      layers[index] = { ...layer, ...next }
      return { ...current, layers }
    }

    if (toHistory) commit(apply(spec))
    else live(apply)
  }

  function undo() {
    setPast((history) => {
      const previous = history.at(-1)
      if (!previous) return history
      setFuture((forward) => [spec, ...forward])
      setSpec(previous)
      setSaved(false)
      return history.slice(0, -1)
    })
  }

  function redo() {
    setFuture((forward) => {
      const next = forward[0]
      if (!next) return forward
      setPast((history) => [...history, spec])
      setSpec(next)
      setSaved(false)
      return forward.slice(1)
    })
  }

  // ---------------------------------------------------------------- uthana aur rakhna

  /**
   * Pointer events (mouse aur ungli dono) — aur `setPointerCapture` lazmi hai: ungli
   * tezi se chale to wo element se bahar nikal jati hai, aur capture ke baghair drag
   * wahin chhoot jata hai. Phone par ye har dafa hota hai.
   */
  function startDrag(key: Sel, mode: 'move' | 'size', event: React.PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    setSelected(key)

    /*
     * Capture ki nakami se chunao nahi marna chahiye.
     *
     * `setPointerCapture` un pointer par phenkta hai jo ab active nahi rahe (ungli
     * uthate hi ye ho jata hai, aur kuch browsers mein mouse par bhi). Pehle ye line
     * `setSelected` se PEHLE thi aur us ke phenkne par cheez chunni hi nahi jati thi —
     * yani drag na chalne par tap bhi kaam karna chhor deta tha.
     */
    try {
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    } catch {
      // Capture na mile to drag phir bhi chalta hai, bas ungli bahar nikalne par ruk jayega
    }
    // Drag SE PEHLE ki halat dhair par — taake ek undo poore drag ko wapas kare
    setPast((history) => [...history.slice(-49), spec])
    setFuture([])
    setDrag({ key, mode })
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag || !stageRef.current) return
    const box = stageRef.current.getBoundingClientRect()

    const dragged = part(spec, drag.key)
    if (!dragged) return

    if (drag.mode === 'size') {
      /*
       * Naap: kone se jitna door khinchen. Ooper/andar ki taraf chhota, bahar bara.
       * Naapne ka paimana canvas ki chaurai hai taake zoom se farq na pare.
       */
      const dy = ((event.clientY - box.top) / box.height) * 100
      const size = Math.round(16 + Math.max(0, dy - dragged.y) * 6)
      patchPart(drag.key, { size: Math.min(160, Math.max(16, size)) }, false)
      return
    }

    // RTL: x us kinare se naapa jata hai jahan se parhna shuru hota hai (daayen)
    let x = ((box.right - event.clientX) / box.width) * 100
    let y = ((event.clientY - box.top) / box.height) * 100

    /*
     * Snap — safhe ke apne guides, aur baqi HAR cheez ke kinare (tay-shuda aur apna
     * likha hua text, dono). Reseller ke liye ye ek hi cheez hai: "us ke barabar lag jaye".
     */
    const others = allParts(spec).filter((entry) => entry.sel !== drag.key && entry.style.show)
    const xCandidates = [...EDGE_GUIDES, ...others.map((entry) => entry.style.x)]
    const yCandidates = others.map((entry) => entry.style.y)

    const hitX = nearest(x, xCandidates)
    const hitY = nearest(y, yCandidates)
    if (hitX !== null) x = hitX
    if (hitY !== null) y = hitY
    setGuides({ x: hitX !== null ? [hitX] : [], y: hitY !== null ? [hitY] : [] })

    patchPart(drag.key, { x: clamp(Math.round(x)), y: clamp(Math.round(y)) }, false)
  }

  function endDrag() {
    setDrag(null)
    setGuides({ x: [], y: [] })
  }

  // ---------------------------------------------------------------- keyboard

  /**
   * Teer se sarkao, Delete se chhupao.
   *
   * Ungli se motay motay jagah ban jati hai; aakhri do-teen pixel hamesha keyboard se
   * theek hote hain. Canva mein bhi yehi hota hai.
   */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement
      // Text box mein likhte waqt teer ka matlab cursor hai, cheez khiskana nahi
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }

      if (!selected) return
      const element = part(spec, selected)
      if (!element) return
      const step = event.shiftKey ? 5 : 1

      const moves: Record<string, () => void> = {
        // RTL: daayen teer nazar ke lehaz se daayen jata hai, yani x kam hota hai
        ArrowRight: () => patchPart(selected, { x: clamp(element.x - step) }),
        ArrowLeft: () => patchPart(selected, { x: clamp(element.x + step) }),
        ArrowUp: () => patchPart(selected, { y: clamp(element.y - step) }),
        ArrowDown: () => patchPart(selected, { y: clamp(element.y + step) }),
        Delete: () => patchPart(selected, { show: false }),
        Backspace: () => patchPart(selected, { show: false }),
        Escape: () => setSelected(null),
      }

      const move = moves[event.key]
      if (move) {
        event.preventDefault()
        move()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---------------------------------------------------------------- server

  function choose(template: EditorTemplate) {
    setSelectedId(template.id)
    setName(template.name)
    setSpec(template.spec)
    setPast([])
    setFuture([])
    setSelected(null)
    setSaved(false)
    setError(null)
  }

  /**
   * Naya template — hamesha kisi chalti hui shakl se, khali canvas se nahi.
   *
   * Khali safha "kya banaun" ka sawal khara karta hai, jo "isay kaisa karun" se kahin
   * bara hai. Zyada tar log wahin chhor dete hain.
   */
  function startNew(preset: TemplateSpec = DEFAULT_TEMPLATE_SPEC) {
    setSelectedId(null)
    setName('')
    setSpec(preset)
    setPast([])
    setFuture([])
    setSelected(null)
    setSaved(false)
  }

  async function save() {
    setBusy(true)
    setError(null)

    const isNew = !selectedId
    const res = await fetch(isNew ? '/api/v1/templates' : `/api/v1/templates/${selectedId}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || t('myTemplate'), spec }),
    }).catch(() => null)

    setBusy(false)
    if (!res?.ok) {
      setError(t('somethingWrong'))
      return
    }

    /*
     * Server ki di hui key hi aakhri sach hai — revision wahin barhta hai. Yahan usay
     * apne paas rakh lete hain, warna "default bana den" purani key bhejta aur reseller
     * ko us ka apna naya design kabhi nazar hi na aata.
     */
    const data = (await res.json()) as { id: string; name: string; key: string }
    const revision = Number(data.key.split('@')[1] ?? 1)

    setTemplates((current) =>
      isNew
        ? [{ id: data.id, name: data.name, spec, revision }, ...current]
        : current.map((item) =>
            item.id === data.id ? { ...item, name: data.name, spec, revision } : item,
          ),
    )
    setSelectedId(data.id)
    setSaved(true)
  }

  async function makeDefault() {
    if (!selectedId) return
    setBusy(true)

    const template = templates.find((item) => item.id === selectedId)
    const res = await fetch('/api/v1/status-pack/defaults', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      // Sirf template badal rahe hain — baqi faislay (zaban, naam/number) jaise hain
      body: JSON.stringify({ templateKey: `custom:${selectedId}@${template?.revision ?? 1}` }),
    }).catch(() => null)

    setBusy(false)
    if (res?.ok) {
      const data = (await res.json()) as { templateKey: string | null }
      setDefaultKey(data.templateKey)
    } else setError(t('somethingWrong'))
  }

  async function remove(id: string) {
    setBusy(true)
    await fetch(`/api/v1/templates/${id}`, { method: 'DELETE' }).catch(() => null)
    setBusy(false)

    setTemplates((current) => current.filter((item) => item.id !== id))
    if (selectedId === id) startNew()
  }

  /** Cheez ka naam — apne likhe hue text ka naam wohi text hai, jo list mein sab se saaf hai. */
  function partLabel(sel: Sel): string {
    const index = layerIndex(sel)
    if (index === null) return t(ELEMENT_LABEL[sel as ElementKey])
    return spec.layers?.[index]?.text || t('myText')
  }

  // ---------------------------------------------------------------- apne text

  function addLayer() {
    const layers = [...(spec.layers ?? [])]
    if (layers.length >= 6) return

    layers.push({
      kind: 'text',
      text: t('myTextSample'),
      show: true,
      // Beech mein — wahan jahan nazar pehle jati hai, aur jahan se ghaseetna aasan hai
      x: 20,
      y: 30,
      size: 48,
    })
    commit({ ...spec, layers })
    setSelected(`L${layers.length - 1}`)
  }

  function setLayerText(index: number, text: string) {
    const layers = [...(spec.layers ?? [])]
    const layer = layers[index]
    if (!layer) return
    layers[index] = { ...layer, text }
    commit({ ...spec, layers })
  }

  function removeLayer(index: number) {
    const layers = (spec.layers ?? []).filter((_, i) => i !== index)
    commit({ ...spec, layers })
    setSelected(null)
  }

  /**
   * Aage/peechay — list ki tarteeb hi layer ki tarteeb hai (baad wala upar chhapta hai).
   *
   * Chunao bhi saath khiskata hai, warna banda "upar karo" dabata hai aur achanak koi
   * doosri cheez chuni hui nikalti hai.
   */
  function moveLayer(index: number, by: -1 | 1) {
    const layers = [...(spec.layers ?? [])]
    const to = index + by
    const a = layers[index]
    const b = layers[to]
    if (!a || !b) return

    layers[index] = b
    layers[to] = a
    commit({ ...spec, layers })
    setSelected(`L${to}`)
  }

  const isDefault = Boolean(selectedId && defaultKey?.startsWith(`custom:${selectedId}@`))
  const css = useMemo(() => templateSpecToCss(spec), [spec])
  const stageWidth = CANVAS_W * zoom

  return (
    <div className="space-y-4">
      {/* ---------------- Ooper ki patti: undo/redo, zoom, naam, save ---------------- */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="flex items-center gap-1">
          <IconButton label={t('undo')} onClick={undo} disabled={past.length === 0}>
            ↶
          </IconButton>
          <IconButton label={t('redo')} onClick={redo} disabled={future.length === 0}>
            ↷
          </IconButton>
        </div>

        <div className="flex items-center gap-1">
          <IconButton label={t('zoomOut')} onClick={() => setZoom((z) => Math.max(0.16, z - 0.06))}>
            −
          </IconButton>
          <span dir="ltr" className="numeric w-12 text-center text-[0.75rem] text-ink-faint">
            {Math.round(zoom * 100)}%
          </span>
          <IconButton label={t('zoomIn')} onClick={() => setZoom((z) => Math.min(0.6, z + 0.06))}>
            +
          </IconButton>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={t('myTemplate')}
          className="field min-w-0 flex-1 !py-2 text-[0.9rem]"
        />

        <button type="button" onClick={save} disabled={busy} className="btn-primary !py-2">
          {saved ? t('savedTick') : t('saveTemplate')}
        </button>
        <button
          type="button"
          onClick={makeDefault}
          disabled={busy || !selectedId || isDefault}
          className="btn-secondary !py-2"
        >
          {isDefault ? `★ ${t('isDefault')}` : t('makeDefault')}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,300px)]">
        {/* ---------------- Mere template ---------------- */}
        <div className="card p-4 lg:order-1">
          <h2 className="text-[0.95rem] font-bold">{t('startFrom')}</h2>
          <p className="mt-1 text-[0.75rem] text-ink-faint">{t('startFromHint')}</p>
          <div className="rail mt-2">
            {TEMPLATE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => startNew(preset.spec)}
                className="chip !py-1 text-[0.75rem]"
              >
                {locale === 'ur' ? preset.nameUr : preset.nameEn}
              </button>
            ))}
          </div>

          <h2 className="mt-5 text-[0.95rem] font-bold">{t('myTemplates')}</h2>

          <div className="mt-3 space-y-2">
            {templates.length === 0 && (
              <p className="text-[0.85rem] text-ink-soft">{t('noTemplatesYet')}</p>
            )}
            {templates.map((template) => (
              <div
                key={template.id}
                className={
                  template.id === selectedId
                    ? 'flex items-center gap-2 rounded-2xl bg-accent-50 px-3 py-2'
                    : 'flex items-center gap-2 rounded-2xl bg-paper-sunken px-3 py-2'
                }
              >
                <button
                  type="button"
                  onClick={() => choose(template)}
                  className="link-tap flex-1 text-right text-[0.85rem] font-semibold"
                >
                  {template.name}
                  {defaultKey?.startsWith(`custom:${template.id}@`) && (
                    <span className="mr-2 text-[0.68rem] text-accent-700">★</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(template.id)}
                  disabled={busy}
                  className="text-[0.72rem] text-ink-faint underline"
                >
                  {t('deleteTemplate')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ---------------- Canvas ---------------- */}
        <div className="lg:order-2">
          <style dangerouslySetInnerHTML={{ __html: PREVIEW_BASE_CSS }} />
          {/*
            🔴 Wohi function jo worker chalata hai. Do jagah alag hisaab likhne ka matlab
            hota ke preview aur asli tasveer chup chaap ek doosre se hat jayen.
          */}
          <style dangerouslySetInnerHTML={{ __html: css }} />

          <div className="flex justify-center">
            <div
              className="relative overflow-hidden rounded-card shadow-soft"
              style={{ width: stageWidth, height: CANVAS_H * zoom }}
              // Khali jagah par tap = kuch bhi chuna hua nahi
              onPointerDown={() => setSelected(null)}
            >
              <div
                ref={stageRef}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                className="tpl-stage stage custom"
                style={{ transform: `scale(${zoom})` }}
              >
                {/*
                  Namoona tasveer ki jagah gehra dhalta hua rang — ek aur asset rakhne ka
                  matlab hota ek aur cheez jo deploy par chhoot sakti hai, aur us ke
                  chhootne par editor safed ho jata jahan safed likhai nazar hi na aati.
                */}
                <div
                  className="photo"
                  style={{
                    background:
                      'linear-gradient(150deg, #7c3f1d 0%, #b45309 35%, #3f3f46 75%, #18181b 100%)',
                  }}
                />
                <div className="scrim" />

                <div className="content">
                  <Handle
                    k="badge"
                    cssClass="badge"
                    {...{ spec, selected, drag, startDrag, setSelected }}
                  >
                    {spec.badgeText || '—'}
                  </Handle>

                  <div className="bottom">
                    <Handle
                      k="title"
                      cssClass="title"
                      {...{ spec, selected, drag, startDrag, setSelected }}
                    >
                      {t('sampleProductTitle')}
                    </Handle>

                    <Handle
                      k="price"
                      cssClass="price-row"
                      {...{ spec, selected, drag, startDrag, setSelected }}
                    >
                      <div className="price">{formatPkr(pkr(2850))}</div>
                    </Handle>

                    <div className="seller">
                      <Handle
                        k="name"
                        cssClass="seller-name"
                        {...{ spec, selected, drag, startDrag, setSelected }}
                      >
                        {t('sampleSellerName')}
                      </Handle>
                      <Handle
                        k="phone"
                        cssClass="seller-phone"
                        {...{ spec, selected, drag, startDrag, setSelected }}
                      >
                        {/* LTR andar wale span par — dekhen templates/layout.html ka note */}
                        <span className="ltr">0300 1234567</span>
                      </Handle>
                    </div>

                    <Handle
                      k="cta"
                      cssClass="cta"
                      {...{ spec, selected, drag, startDrag, setSelected }}
                    >
                      {t('sampleCta')}
                    </Handle>
                  </div>

                  {/* Reseller ka apna likha hua text — baad wala upar (z-index list se) */}
                  {(spec.layers ?? []).map((layer, index) => (
                    <Handle
                      key={index}
                      k={`L${index}`}
                      cssClass={`layer-${index}`}
                      {...{ spec, selected, drag, startDrag, setSelected }}
                    >
                      {layer.text}
                    </Handle>
                  ))}
                </div>
              </div>

              {/* Snap ki lakeerein — canvas ke UPAR, us ke andar nahi (warna scale inhen bhi patla kar deta) */}
              {guides.x.map((x) => (
                <div
                  key={`x${x}`}
                  className="pointer-events-none absolute top-0 h-full w-px bg-accent-700"
                  style={{ right: `${x}%` }}
                />
              ))}
              {guides.y.map((y) => (
                <div
                  key={`y${y}`}
                  className="pointer-events-none absolute left-0 h-px w-full bg-accent-700"
                  style={{ top: `${y}%` }}
                />
              ))}
            </div>
          </div>

          <p className="mt-3 text-center text-[0.78rem] text-ink-faint">
            {selected ? t('selectedHint') : t('dragHint')}
          </p>

          {/* Chuni hui cheez ka apna toolbar — canvas ke bilkul neeche, nazar wahin hai */}
          {selected && (
            <div className="card mt-3 space-y-3 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[0.85rem] font-bold">{partLabel(selected)}</span>

                <div className="flex items-center gap-1">
                  <IconButton
                    label={t('smaller')}
                    onClick={() =>
                      patchPart(selected, {
                        size: Math.max(16, (part(spec, selected)?.size ?? 40) - 4),
                      })
                    }
                  >
                    A−
                  </IconButton>
                  <span dir="ltr" className="numeric w-8 text-center text-[0.75rem] text-ink-faint">
                    {(part(spec, selected)?.size ?? 40)}
                  </span>
                  <IconButton
                    label={t('bigger')}
                    onClick={() =>
                      patchPart(selected, {
                        size: Math.min(160, (part(spec, selected)?.size ?? 40) + 4),
                      })
                    }
                  >
                    A+
                  </IconButton>
                </div>

                {/* Kinare par lagana — wo teen jagahen jahan 90% cheezein jati hain */}
                <div className="flex items-center gap-1">
                  {EDGE_GUIDES.map((x) => (
                    <IconButton
                      key={x}
                      label={x === 4 ? t('alignStart') : x === 50 ? t('alignCentre') : t('alignEnd')}
                      onClick={() => patchPart(selected, { x })}
                    >
                      {x === 4 ? '▤' : x === 50 ? '▥' : '▦'}
                    </IconButton>
                  ))}
                </div>

                {/* Rang bhara dabba — qeemat par pehle se hai, baqi par lagaya ja sakta hai */}
                <IconButton
                  label={t('pillToggle')}
                  onClick={() =>
                    patchPart(selected, { pill: !isPillOn(spec, selected) })
                  }
                >
                  {isPillOn(spec, selected) ? '▬' : '▭'}
                </IconButton>

                <button
                  type="button"
                  onClick={() => patchPart(selected, { show: false })}
                  className="ms-auto text-[0.78rem] text-ink-soft underline"
                >
                  {t('hideThis')}
                </button>
              </div>

              {/* Apna text — likhne ka khana wahin jahan wo chuna hua hai */}
              {layerIndex(selected) !== null && (
                <input
                  value={spec.layers?.[layerIndex(selected)!]?.text ?? ''}
                  onChange={(e) => setLayerText(layerIndex(selected)!, e.target.value)}
                  maxLength={40}
                  placeholder={t('myTextSample')}
                  className="field w-full text-[0.95rem]"
                />
              )}

              <div className="flex flex-wrap items-end gap-4 border-t border-line pt-3">
                {/* Likhai ka mizaj — Urdu design mein sab se bara farq yehi daalta hai */}
                <div>
                  <p className="text-[0.72rem] font-semibold text-ink-soft">{t('fontLabel')}</p>
                  <div className="rail mt-1">
                    {(['nastaliq', 'naskh', 'latin'] as const).map((font) => (
                      <button
                        key={font}
                        type="button"
                        onClick={() => patchPart(selected, { font })}
                        className={
                          (part(spec, selected)?.font ?? 'nastaliq') === font
                            ? 'chip chip-active !py-1 text-[0.72rem]'
                            : 'chip !py-1 text-[0.72rem]'
                        }
                      >
                        {font === 'nastaliq'
                          ? t('fontNastaliq')
                          : font === 'naskh'
                            ? t('fontNaskh')
                            : t('fontLatin')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="w-28">
                  <ColourField
                    label={t('textColour')}
                    value={part(spec, selected)?.colour ?? '#ffffff'}
                    onChange={(colour) => patchPart(selected, { colour })}
                  />
                </div>

                <div className="w-32">
                  <SliderField
                    label={t('opacityLabel')}
                    value={part(spec, selected)?.opacity ?? 100}
                    min={10}
                    max={100}
                    onChange={(opacity) => patchPart(selected, { opacity })}
                  />
                </div>

                <div className="w-32">
                  <SliderField
                    label={t('rotateLabel')}
                    value={part(spec, selected)?.rotate ?? 0}
                    min={-20}
                    max={20}
                    onChange={(rotate) => patchPart(selected, { rotate })}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ---------------- Poore template ke faislay ---------------- */}
        <div className="space-y-4 lg:order-3">
          <div className="card space-y-4 p-4">
            <label className="block">
              <span className="text-[0.8rem] font-semibold">{t('badgeText')}</span>
              <input
                value={spec.badgeText}
                onChange={(e) => patch({ badgeText: e.target.value })}
                maxLength={24}
                className="field mt-2 w-full text-[0.9rem]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <ColourField
                label={t('accentColour')}
                value={spec.accent}
                onChange={(accent) => patch({ accent })}
              />
              <ColourField
                label={t('accentTextColour')}
                value={spec.accentText}
                onChange={(accentText) => patch({ accentText })}
              />
            </div>

            <div>
              <p className="text-[0.8rem] font-semibold">{t('bottomCard')}</p>
              <div className="rail mt-2">
                {(['none', 'light', 'dark'] as const).map((card) => (
                  <button
                    key={card}
                    type="button"
                    onClick={() => patch({ card })}
                    className={spec.card === card ? 'chip chip-active' : 'chip'}
                  >
                    {card === 'none'
                      ? t('cardNone')
                      : card === 'light'
                        ? t('cardLight')
                        : t('cardDark')}
                  </button>
                ))}
              </div>
            </div>

            <SliderField
              label={t('scrimStrength')}
              value={spec.scrim}
              min={0}
              max={100}
              onChange={(scrim) => patch({ scrim })}
            />
            <SliderField
              label={t('frameWidth')}
              value={spec.frame}
              min={0}
              max={12}
              onChange={(frame) => patch({ frame })}
            />
            <SliderField
              label={t('cornerRadius')}
              value={spec.radius}
              min={0}
              max={80}
              onChange={(radius) => patch({ radius })}
            />
          </div>

          {/*
            Cheezon ki list — Canva ke "layers" wala kaam.

            Do masle ek saath hal karti hai:
             · Do cheezein ek doosre par charh jayen to tasveer par neeche wali ko tap
               karna namumkin ho jata hai. Yahan se wo hamesha chuni ja sakti hai.
             · Chhupi hui cheez tasveer par hai hi nahi — us par tap kar hi nahi sakte,
               yani bina is list ke wo hamesha ke liye gum ho jati.
          */}
          <div className="card p-4">
            <p className="text-[0.8rem] font-semibold">{t('elementsTitle')}</p>
            <div className="mt-2 space-y-1">
              {allParts(spec).map(({ sel, style }) => {
                const index = layerIndex(sel)
                return (
                  <div
                    key={sel}
                    className={
                      selected === sel
                        ? 'flex items-center gap-1 rounded-xl bg-accent-50 px-2 py-1.5'
                        : 'flex items-center gap-1 rounded-xl px-2 py-1.5'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(sel)}
                      className={
                        style.show
                          ? 'link-tap min-w-0 flex-1 truncate text-right text-[0.82rem] font-semibold'
                          : 'link-tap min-w-0 flex-1 truncate text-right text-[0.82rem] font-semibold text-ink-faint line-through'
                      }
                    >
                      {index !== null && <span className="text-accent-700">✎ </span>}
                      {partLabel(sel)}
                    </button>

                    {/* Aage/peechay sirf apne text par — tay-shuda cheezon ki tarteeb tay hai */}
                    {index !== null && (
                      <>
                        <button
                          type="button"
                          onClick={() => moveLayer(index, 1)}
                          disabled={index === (spec.layers?.length ?? 0) - 1}
                          aria-label={t('bringForward')}
                          title={t('bringForward')}
                          className="link-tap flex h-7 w-5 items-center justify-center text-[0.75rem] text-ink-soft disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveLayer(index, -1)}
                          disabled={index === 0}
                          aria-label={t('sendBackward')}
                          title={t('sendBackward')}
                          className="link-tap flex h-7 w-5 items-center justify-center text-[0.75rem] text-ink-soft disabled:opacity-30"
                        >
                          ▼
                        </button>
                        <button
                          type="button"
                          onClick={() => removeLayer(index)}
                          aria-label={t('deleteTemplate')}
                          title={t('deleteTemplate')}
                          className="link-tap flex h-7 w-5 items-center justify-center text-[0.75rem] text-ink-soft"
                        >
                          ✕
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => patchPart(sel, { show: !style.show })}
                      aria-label={style.show ? t('hideThis') : t('showThis')}
                      title={style.show ? t('hideThis') : t('showThis')}
                      className="link-tap flex h-7 w-7 items-center justify-center rounded-lg text-[0.85rem] text-ink-soft"
                    >
                      {style.show ? '👁' : '🚫'}
                    </button>
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={addLayer}
              disabled={(spec.layers?.length ?? 0) >= 6}
              className="btn-secondary mt-3 w-full !py-1.5 text-[0.8rem]"
            >
              + {t('addText')}
            </button>

            {/*
              🔴 Tanbeeh chhupani nahi chahiye.

              Apna text kisi data se bandha hua nahi. Koi yahan RATE likh de to wo rate
              kabhi khud nahi badlega — reseller slider par rate badalti rahegi aur
              tasveer par purana likha rahega, aur us ka customer usi par order karega.
            */}
            <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-faint">
              {t('layerWarning')}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- chhote hissay

/**
 * Rang bhara dabba abhi laga hua hai ya nahi.
 *
 * `pill` ikhtiyari hai, aur us ka "na hona" har cheez par ek jaisa nahi hai: badge aur
 * qeemat par dabba base.css se PEHLE hi laga hota hai, baqi par nahi. Ye farq yahan ek
 * jagah likha hai — warna toolbar ka switch un do par ulta chalta.
 */
function isPillOn(spec: TemplateSpec, key: Sel): boolean {
  // Apne likhe hue text par dabba default OFF hai — wo aksar saada line hoti hai
  return part(spec, key)?.pill ?? (key === 'badge' || key === 'price')
}

/** 0–96 ke darmiyan — 100 par cheez kinare se bahar nikal jati hai. */
function clamp(value: number): number {
  return Math.min(96, Math.max(0, value))
}

/** Sab se qareeb guide, agar hadd ke andar ho. */
function nearest(value: number, candidates: number[]): number | null {
  let best: number | null = null
  let bestDistance = SNAP_TOLERANCE

  for (const candidate of candidates) {
    const distance = Math.abs(candidate - value)
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }
  return best
}

/**
 * Ek cheez — chunne, uthane aur naap badalne ke saath.
 *
 * Jagah aur naap spec ke CSS se aate hain (`templateSpecToCss`), yahan se nahi — warna
 * do jagah hisaab hota aur preview asli render se hat jata. Ye sirf pakarne ka nishan,
 * chunne ka haashiya aur kone ka handle lagata hai.
 *
 * 🔴 `cssClass` WOHI class honi chahiye jise spec ka CSS position karta hai (`.title`,
 * `.price-row`, waghera), aur handlers USI element par lagte hain.
 *
 * Pehli koshish mein in par ek alag wrapper `<div>` charhaya gaya tha. Wo wrapper
 * static rehta tha (position spec CSS ne andar wale element ko di thi), is liye chunne
 * ka haashiya aur kone ka handle dono ghalat jagah lagte the — handle to `.content` ke
 * kone par chala jata tha. Browser mein aazma kar hi ye pakra gaya.
 */
function Handle({
  k,
  cssClass,
  spec,
  selected,
  drag,
  startDrag,
  setSelected,
  children,
}: {
  k: Sel
  cssClass: string
  spec: TemplateSpec
  selected: Sel | null
  drag: { key: Sel; mode: 'move' | 'size' } | null
  startDrag: (key: Sel, mode: 'move' | 'size', event: React.PointerEvent) => void
  setSelected: (key: Sel) => void
  children: React.ReactNode
}) {
  const style = part(spec, k)
  if (!style?.show) return null

  const isSelected = selected === k
  const isDragging = drag?.key === k

  return (
    <div
      onPointerDown={(event) => startDrag(k, 'move', event)}
      onClick={(event) => {
        event.stopPropagation()
        setSelected(k)
      }}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      className={`${cssClass} ${
        isSelected
          ? 'outline-dashed outline-[6px] outline-offset-[10px] outline-white/80'
          : 'hover:outline-dashed hover:outline-[4px] hover:outline-offset-[10px] hover:outline-white/35'
      }`}
    >
      {children}

      {isSelected && (
        /*
          Naap ka handle. Canvas 0.28 par simta hua hai, is liye handle ko 1080-paimane
          par bara banana parta hai — warna asli screen par wo 5px ka nuqta hota hai
          jise ungli se pakarna namumkin hai.
        */
        <div
          onPointerDown={(event) => startDrag(k, 'size', event)}
          style={{
            position: 'absolute',
            insetInlineEnd: -28,
            bottom: -28,
            width: 56,
            height: 56,
            borderRadius: 999,
            background: '#fff',
            border: '6px solid #C2410C',
            cursor: 'nwse-resize',
            touchAction: 'none',
          }}
        />
      )}
    </div>
  )
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="link-tap flex h-9 min-w-9 items-center justify-center rounded-xl bg-paper-sunken px-2 text-[0.85rem] font-semibold disabled:opacity-35"
    >
      {children}
    </button>
  )
}

function ColourField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="text-[0.78rem] font-semibold">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          maxLength={7}
          className="field numeric w-full text-[0.78rem]"
        />
      </div>
    </label>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[0.78rem] font-semibold">{label}</span>
        <span dir="ltr" className="numeric text-[0.7rem] text-ink-faint">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-pill bg-paper-sunken accent-brand-500"
      />
    </div>
  )
}
