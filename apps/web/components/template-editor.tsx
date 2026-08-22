'use client'

import { useRef, useState } from 'react'
import {
  DEFAULT_TEMPLATE_SPEC,
  formatPkr,
  pkr,
  templateSpecToCss,
  type TemplateSpec,
} from '@oyebazar/shared'
import { translator, type Locale } from '@/lib/i18n'

/**
 * ⭐ Reseller ka apna template banane ka safha.
 *
 * Do usool jo poore design ko chalate hain:
 *
 *  1. **Jo dikh raha hai wohi banega.** Preview wohi `templateSpecToCss` istemal karta
 *     hai jo worker istemal karta hai — yani rang aur jagah ka hisaab do jagah alag alag
 *     nahi likha gaya. Sirf naap chhota hai (transform: scale).
 *
 *  2. **Ungli se rakho, form se nahi.** Har cheez ko utha kar jahan chahen rakh den. Ye
 *     wo hunar hai jo har reseller ke paas pehle se hai — usay "top: 62%" samajhne ki
 *     zaroorat nahi honi chahiye.
 *
 * 🔴 Preview ka base CSS `templates/base.css` ki naqal hai (neeche `PREVIEW_BASE_CSS`).
 * Wo file worker ke paas hai aur is bundle mein nahi aati. Naqal hone ki wajah se wo
 * asal se hat sakti hai — is liye ye YAAD RAHE: asli faisla hamesha render ka hai,
 * preview taqreeb hai. Jo cheez yahan theek dikhe magar render mein toote, us ka ilaj
 * base.css mein hai, yahan nahi.
 */

const CANVAS_W = 1080
const CANVAS_H = 1920

/** `templates/base.css` ka wo hissa jo preview ke liye chahiye — dekhen upar wala note. */
const PREVIEW_BASE_CSS = `
.tpl-stage {
  position: relative;
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
.tpl-stage .seller-phone {
  direction: ltr; font-family: system-ui, sans-serif;
  font-weight: 700; color: #fff; white-space: nowrap;
}
.tpl-stage .cta { line-height: 2.1; color: #fff; opacity: .92; white-space: nowrap; }
`

/** Har wo cheez jise uthaya ja sakta hai. */
const DRAGGABLE = ['badge', 'title', 'price', 'name', 'phone', 'cta'] as const
type ElementKey = (typeof DRAGGABLE)[number]

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

  const selected = templates.find((template) => template.id === selectedId) ?? null
  const [name, setName] = useState(selected?.name ?? '')
  const [spec, setSpec] = useState<TemplateSpec>(selected?.spec ?? DEFAULT_TEMPLATE_SPEC)

  const stageRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<ElementKey | null>(null)

  function choose(template: EditorTemplate) {
    setSelectedId(template.id)
    setName(template.name)
    setSpec(template.spec)
    setSaved(false)
    setError(null)
  }

  function patch(next: Partial<TemplateSpec>) {
    setSpec((current) => ({ ...current, ...next }))
    setSaved(false)
  }

  function patchElement(key: ElementKey, next: Partial<TemplateSpec['elements'][ElementKey]>) {
    setSpec((current) => ({
      ...current,
      elements: { ...current.elements, [key]: { ...current.elements[key], ...next } },
    }))
    setSaved(false)
  }

  /**
   * Uthana aur rakhna.
   *
   * Pointer events (mouse/touch dono) — aur `setPointerCapture` is liye ke ungli tezi se
   * chale to wo element se bahar nikal jati hai aur bina capture ke drag beech mein
   * chhoot jata hai. Phone par ye har dafa hota hai.
   */
  function onPointerDown(key: ElementKey, event: React.PointerEvent) {
    event.preventDefault()
    ;(event.target as HTMLElement).setPointerCapture(event.pointerId)
    setDragging(key)
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!dragging || !stageRef.current) return
    const box = stageRef.current.getBoundingClientRect()

    // RTL: x us kinare se naapa jata hai jahan se parhna shuru hota hai (daayen)
    const xFromStart = ((box.right - event.clientX) / box.width) * 100
    const y = ((event.clientY - box.top) / box.height) * 100

    patchElement(dragging, {
      x: Math.min(96, Math.max(0, Math.round(xFromStart))),
      y: Math.min(96, Math.max(0, Math.round(y))),
    })
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
    if (selectedId === id) {
      setSelectedId(null)
      setSpec(DEFAULT_TEMPLATE_SPEC)
      setName('')
    }
  }

  function startNew() {
    setSelectedId(null)
    setName('')
    setSpec(DEFAULT_TEMPLATE_SPEC)
    setSaved(false)
  }

  const isDefault = Boolean(selectedId && defaultKey?.startsWith(`custom:${selectedId}@`))

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* ---------------- Baayen: preview ---------------- */}
      <div className="lg:order-2">
        <style dangerouslySetInnerHTML={{ __html: PREVIEW_BASE_CSS }} />
        {/*
          🔴 Wohi function jo worker chalata hai. Do jagah alag hisaab likhne ka matlab
          hota ke preview aur asli tasveer chup chaap ek doosre se hat jayen.
        */}
        <style dangerouslySetInnerHTML={{ __html: templateSpecToCss(spec) }} />

        <div className="mx-auto w-full max-w-[320px]">
          <div
            className="relative overflow-hidden rounded-card shadow-soft"
            style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
          >
            <div
              ref={stageRef}
              onPointerMove={onPointerMove}
              onPointerUp={() => setDragging(null)}
              className="tpl-stage stage custom absolute left-0 top-0 origin-top-left"
              style={{ transform: `scale(${320 / CANVAS_W})` }}
            >
              {/*
                Namoona tasveer ki jagah ek gehra dhalta hua rang.
                Asli tasveer file rakhne ka matlab hota ek aur asset jo deploy par
                chhoot sakta hai — aur us ke chhootne par editor khali safed dikhta,
                jahan safed likhai bilkul nazar na aati.
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
                <DragBox k="badge" spec={spec} dragging={dragging} onDown={onPointerDown}>
                  <div className="badge">{spec.badgeText || '—'}</div>
                </DragBox>

                <div className="bottom">
                  <DragBox k="title" spec={spec} dragging={dragging} onDown={onPointerDown}>
                    <div className="title">{t('sampleProductTitle')}</div>
                  </DragBox>

                  <DragBox k="price" spec={spec} dragging={dragging} onDown={onPointerDown}>
                    <div className="price-row">
                      <div className="price">{formatPkr(pkr(2850))}</div>
                    </div>
                  </DragBox>

                  <div className="seller">
                    <DragBox k="name" spec={spec} dragging={dragging} onDown={onPointerDown}>
                      <div className="seller-name">{t('sampleSellerName')}</div>
                    </DragBox>
                    <DragBox k="phone" spec={spec} dragging={dragging} onDown={onPointerDown}>
                      <div className="seller-phone">0300 1234567</div>
                    </DragBox>
                  </div>

                  <DragBox k="cta" spec={spec} dragging={dragging} onDown={onPointerDown}>
                    <div className="cta">{t('sampleCta')}</div>
                  </DragBox>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-[0.78rem] text-ink-faint">{t('dragHint')}</p>
        </div>
      </div>

      {/* ---------------- Daayen: qabu ---------------- */}
      <div className="space-y-6 lg:order-1">
        {/* Mere template */}
        <div className="card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{t('myTemplates')}</h2>
            <button type="button" onClick={startNew} className="btn-secondary !py-1.5 text-[0.8rem]">
              {t('newTemplate')}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {templates.length === 0 && (
              <p className="text-sm text-ink-soft">{t('noTemplatesYet')}</p>
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
                  className="link-tap flex-1 text-right text-[0.9rem] font-semibold"
                >
                  {template.name}
                  {defaultKey?.startsWith(`custom:${template.id}@`) && (
                    <span className="mr-2 text-[0.7rem] text-accent-700">★ {t('isDefault')}</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(template.id)}
                  disabled={busy}
                  className="text-[0.75rem] text-ink-faint underline"
                >
                  {t('deleteTemplate')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Naam aur badge */}
        <div className="card space-y-4 p-5">
          <label className="block">
            <span className="text-sm font-semibold">{t('templateName')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder={t('myTemplate')}
              className="field mt-2 w-full"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold">{t('badgeText')}</span>
            <input
              value={spec.badgeText}
              onChange={(e) => patch({ badgeText: e.target.value })}
              maxLength={24}
              className="field mt-2 w-full"
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
            <p className="text-sm font-semibold">{t('bottomCard')}</p>
            <div className="rail mt-2">
              {(['none', 'light', 'dark'] as const).map((card) => (
                <button
                  key={card}
                  type="button"
                  onClick={() => patch({ card })}
                  className={spec.card === card ? 'chip chip-active' : 'chip'}
                >
                  {card === 'none' ? t('cardNone') : card === 'light' ? t('cardLight') : t('cardDark')}
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

        {/* Har cheez ka naap aur dikhna */}
        <div className="card space-y-3 p-5">
          <p className="text-sm font-semibold">{t('elementsTitle')}</p>
          {DRAGGABLE.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => patchElement(key, { show: !spec.elements[key].show })}
                className={
                  spec.elements[key].show
                    ? 'chip chip-active !py-1 text-[0.75rem]'
                    : 'chip !py-1 text-[0.75rem]'
                }
              >
                {t(ELEMENT_LABEL[key])}
              </button>
              <input
                type="range"
                min={16}
                max={160}
                value={spec.elements[key].size}
                onChange={(e) => patchElement(key, { size: Number(e.target.value) })}
                disabled={!spec.elements[key].show}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-pill bg-paper-sunken accent-brand-500"
              />
              <span dir="ltr" className="numeric w-10 text-[0.72rem] text-ink-faint">
                {spec.elements[key].size}
              </span>
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={save} disabled={busy} className="btn-primary flex-1">
            {saved ? t('savedTick') : t('saveTemplate')}
          </button>
          <button
            type="button"
            onClick={makeDefault}
            disabled={busy || !selectedId || isDefault}
            className="btn-secondary flex-1"
          >
            {isDefault ? `★ ${t('isDefault')}` : t('makeDefault')}
          </button>
        </div>
      </div>
    </div>
  )
}

const ELEMENT_LABEL: Record<ElementKey, 'elBadge' | 'elTitle' | 'elPrice' | 'elName' | 'elPhone' | 'elCta'> = {
  badge: 'elBadge',
  title: 'elTitle',
  price: 'elPrice',
  name: 'elName',
  phone: 'elPhone',
  cta: 'elCta',
}

/**
 * Uthane wala khaana.
 *
 * Jagah spec ke CSS se aati hai (`templateSpecToCss`), yahan se nahi — warna do jagah
 * hisaab hota aur preview asli render se hat jata. Ye sirf pakarne ka nishan lagata hai.
 */
function DragBox({
  k,
  spec,
  dragging,
  onDown,
  children,
}: {
  k: ElementKey
  spec: TemplateSpec
  dragging: ElementKey | null
  onDown: (key: ElementKey, event: React.PointerEvent) => void
  children: React.ReactNode
}) {
  if (!spec.elements[k].show) return null

  return (
    <div
      onPointerDown={(event) => onDown(k, event)}
      style={{ cursor: 'grab', touchAction: 'none' }}
      className={dragging === k ? 'opacity-70 outline-dashed outline-8 outline-white/70' : ''}
    >
      {children}
    </div>
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
      <span className="text-[0.8rem] font-semibold">{label}</span>
      <div className="mt-2 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-transparent"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          maxLength={7}
          className="field numeric w-full text-[0.8rem]"
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
        <span className="text-[0.8rem] font-semibold">{label}</span>
        <span dir="ltr" className="numeric text-[0.72rem] text-ink-faint">
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
