'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  DEFAULT_TEMPLATE_SPEC,
  FONT_KEYS,
  TEMPLATE_PRESETS,
  formatPkr,
  pkr,
  templateSpecToCss,
  type FontKey,
  type ShapeLayer,
  type TemplateSpec,
} from '@oyebazar/shared'
import {
  AlignCentreIcon,
  AlignEndIcon,
  AlignIcon,
  AlignStartIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  BringFrontIcon,
  ExpandIcon,
  EyeIcon,
  EyeOffIcon,
  FillIcon,
  FontIcon,
  GearIcon,
  LayersIcon,
  MoreIcon,
  RedoIcon,
  ShapesIcon,
  SendBehindIcon,
  ShrinkIcon,
  SizeIcon,
  TextBiggerIcon,
  TextSmallerIcon,
  TemplateIcon,
  TextColourIcon,
  TextIcon,
  TrashIcon,
  UndoIcon,
  UploadIcon,
} from '@/components/icons'
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

/**
 * Har cheez ka mushtarak naqsha — toolbar, drag aur keyboard sirf isi ko chhute hain.
 *
 * 🔴 `size` aur `width` DO ALAG cheezein hain, aur farq asli hai: likhai ka naap font
 * size hai, tasveer ka naap us ki chaurai. Dono ko ek khana bana dene par tasveer ka
 * "naap" font size ban jata, jis ka `<img>` par koi asar hi nahi hota — aur reseller
 * handle khinchti rehti aur kuch na hota.
 */
type PartStyle = {
  kind: 'element' | 'text' | 'image' | 'shape'
  show: boolean
  x: number
  y: number
  /** Likhai ka naap — element aur text par. */
  size?: number | undefined
  /** Tasveer aur shakl ki chaurai, canvas ke feesad mein. */
  width?: number | undefined
  /** Sirf shakl par — text apni likhai se aur tasveer apni nisbat se oonchai banate hain. */
  height?: number | undefined
  colour?: string | undefined
  opacity?: number | undefined
  rotate?: number | undefined
  font?: FontKey | undefined
  pill?: boolean | undefined
  /** Us dabbe ka apna rang — dabbe ke baghair be-asar, dekhen `ElementSpec`. */
  pillColour?: string | undefined
  radius?: number | undefined
  /** Maal ke naam/qeemat ke peechay jaye ya oopar — shapes ki poori wajah yehi hai. */
  behind?: boolean | undefined
}

function layerIndex(sel: Sel): number | null {
  return sel.startsWith('L') ? Number(sel.slice(1)) : null
}

function part(spec: TemplateSpec, sel: Sel): PartStyle | null {
  const index = layerIndex(sel)
  if (index === null) return { kind: 'element', ...spec.elements[sel as ElementKey] }

  const layer = spec.layers?.[index]
  if (!layer) return null
  return { ...layer, kind: layer.kind }
}

/**
 * Button ke nishan ke liye — wohi polygon jo render istemal karta hai.
 *
 * Naqal hone ki wajah `templateSpecToCss` ka andar ka hissa hai (wo CSS ki string
 * banata hai, alag alag qadrein nahi deta). Ye sirf NISHAN hai — asli shakl hamesha
 * render ki hai; yahan farq aa bhi jaye to sirf button thora alag dikhega.
 */
const SHAPE_PREVIEW_CLIP: Partial<Record<string, string>> = {
  triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
  diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
  star: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
  arrow: 'polygon(0% 25%, 60% 25%, 60% 0%, 100% 50%, 60% 100%, 60% 75%, 0% 75%)',
  burst:
    'polygon(50% 0%, 58% 18%, 79% 10%, 76% 32%, 97% 32%, 84% 50%, 97% 68%, 76% 68%, 79% 90%, 58% 82%, 50% 100%, 42% 82%, 21% 90%, 24% 68%, 3% 68%, 16% 50%, 3% 32%, 24% 32%, 21% 10%, 42% 18%)',
}

/**
 * Baayen rail ke darwaze — tarteeb kaam ke hisaab se.
 *
 * "Design" pehle kyunke har naya template wahin se shuru hota hai, aur "settings"
 * aakhir mein kyunke wo sab se kam khula jata hai.
 */
const TABS = [
  { id: 'design', Icon: TemplateIcon, label: 'tabDesign' },
  { id: 'text', Icon: TextIcon, label: 'tabText' },
  { id: 'shapes', Icon: ShapesIcon, label: 'tabShapes' },
  { id: 'upload', Icon: UploadIcon, label: 'tabUpload' },
  { id: 'layers', Icon: LayersIcon, label: 'tabLayers' },
  { id: 'settings', Icon: GearIcon, label: 'tabSettings' },
] as const

type TabId = (typeof TABS)[number]['id']

/**
 * Chuni hui cheez ke qabu — har ek apna tray kholta hai.
 *
 * 🔴 Tarteeb ittefaqi nahi. Reseller ne jo teen sawal poochhe — "foreground color kaise
 * change hota hai, background color kaise change hota hai, shape kaise apply hota hai" —
 * un mein se do ka jawab yahan pehle DO buttons hain. Jo cheez sab se zyada poochhi
 * jaye wo qatar mein sab se pehle honi chahiye, chhupi hui nahi.
 *
 * `text` sab se aage hai kyunke jab likhai hi badalni ho to baqi kuch maani nahi rakhta.
 */
type ToolId = 'text' | 'colour' | 'bg' | 'font' | 'size' | 'place' | 'more'

const FONT_LABEL = {
  nastaliq: 'fontNastaliq',
  naskh: 'fontNaskh',
  amiri: 'fontAmiri',
  cairo: 'fontCairo',
  latin: 'fontLatin',
  poppins: 'fontPoppins',
  playfair: 'fontPlayfair',
} as const

/**
 * Dropdown mein har naam apni HI likhai mein.
 *
 * 🔴 Ye web ke fonts hain, worker ke nahi. Browser mein sirf Nastaliq aur Inter load
 * hote hain (globals.css); baqi ke liye system ka sab se qareeb font chalta hai. Namoona
 * taqreeban theek rehta hai — aur asli faisla hamesha render ka hai.
 */
const FONT_PREVIEW: Record<string, string> = {
  nastaliq: "'Noto Nastaliq Urdu', serif",
  naskh: "'Noto Naskh Arabic', serif",
  amiri: 'Amiri, serif',
  cairo: 'Cairo, sans-serif',
  latin: 'Inter, system-ui, sans-serif',
  poppins: 'Poppins, system-ui, sans-serif',
  playfair: "'Playfair Display', Georgia, serif",
}

const SHAPE_LABEL = {
  rect: 'shapeRect',
  circle: 'shapeCircle',
  line: 'shapeLine',
  triangle: 'shapeTriangle',
  diamond: 'shapeDiamond',
  star: 'shapeStar',
  arrow: 'shapeArrow',
  burst: 'shapeBurst',
} as const

/**
 * Kaun sa handle pakra gaya hai.
 *
 * Naam MANTIQI hain, jugrafiyai nahi: `is` = inline-start (Urdu mein daayan kinara,
 * angrezi mein baayan), `ie` = inline-end, `bs` = block-start (upar), `be` = neeche.
 *
 * 🔴 "Left/right" likhna yahan ghalti ki jar banta: pack Urdu (RTL) aur angrezi (LTR)
 * dono mein banta hai, aur us soorat mein aadhe handle ulti simt kaam karte.
 */
export type HandleId = 'move' | 'is' | 'ie' | 'bs' | 'be' | 'is-bs' | 'ie-bs' | 'is-be' | 'ie-be'

/** Kis handle par kaun si simt khinchti hai. */
const PULLS_INLINE_START = (h: HandleId) => h === 'is' || h === 'is-bs' || h === 'is-be'
const PULLS_INLINE_END = (h: HandleId) => h === 'ie' || h === 'ie-bs' || h === 'ie-be'
const PULLS_BLOCK_START = (h: HandleId) => h === 'bs' || h === 'is-bs' || h === 'ie-bs'
const PULLS_BLOCK_END = (h: HandleId) => h === 'be' || h === 'is-be' || h === 'ie-be'

/** Naap ka khana — tasveer aur shakl par `width`, likhai par `size`. */
function sizeFieldOf(style: PartStyle): 'size' | 'width' {
  return style.kind === 'image' || style.kind === 'shape' ? 'width' : 'size'
}

/** Canvas par mojood har cheez — snap aur list dono isi se bante hain. */
function allParts(spec: TemplateSpec): { sel: Sel; style: PartStyle }[] {
  return [
    ...ELEMENTS.map((key) => ({ sel: key as Sel, style: part(spec, key)! })),
    ...(spec.layers ?? []).map((layer, index) => ({
      sel: `L${index}` as Sel,
      style: { ...layer, kind: layer.kind } as PartStyle,
    })),
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
  /**
   * Reseller ke apne maal ki tasveerein — canvas ke peechay lagane ke liye.
   *
   * 🔴 Ye spec ka hissa NAHI hain aur na honi chahiyen: template har maal par lagta
   * hai, aur us mein kisi ek maal ki tasveer baandh dena poore maqsad ke khilaf hai.
   * Ye sirf DEKHNE ke liye hai — taake reseller andaza laga sake ke us ka design asli
   * tasveer par kaisa lagega.
   */
  photos: string[]
  locale: Locale
}

export function TemplateEditor({
  templates: initial,
  defaultTemplateKey,
  photos,
  locale,
}: Props) {
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
  /**
   * Chuni hui cheez ka kaun sa qabu khula hai — rang, likhai, naap waghera.
   *
   * 🔴 Poore editor ka sab se ahem faisla yehi hai, aur ye teen dafa ghalat baitha.
   *
   * Pehle ye qabu baayen panel mein the. Us ka natija ye tha ke ek hi cheez ke qabu DO
   * alag column mein bant gaye — naap canvas ke neeche, rang panel mein — aur reseller
   * ne bilkul theek poochha: "foreground color kaise change hota hai, background color
   * kaise change hota hai". Jawab ye tha ke rang panel mein neeche scroll mein para
   * hai, aur peechay ka rang mojood hi nahi tha.
   *
   * Canva phone par jo karta hai wohi yahan hai: cheez chunte hi us ke NEECHE ek qatar
   * aati hai — rang, لکھائی, سائز — aur us mein se kisi par tap karne se usi ka tray
   * neeche khulta hai. Ek waqt mein ek sawal, hamesha usi jagah, aur wo jagah us cheez
   * ke bilkul paas jise badla ja raha hai.
   *
   * Baayan panel ab sirf cheezein DAALNE ke liye hai (design, text, shapes, tasveer) —
   * jaisa Canva mein hai. Do maqsad ek panel mein mila dena hi asal gharbar thi.
   */
  const [tool, setTool] = useState<ToolId | null>(null)
  /**
   * Chalta hua drag — aur us ke saath wo jagah jahan se cheez PAKRI gayi thi.
   *
   * 🔴 `grabInline`/`grabBlock` ke baghair cheez ungli ke neeche CHHALANG lagati hai.
   *
   * Cheez ki jagah us ke shuru wale kone se naapi jati hai (`x`, `y`). Agar drag ke
   * waqt seedha ungli ki jagah `x` par likh di jaye, to jis ne qeemat ko us ke BEECH se
   * pakra tha us ki qeemat foran khisak kar apna kona ungli ke neeche le aati hai. Ek
   * saada tap bhi cheez ko hila deta tha — reseller ke liye ye "cheez khud hi hil gayi"
   * jaisa lagta hai, aur wohi cheez editor ko be-qaboo mehsoos karati hai.
   *
   * Is liye pakarte waqt kone aur ungli ka faasla mehfooz kar lete hain, aur har harkat
   * par wohi faasla ghata dete hain. Nateeja: cheez ungli ke saath chalti hai, ungli ke
   * neeche kood ti nahi.
   */
  const [drag, setDrag] = useState<{
    key: Sel
    mode: HandleId
    grabInline: number
    grabBlock: number
  } | null>(null)
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] })
  /**
   * Zoom — reseller ka apna, aur wo jo jagah ke mutabiq khud nikalta hai.
   *
   * 🔴 Pehle zoom ek tay-shuda 0.28 tha. 1920 ka canvas us par 538px ka ho jata tha,
   * aur laptop ki screen par wo top bar aur neeche wale toolbar ke saath mil kar safhe
   * se bahar nikal jata — reseller ko canvas aur us ke qabu ke darmiyan baar baar upar
   * neeche jana parta tha. Canva mein poora editor ek hi screen par baithta hai; wohi
   * yahan bhi hona chahiye.
   *
   * `fitZoom` jagah naap kar khud banta hai; `zoomMultiplier` reseller ka apna hai
   * (+/− buttons). Asal zoom dono ka hasil hai — yani screen chhoti ho ya bari, "fit"
   * hamesha fit rehta hai aur reseller ka chunao us ke upar lagta hai.
   */
  /**
   * 🔴 SAADA aur ZIYADA — poore editor ka sab se ahem faisla.
   *
   * Hamari reseller design tool nahi chalati; wo WhatsApp par maal bechti hai. Us ke
   * saamne "opacity", "rotate", "z-index" aur `#F2600C` jaise khaane rakhna us kaam ko
   * mushkil bana deta hai jo asal mein teen tap ka hai: rang chuno, cheezein jahan
   * chahiye wahan rakho, mehfooz karo.
   *
   * Is liye default SAADA hai — sirf wo cheezein jo har koi pehli nazar mein samajhta
   * hai. Baqi sab "زیادہ" ke peechay hai: mojood, magar raste mein nahi. Jis ko chahiye
   * usay ek tap door hai; jis ko nahi chahiye usay kabhi nazar hi nahi aata.
   */
  /*
   * Reseller train ho sakti hai — is liye default ab poora qabu hai, chhupa hua nahi.
   * "کم دکھائیں" phir bhi mojood hai us ke liye jise sirf rang badalna hai.
   */
  const [advanced, setAdvanced] = useState(true)

  /**
   * Kaun sa panel khula hai — Canva wala baayen icon rail.
   *
   * 🔴 Sab kuch ek panel mein thoons dene ki jagah CHHE alag darwaze. Wajah ye nahi ke
   * jagah kam thi; wajah ye hai ke banda ek waqt mein EK kaam karta hai — ya to design
   * chun raha hai, ya text likh raha hai, ya rang badal raha hai. Sab ek saath dikhane
   * se har kaam baqi paanch ke shor mein karna parta hai.
   */
  const [tab, setTab] = useState<TabId>('design')

  /**
   * Tasveer par (ya list mein) kisi cheez par tap.
   *
   * Nayi cheez chunte hi khula hua tray band — warna banda "رنگ" khol kar doosri cheez
   * par tap karta aur tray to khula rehta magar wo ab kisi AUR cheez ka rang badal raha
   * hota. Ye wo ghalti hai jo nazar aane mein waqt leti hai.
   */
  function pick(key: Sel) {
    setSelected(key)
    if (key !== selected) setTool(null)
  }

  /** Kaam khatam — chunao aur khula hua tray, dono chhor do. */
  function unpick() {
    setSelected(null)
    setTool(null)
  }

  /**
   * Poori screen — editor safhe ke upar aa jata hai.
   *
   * 🔴 Do tareeqe ek saath, aur dono zaroori hain:
   *
   *  · `position: fixed` wala overlay — YE asal kaam karta hai. App ka header, side nav
   *    aur safhe ki padding sab ke upar aa jata hai, aur ye HAR jagah chalta hai.
   *  · Browser ka apna fullscreen (`requestFullscreen`) — us se browser ki apni pattiyan
   *    bhi chali jati hain, yani aur 100–150px canvas ko milte hain.
   *
   * Sirf browser wale par bharosa nahi kiya ja sakta: wo iframe mein, kuch phone ke
   * browsers mein, aur bina "user gesture" ke chalta hi nahi — aur us soorat mein banda
   * button dabata aur kuch na hota.
   */
  const [fullscreen, setFullscreen] = useState(false)

  /** Canvas ke peechay konsi tasveer — sirf dekhne ke liye, spec ka hissa nahi. */
  const [photo, setPhoto] = useState<string | null>(photos[0] ?? null)

  /**
   * 🔴 Bina mehfooz kiye safha chhorne par tanbeeh.
   *
   * Template banane mein pandra bees minute lagte hain, aur wo poora kaam ek ghalat tap
   * par zaya ho sakta hai — koi nav ka button, ya browser ka "wapas". Us nuqsan ki koi
   * marammat nahi: undo bhi safha chhorne ke baad kaam nahi aata.
   *
   * Browser apna hi paighaam dikhata hai (hum us ka matn nahi badal sakte), magar wo
   * ruk to jata hai — aur rukna hi asal cheez hai.
   */
  useEffect(() => {
    /*
     * 🔴 Shart ka har hissa ginti mein aata hai — ye pehle ULTI likhi hui thi.
     *
     * `!selectedId` likha tha, yani mehfooz shuda template khulte hi tanbeeh chalu ho
     * jati thi — bina kisi ke kuch badle. Reseller /templates kholti, kuch na karti,
     * "Dashboard" dabati, aur browser poochhta "Leave site?". Aisi tanbeeh jo har dafa
     * be-wajah aaye wo apna kaam khud khatam kar deti hai: banda usay parhna chhor kar
     * hamesha "Leave" dabane lagta hai — aur phir jis din tabdeeli waqai kachi hoti hai,
     * us din bhi wohi dabata hai.
     *
     * Ab tanbeeh sirf do sooraton mein: kuch badla ho (`past`), ya template abhi
     * mehfooz hua hi na ho (koi `selectedId` nahi).
     */
    if (saved || (past.length === 0 && selectedId)) return

    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      // Purane browsers ke liye — naye sirf `preventDefault` dekhte hain
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saved, past.length, selectedId])

  function toggleFullscreen() {
    const next = !fullscreen
    setFullscreen(next)

    // Nakami par kuch nahi karna — overlay to lag hi chuka hai
    if (next) void document.documentElement.requestFullscreen?.().catch(() => undefined)
    else void document.exitFullscreen?.().catch(() => undefined)
  }

  /*
   * Browser ka fullscreen banda `Esc` se ya browser ke apne button se bhi chhor sakta
   * hai — us soorat mein hamara overlay bhi utarna chahiye, warna wo bina fullscreen ke
   * poore safhe par chipka reh jata hai.
   */
  useEffect(() => {
    function onChange() {
      if (!document.fullscreenElement) setFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const [fitZoom, setFitZoom] = useState(0.28)
  const [zoomMultiplier, setZoomMultiplier] = useState(1)
  const [uploading, setUploading] = useState(false)

  const stageRef = useRef<HTMLDivElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)

  /**
   * Canvas apni jagah ke mutabiq — har dafa, har naap par.
   *
   * `ResizeObserver` is liye ke jagah sirf window resize se nahi badalti: side panel
   * ka scrollbar aana, phone ka ghoomna, keyboard khulna — sab us dabbe ka naap badalte
   * hain aur window ka `resize` un mein se kai par chalta hi nahi.
   */
  useEffect(() => {
    const area = canvasAreaRef.current
    if (!area) return

    const measure = () => {
      const { width, height } = area.getBoundingClientRect()
      if (width === 0 || height === 0) return
      // 0.94 — kinare par thori saans, warna canvas dabbe se bilkul chipak jata hai
      // 0.99 — kinare par bas itni saans ke saaya kata na lage. Pehle 0.94 tha, aur wo
      // chhoti screen par canvas ko be-wajah 6%% chhota kar deta tha.
      setFitZoom(Math.min(width / CANVAS_W, height / CANVAS_H) * 0.99)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(area)
    return () => observer.disconnect()
  }, [])

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
      // Caller sirf usi qism ke khaane bhejta hai jo ye layer hai (dekhen `sizeFieldOf`)
      layers[index] = { ...layer, ...next } as typeof layer
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
  function startDrag(key: Sel, mode: HandleId, event: React.PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    pick(key)

    /*
     * Capture ki nakami se chunao nahi marna chahiye.
     *
     * `setPointerCapture` un pointer par phenkta hai jo ab active nahi rahe (ungli
     * uthate hi ye ho jata hai, aur kuch browsers mein mouse par bhi). Pehle ye line
     * `pick` se PEHLE thi aur us ke phenkne par cheez chunni hi nahi jati thi —
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

    /*
     * Kone aur ungli ka faasla — sirf `move` par. Kone ke handle par ye faasla hai hi
     * nahi (wahan ungli KA hi matlab naya kinara hai), is liye wahan sifar.
     */
    const box = stageRef.current?.getBoundingClientRect()
    const style = part(spec, key)
    const grab =
      mode === 'move' && box && style
        ? {
            grabInline: ((box.right - event.clientX) / box.width) * 100 - style.x,
            grabBlock: ((event.clientY - box.top) / box.height) * 100 - style.y,
          }
        : { grabInline: 0, grabBlock: 0 }

    setDrag({ key, mode, ...grab })
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!drag || !stageRef.current) return
    const box = stageRef.current.getBoundingClientRect()

    const dragged = part(spec, drag.key)
    if (!dragged) return

    // Ungli/mouse kahan hai — mantiqi paimane mein (inline = us kinare se jahan se parhna shuru)
    const pointerInline = ((box.right - event.clientX) / box.width) * 100
    const pointerBlock = ((event.clientY - box.top) / box.height) * 100

    if (drag.mode !== 'move') {
      /*
       * Charon taraf se naap badalna.
       *
       * Har handle ke do sawal hain: kaun si simt khinch rahi hai, aur us se kya badalta
       * hai. Inline-END wala handle sirf chaurai barhata hai (anchor apni jagah), magar
       * inline-START wala handle chaurai AUR jagah dono badalta hai — kyunke `x` us
       * kinare ka pata hai. Yehi baat block (upar/neeche) par bhi lagti hai.
       */
      const handle = drag.mode
      const next: Partial<PartStyle> = {}

      if (dragged.width !== undefined) {
        if (PULLS_INLINE_END(handle)) {
          next.width = clampSize(pointerInline - dragged.x, 2, 100)
        } else if (PULLS_INLINE_START(handle)) {
          const farEdge = dragged.x + dragged.width
          const start = Math.min(farEdge - 2, Math.max(0, pointerInline))
          next.x = Math.round(start)
          next.width = clampSize(farEdge - start, 2, 100)
        }
      }

      if (dragged.height !== undefined) {
        if (PULLS_BLOCK_END(handle)) {
          next.height = clampSize(pointerBlock - dragged.y, 1, 60)
        } else if (PULLS_BLOCK_START(handle)) {
          const farEdge = dragged.y + dragged.height
          const start = Math.min(farEdge - 1, Math.max(0, pointerBlock))
          next.y = Math.round(start)
          next.height = clampSize(farEdge - start, 1, 60)
        }
      }

      /*
       * Likhai ka naap font size hai, chaurai nahi — us par sirf neeche wala kona chalta
       * hai, aur wo jitna neeche khincho utna bara.
       */
      if (dragged.width === undefined && PULLS_BLOCK_END(handle)) {
        const pulled = Math.max(0, pointerBlock - dragged.y)
        next.size = Math.min(160, Math.max(16, Math.round(16 + pulled * 6)))
      }

      if (Object.keys(next).length > 0) patchPart(drag.key, next, false)
      return
    }

    // Kone ki jagah = ungli ki jagah manha wo faasla jahan se pakri gayi thi
    let x = pointerInline - drag.grabInline
    let y = pointerBlock - drag.grabBlock

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

      /*
       * Escape ka do darjay ka matlab: pehle chuni hui cheez chhoro, phir poori screen
       * se niklo. Ek hi dafa mein dono karna banday ko chaunka deta hai — wo sirf
       * cheez chhorna chahta tha aur poora editor simat gaya.
       */
      if (event.key === 'Escape' && !selected && fullscreen) {
        event.preventDefault()
        toggleFullscreen()
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
        Escape: () => unpick(),
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
    unpick()
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
    unpick()
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

  /**
   * Naqal — mojooda design se naya banao.
   *
   * Server par nahi bhejta: sirf canvas par le aata hai naye naam ke saath, aur reseller
   * "محفوظ کریں" daba kar tay karti hai ke ye waqai chahiye ya nahi. Foran mehfooz kar
   * dene se har ghalat tap ek naya template bana deta.
   */
  function duplicate(template: EditorTemplate) {
    setSelectedId(null)
    setName(`${template.name} ${t('copySuffix')}`)
    setSpec(template.spec)
    setPast([])
    setFuture([])
    unpick()
    setSaved(false)
    setTab('design')
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
    const layer = spec.layers?.[index]
    if (!layer) return t('myText')
    if (layer.kind === 'image') return t('myLogo')
    if (layer.kind === 'shape') return t(SHAPE_LABEL[layer.shape])
    return layer.text || t('myText')
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
    pick(`L${layers.length - 1}`)
  }

  /**
   * Logo — pehle upload, phir layer.
   *
   * 🔴 URL sirf server se aata hai (upload ka jawab). Reseller kabhi apna pata nahi
   * likhti — aur save par server dobara jaanchta hai ke ye pata hamari apni storage ka
   * hai (dekhen lib/api/template-assets.ts).
   */
  async function addLogo(file: File) {
    if ((spec.layers?.length ?? 0) >= 6) return

    setUploading(true)
    setError(null)

    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/v1/templates/upload', { method: 'POST', body: form }).catch(
      () => null,
    )
    setUploading(false)

    if (!res?.ok) {
      const payload = (await res?.json().catch(() => null)) as
        | { error?: { message?: string } }
        | undefined
      setError(payload?.error?.message ?? t('somethingWrong'))
      return
    }

    const { url } = (await res.json()) as { url: string }
    const layers = [...(spec.layers ?? [])]
    /*
     * Ulte kone mein — badge (x:4, y:9) ke saamne.
     *
     * Pehle ye 6,6 par girta tha aur seedha badge ke upar baith jata tha. Nayi cheez ka
     * pehla tassur "ye toot gaya" nahi hona chahiye, chahe usay khiskana ek hi ghaseet
     * ka kaam ho.
     */
    layers.push({ kind: 'image', url, show: true, x: 72, y: 5, width: 18 })
    commit({ ...spec, layers })
    pick(`L${layers.length - 1}`)
  }

  /**
   * Rang ki shakl — patti, daira, ya lakeer.
   *
   * Shuruaati naap har shakl ka apna: patti chauri aur patli (likhai ke peechay lagti
   * hai), daira chokor (warna wo anda ban jata hai), lakeer bohat patli.
   */
  function addShape(shape: ShapeLayer['shape']) {
    const layers = [...(spec.layers ?? [])]
    if (layers.length >= 6) return

    const size =
      shape === 'circle'
        ? { width: 20, height: 11 }
        : shape === 'line'
          ? { width: 40, height: 1 }
          : { width: 46, height: 7 }

    layers.push({ kind: 'shape', shape, show: true, x: 8, y: 40, ...size })
    commit({ ...spec, layers })
    pick(`L${layers.length - 1}`)
  }

  function setLayerText(index: number, text: string) {
    const layers = [...(spec.layers ?? [])]
    const layer = layers[index]
    if (layer?.kind !== 'text') return
    layers[index] = { ...layer, text }
    commit({ ...spec, layers })
  }

  function removeLayer(index: number) {
    const layers = (spec.layers ?? []).filter((_, i) => i !== index)
    commit({ ...spec, layers })
    unpick()
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

  /**
   * A− / A+ — chuni hui cheez ka naap.
   *
   * Tasveer par chaurai badalti hai (3–60% canvas), likhai par font size (16–160px).
   * Ek hi button dono ke liye, magar paimana apna apna.
   */
  function resizeSelected(direction: -1 | 1) {
    if (!selected) return
    const style = part(spec, selected)
    if (!style) return

    if (sizeFieldOf(style) === 'width') {
      const width = (style.width ?? 18) + direction * 2
      patchPart(selected, { width: Math.min(60, Math.max(3, width)) })
    } else {
      const size = (style.size ?? 40) + direction * 4
      patchPart(selected, { size: Math.min(160, Math.max(16, size)) })
    }
  }

  /** Chuni hui layer ka asal record — toolbar ko us ka `kind` chahiye. */
  const selectedLayerIndex = selected ? layerIndex(selected) : null
  const selectedLayer = selectedLayerIndex !== null ? spec.layers?.[selectedLayerIndex] : undefined

  /**
   * Likhai wali cheez hai ya nahi — rang ka dabba aur font sirf isi par maani rakhte hain.
   *
   * Tay-shuda chhe cheezein (badge, title, qeemat, naam, number, CTA) sab likhai hain,
   * aur un par `selectedLayer` hota hi nahi — is liye "layer nahi hai" bhi likhai hi hai.
   */
  const isTextish =
    Boolean(selected) && selectedLayer?.kind !== 'image' && selectedLayer?.kind !== 'shape'

  /**
   * Jo likhai badli ja sakti hai — teen alag jagahon se, magar UI ke liye EK khana.
   *
   * 🔴 Pehle ye teen alag input the aur teenon alag jagah rakhe the: badge ka text
   * "سیٹنگ" ke darwaze mein, CTA ka kahin nahi, aur apni layer ka panel mein. Reseller
   * badge par tap karti, rang aur font milta, magar LIKHAI badalne ka rasta nazar hi na
   * aata — "text change ka option to hai hi nahi".
   *
   * `null` ka matlab hai "ye likhai badli hi nahi ja sakti" (qeemat, naam, number — wo
   * maal aur profile se aate hain), aur us soorat mein button hi nahi banta.
   */
  const editableText: string | null =
    selectedLayer?.kind === 'text'
      ? selectedLayer.text
      : selected === 'badge'
        ? spec.badgeText
        : selected === 'cta'
          ? (spec.ctaText ?? '')
          : null

  function setEditableText(value: string) {
    if (selectedLayer?.kind === 'text' && selectedLayerIndex !== null) {
      setLayerText(selectedLayerIndex, value)
    } else if (selected === 'badge') {
      patch({ badgeText: value })
    } else if (selected === 'cta') {
      patch({ ctaText: value })
    }
  }

  const isDefault = Boolean(selectedId && defaultKey?.startsWith(`custom:${selectedId}@`))
  const css = useMemo(() => templateSpecToCss(spec), [spec])
  const zoom = fitZoom * zoomMultiplier

  return (
    /*
     * Poora editor EK screen par — safha khud scroll nahi hota.
     *
     * `h-full` + har column ka apna `overflow-y-auto`. Iske baghair canvas aur us ke
     * qabu ek hi lambi qatar ban jate the aur reseller ko un ke darmiyan baar baar upar
     * neeche jana parta tha. `min-h-0` har us jagah lazmi hai jahan flex ka bachcha
     * scroll karta hai — us ke baghair flex bachche ko simatne hi nahi deta aur scroll
     * kahin nahi hota, bas safha lamba hota jata hai.
     */
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-50 flex h-[100dvh] flex-col gap-2 bg-paper p-2'
          : 'flex flex-col gap-2 lg:h-full'
      }
    >
      {/*
        ---------------- Ooper ki patti ----------------

        Gehri patti jaan boojh kar: har design tool ka chehra yehi hai, aur us ki ek
        amali wajah hai — canvas ke rang chamak kar saamne aate hain jab un ke ird gird
        ka chehra khamosh ho. Safed patti par naranji badge aur safed card ek doosre se
        larte hain, aur reseller ko apna design theek se nazar nahi aata.

        Yehi rang Content Studio ke sar par pehle se hai (bg-coal-900) — ye naya mizaj
        nahi, wohi hai.
      */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 rounded-card bg-coal-900 p-2 text-white">
        <div className="flex items-center gap-1">
          <IconButton label={t('undo')} onClick={undo} disabled={past.length === 0} dark>
            <UndoIcon className="h-4 w-4" />
          </IconButton>
          <IconButton label={t('redo')} onClick={redo} disabled={future.length === 0} dark>
            <RedoIcon className="h-4 w-4" />
          </IconButton>
        </div>

        {/*
          Zoom "fit" ke upar lagta hai, us ki jagah nahi leta. 100% ka matlab "jitna
          jagah mein aata hai" — reseller ke liye yehi qudrati hai, 28% nahi.
        */}
        <div className="flex items-center gap-1">
          <IconButton
            label={t('zoomOut')}
            onClick={() => setZoomMultiplier((z) => Math.max(0.5, z - 0.2))}
            dark
          >
            −
          </IconButton>
          <button
            type="button"
            onClick={() => setZoomMultiplier(1)}
            title={t('zoomFit')}
            className="numeric w-12 rounded-lg py-1 text-center text-[0.75rem] text-white/60 transition hover:bg-white/10 hover:text-white"
            dir="ltr"
          >
            {Math.round(zoomMultiplier * 100)}%
          </button>
          <IconButton
            label={t('zoomIn')}
            onClick={() => setZoomMultiplier((z) => Math.min(3, z + 0.2))}
            dark
          >
            +
          </IconButton>

          <IconButton
            label={fullscreen ? t('exitFullscreen') : t('enterFullscreen')}
            onClick={toggleFullscreen}
            dark
          >
            {fullscreen ? <ShrinkIcon className="h-4 w-4" /> : <ExpandIcon className="h-4 w-4" />}
          </IconButton>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder={t('myTemplate')}
          className="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-[0.88rem] text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
        />

        <button type="button" onClick={save} disabled={busy} className="btn-primary !py-1.5">
          {saved ? t('savedTick') : t('saveTemplate')}
        </button>
        <button
          type="button"
          onClick={makeDefault}
          disabled={busy || !selectedId || isDefault}
          className="shrink-0 rounded-pill border border-white/25 px-3 py-1.5 text-[0.82rem] font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
        >
          {isDefault ? `★ ${t('isDefault')}` : t('makeDefault')}
        </button>
      </div>

      {error && <p className="shrink-0 text-sm text-red-600">{error}</p>}

      {/*
        🔴 `min-h-0` aur `flex-1` sirf `lg:` par.

        Bari screen par ye teen column hain aur har ek apne andar scroll karta hai —
        wahan `min-h-0` lazmi hai, warna flex bachche ko simatne hi nahi deta aur scroll
        kahin nahi hota. Phone par ye ek qatar hai aur safha khud scroll karta hai; wahan
        wohi `min-h-0` har column ko sifar oonchai par gira deta tha — isi wajah se
        canvas ka naap 0×0 nikla tha.
      */}
      <div className="grid gap-2 lg:min-h-0 lg:flex-1 lg:grid-cols-[auto_minmax(0,260px)_minmax(0,1fr)]">
        {/*
          ---------------- Baayen icon rail ----------------

          Canva ka sab se pehchana hua hissa. Phone par ye neeche ki patti ban jati hai
          (jahan angootha pohanchta hai), computer par baayen taraf khari.

          🔴 Ye rail sirf ek sawal ka jawab deti hai: "tasveer par NAYI kya daalni hai".
          Chuni hui cheez ko badalne ka koi button yahan nahi — wo sab canvas ke neeche
          wali qatar mein hai, us cheez ke paas jise badla ja raha hai. Dono maqsad ek
          panel mein mila dene se hi wo gharbar hui thi jis mein rang dhoondhe nahi
          milta tha.
        */}
        <div className="order-2 lg:order-1 lg:min-h-0">
          <div className="card flex gap-1 p-1.5 lg:h-full lg:flex-col">
            {TABS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                aria-label={t(entry.label)}
                title={t(entry.label)}
                aria-pressed={tab === entry.id}
                className={
                  tab === entry.id
                    ? 'flex min-h-tap flex-1 flex-col items-center justify-center gap-0.5 rounded-xl bg-accent-50 px-2 py-2 text-accent-700 lg:flex-none lg:w-14'
                    : 'tap flex min-h-tap flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-2 text-ink-soft lg:flex-none lg:w-14'
                }
              >
                <entry.Icon className="h-[1.15rem] w-[1.15rem]" />
                <span className="text-[0.62rem] font-semibold leading-tight">{t(entry.label)}</span>
              </button>
            ))}
          </div>
        </div>


        {/* ---------------- Khula hua panel ---------------- */}
        {tab === 'design' && (
        <div className="card order-3 p-4 lg:order-2 lg:min-h-0 lg:overflow-y-auto">
          <h2 className="text-[0.95rem] font-bold">{t('startFrom')}</h2>
          <p className="mt-1 text-[0.75rem] text-ink-faint">{t('startFromHint')}</p>
          {/* Shakl dekh kar chunen, naam parh kar nahi — dekhen TemplateThumb ka note */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {TEMPLATE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => startNew(preset.spec)}
                className="tap flex flex-col items-center gap-1"
              >
                <TemplateThumb spec={preset.spec} photo={photo} />
                <span className="w-full truncate text-center text-[0.68rem] font-semibold">
                  {locale === 'ur' ? preset.nameUr : preset.nameEn}
                </span>
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
                  className="tap flex min-w-0 flex-1 items-center gap-2 text-right"
                >
                  <TemplateThumb spec={template.spec} photo={photo} />
                  <span className="min-w-0 flex-1 truncate text-[0.85rem] font-semibold">
                    {template.name}
                    {defaultKey?.startsWith(`custom:${template.id}@`) && (
                      <span className="mr-1 text-[0.68rem] text-accent-700">★</span>
                    )}
                  </span>
                </button>

                <div className="flex shrink-0 flex-col gap-1">
                  {/*
                    Naqal — sab se aam kaam jo pehle mumkin hi nahi tha.
                    Reseller ka ek design chal jata hai; agla wo sifar se nahi, USI se
                    banana chahti hai (Eid wala, phir sale wala). Naqal ke baghair usay
                    poora kaam dobara karna parta tha.
                  */}
                  <button
                    type="button"
                    onClick={() => duplicate(template)}
                    disabled={busy}
                    className="text-[0.7rem] text-ink-faint underline"
                  >
                    {t('duplicateTemplate')}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(template.id)}
                    disabled={busy}
                    className="text-[0.7rem] text-ink-faint underline"
                  >
                    {t('deleteTemplate')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* ---------------- Canvas ---------------- */}
        <div className="order-1 flex flex-col lg:order-3 lg:min-h-0">
          <style dangerouslySetInnerHTML={{ __html: PREVIEW_BASE_CSS }} />
          {/*
            🔴 Wohi function jo worker chalata hai. Do jagah alag hisaab likhne ka matlab
            hota ke preview aur asli tasveer chup chaap ek doosre se hat jayen.
          */}
          <style dangerouslySetInnerHTML={{ __html: css }} />

          {/*
            Canvas ka apna maidan — `fitZoom` isi dabbe ko naap kar banta hai.

            🔴 Do bilkul alag shaklen, aur dono zaroori hain:

            · **Bari screen (lg+):** jitni jagah bachti hai utni le leta hai, aur safha
              khud scroll hota hi nahi. Canvas aur us ke qabu saath dikhte hain.
            · **Phone:** teen column ek qatar mein aa jate hain, is liye safha lamba
              hona hi hai — us se larne ka faida nahi. Us soorat mein canvas UPAR
              CHIPKA rehta hai (sticky): reseller neeche qabu tak scroll karti hai magar
              apna design nazar se ojhal nahi hota. Yehi wo cheez thi jo tang kar rahi
              thi — tabdeeli karo, phir wapas upar ja kar dekho.

            `top-[4.25rem]`: app ka apna header bhi sticky hai, canvas us ke neeche.
          */}
          <div
            ref={canvasAreaRef}
            /*
             * 🔴 `max-h` sirf ek ehtiyat hai, aur wo zaroori hai.
             *
             * Aam soorat mein `flex-1` aur `ResizeObserver` mil kar canvas ko theek naap
             * dete hain. Magar agar kisi wajah se naap 0 aa jaye (dabba abhi bana hi
             * nahi, tab chhupa hua hai, print), to `fitZoom` apni shuruaati qadar par
             * atak jata hai — aur us soorat mein canvas apne dabbe se bara ho kar POORE
             * SAFHE ko lamba kar deta, yani wohi masla jo hum theek kar rahe hain.
             *
             * `max-h` us surat mein bhi dabbe ko bandha rakhta hai; canvas bara hua to
             * scroll ISI dabbe ke andar hoga (`overflow-auto`), safhe ka nahi.
             */
            className="sticky top-[4.25rem] z-10 flex h-[55vh] min-h-[12rem] items-center justify-center overflow-auto rounded-card bg-coal-900/[0.06] p-1.5 lg:static lg:h-auto lg:max-h-none lg:min-h-[15rem] lg:flex-1"
          >
            <div
              className="relative shrink-0 overflow-hidden rounded-card shadow-[0_18px_50px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/10"
              style={{ width: CANVAS_W * zoom, height: CANVAS_H * zoom }}
              // Khali jagah par tap = kuch bhi chuna hua nahi
              onPointerDown={unpick}
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
                  🔴 Reseller ke apne maal ki tasveer — banawati rang nahi.

                  Ye is editor ka sab se ahem sudhaar hai. Gradient par safed likhai
                  hamesha saaf lagti thi, magar lawn ki halki tasveer par wo gum ho jati
                  hai — aur ye farq reseller ko pack banane ke BAAD pata chalta tha, yani
                  jab wo usay WhatsApp par laga chuki hoti.

                  Tasveer na ho (naya account, ya catalogue khali) to wohi purana gradient
                  — kyunke safed canvas par safed likhai bilkul nazar nahi aati.
                */}
                {photo ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- storage se aayi hui asli tasveer */
                  <img className="photo" src={photo} alt="" />
                ) : (
                  <div
                    className="photo"
                    style={{
                      background:
                        'linear-gradient(150deg, #7c3f1d 0%, #b45309 35%, #3f3f46 75%, #18181b 100%)',
                    }}
                  />
                )}
                <div className="scrim" />

                <div className="content">
                  <Handle
                    k="badge"
                    cssClass="badge"
                    {...{ spec, selected, drag, startDrag, pick }}
                  >
                    {spec.badgeText || '—'}
                  </Handle>

                  <div className="bottom">
                    <Handle
                      k="title"
                      cssClass="title"
                      {...{ spec, selected, drag, startDrag, pick }}
                    >
                      {t('sampleProductTitle')}
                    </Handle>

                    <Handle
                      k="price"
                      cssClass="price-row"
                      {...{ spec, selected, drag, startDrag, pick }}
                    >
                      <div className="price">{formatPkr(pkr(2850))}</div>
                    </Handle>

                    <div className="seller">
                      <Handle
                        k="name"
                        cssClass="seller-name"
                        {...{ spec, selected, drag, startDrag, pick }}
                      >
                        {t('sampleSellerName')}
                      </Handle>
                      <Handle
                        k="phone"
                        cssClass="seller-phone"
                        {...{ spec, selected, drag, startDrag, pick }}
                      >
                        {/* LTR andar wale span par — dekhen templates/layout.html ka note */}
                        <span className="ltr">0300 1234567</span>
                      </Handle>
                    </div>

                    <Handle
                      k="cta"
                      cssClass="cta"
                      {...{ spec, selected, drag, startDrag, pick }}
                    >
                      {spec.ctaText?.trim() || t('sampleCta')}
                    </Handle>
                  </div>

                  {/* Reseller ka apna likha hua text — baad wala upar (z-index list se) */}
                  {(spec.layers ?? []).map((layer, index) => (
                    <Handle
                      key={index}
                      k={`L${index}`}
                      cssClass={`layer-${index}`}
                      {...{ spec, selected, drag, startDrag, pick }}
                    >
                      {layer.kind === 'image' ? (
                        /* eslint-disable-next-line @next/next/no-img-element -- storage se aaya hua logo; naap spec ke CSS se aata hai */
                        <img src={layer.url} alt="" className="block w-full" />
                      ) : layer.kind === 'shape' ? null : (
                        layer.text
                      )}
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

          {/*
            Ishara sirf tab jab kuch chuna hua NA ho.
            Chunne ke baad toolbar khud saamne hota hai aur ye qatar sirf oonchai khati
            hai — aur chhoti screen par har qatar canvas se cheeni gayi jagah hai.
          */}
          {/*
            Apne maal ki tasveerein — canvas ke neeche, chhoti patti mein.

            Design ka faisla tasveer ke saath badalta hai: jo rang gehri tasveer par
            chamakta hai wo halki par ghul jata hai. Do-teen tasveerein badal kar dekhna
            hi wo tareeqa hai jis se banda ek AISA template banata hai jo har maal par
            chalta hai — sirf us ek par nahi jo abhi saamne hai.
          */}
          {photos.length > 1 && (
            <div className="mt-1.5 flex shrink-0 items-center justify-center gap-1.5">
              {photos.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setPhoto(url)}
                  aria-label={t('tryOnPhoto')}
                  title={t('tryOnPhoto')}
                  className={
                    photo === url
                      ? 'h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-2 ring-accent-700'
                      : 'tap h-8 w-8 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10'
                  }
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- storage ki tasveer */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {!selected && (
            <p className="mt-1.5 shrink-0 text-center text-[0.72rem] text-ink-faint">
              {t('dragHint')}
            </p>
          )}

          {/*
            ---------------- Chuni hui cheez ke qabu ----------------

            🔴 Canva ka phone wala tareeqa, aur ye jaan boojh kar hai.

            Reseller ne teen sawal poochhe: "foreground color kaise change hota hai,
            background color kaise change hota hai, shape kaise apply hota hai". Teenon
            ka jawab pehle "kahin aur" tha — rang baayen panel ke scroll mein, naap yahan
            neeche, aur peechay ka rang mojood hi nahi tha.

            Ab ek qatar hai, us cheez ke bilkul neeche jise badla ja raha hai, aur us
            mein se har button apna tray isi jagah kholta hai. Ek waqt mein ek sawal.

            Qatar EK line rehti hai — jagah kam pare to khud scroll karti hai. Pehle yehi
            wrap ho kar teen qatarein ban jati thi aur canvas ke liye 60px chhorti thi.
          */}
          {selected && (
            <div className="card mt-1.5 shrink-0">
              <div className="flex flex-nowrap items-center gap-1 overflow-x-auto p-1.5">
                <span className="shrink-0 px-1 text-[0.78rem] font-bold">
                  {partLabel(selected)}
                </span>

                {/* Likhai khud — sirf jab wo waqai badli ja sakti ho */}
                {editableText !== null && (
                  <ToolButton id="text" active={tool} onPick={setTool} label={t('toolText')}>
                    <TextIcon className="h-[1.15rem] w-[1.15rem]" />
                  </ToolButton>
                )}

                {/*
                  Rang ka button KHUD apna rang dikhata hai.

                  Ye "متن کا رنگ" likh dene se behtar hai: banda parhta nahi, dekhta hai.
                  Canva mein bhi rang ka button ek bhara hua khaana hai, lafz nahi.
                */}
                {selectedLayer?.kind !== 'image' && (
                  <ToolButton id="colour" active={tool} onPick={setTool} label={t('toolColour')}>
                    <span
                      className="flex flex-col items-center leading-none"
                      style={{ color: part(spec, selected)?.colour ?? undefined }}
                    >
                      <TextColourIcon className="h-[1.15rem] w-[1.15rem]" />
                    </span>
                  </ToolButton>
                )}

                {/* Peechay ka rang — yehi wo cheez thi jo pehle THI hi nahi */}
                {isTextish && (
                  <ToolButton id="bg" active={tool} onPick={setTool} label={t('toolBg')}>
                    <FillIcon
                      className="h-[1.15rem] w-[1.15rem]"
                      style={
                        isPillOn(spec, selected)
                          ? { color: part(spec, selected)?.pillColour ?? spec.accent }
                          : undefined
                      }
                    />
                  </ToolButton>
                )}

                {isTextish && (
                  <ToolButton id="font" active={tool} onPick={setTool} label={t('toolFont')}>
                    <FontIcon className="h-[1.15rem] w-[1.15rem]" />
                  </ToolButton>
                )}

                <ToolButton id="size" active={tool} onPick={setTool} label={t('toolSize')}>
                  <SizeIcon className="h-[1.15rem] w-[1.15rem]" />
                </ToolButton>

                <ToolButton id="place" active={tool} onPick={setTool} label={t('toolPlace')}>
                  <AlignIcon className="h-[1.15rem] w-[1.15rem]" />
                </ToolButton>

                <ToolButton id="more" active={tool} onPick={setTool} label={t('toolMore')}>
                  <MoreIcon className="h-[1.15rem] w-[1.15rem]" />
                </ToolButton>

                <button
                  type="button"
                  onClick={() => patchPart(selected, { show: false })}
                  className="ms-auto shrink-0 whitespace-nowrap ps-2 text-[0.78rem] text-ink-soft underline"
                >
                  {t('hideThis')}
                </button>
              </div>

              {/* ---------------- Tray ---------------- */}
              {tool && (
                /*
                  🔴 `max-h` aur `overflow-y-auto` — dono lazmi hain.

                  Tray `shrink-0` hai aur canvas `flex-1`, is liye bina hadd ke ek lamba
                  tray canvas ko SIFAR par gira deta hai. Live par bilkul yehi hua:
                  "پیچھے کا رنگ" kholte hi design gayab ho gaya aur sirf rang ke khaane
                  bache. Canva mein bhi rang chunte waqt design saamne rehta hai — warna
                  banda dekh hi nahi sakta ke rang jama ya nahi.

                  `max-w` isi ka doosra rukh hai: chaure tray mein nau khaane 60px ke
                  ho jate the aur qabu tasveer se bara lagne lagta tha.
                */
                <div className="max-h-[34vh] overflow-y-auto border-t border-line p-3">
                  <div className="mx-auto max-w-sm">
                  {tool === 'text' && editableText !== null && (
                    <div>
                      <input
                        value={editableText}
                        onChange={(e) => setEditableText(e.target.value)}
                        maxLength={40}
                        placeholder={t('myTextSample')}
                        className="field w-full text-[0.95rem]"
                      />
                      {selectedLayer?.kind === 'text' && (
                        <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-faint">
                          {t('layerWarning')}
                        </p>
                      )}
                    </div>
                  )}

                  {tool === 'colour' && (
                    <SwatchRow
                      label={selectedLayer?.kind === 'shape' ? t('shapeColour') : t('textColour')}
                      customLabel={t('customColour')}
                      showHex={advanced}
                      accent={spec.accent}
                      value={part(spec, selected)?.colour}
                      onChange={(colour) => patchPart(selected, { colour })}
                    />
                  )}

                  {/*
                    Peechay ka rang — aur "koi nahi" usi tray mein.

                    🔴 Rang chunna KHUD "haan, dabba chahiye" ka jawab hai, is liye
                    swatch `pill: true` bhi lagata hai. Do alag sawal poochhna (dabba ho
                    ya na ho, aur kis rang ka) yahan faltu hai — reseller sirf ye chahti
                    hai ke bhari hui tasveer par us ki likhai parhi ja sake.
                  */}
                  {tool === 'bg' && (
                    <div className="space-y-2">
                      <SwatchRow
                        label={t('bgColour')}
                        customLabel={t('customColour')}
                        showHex={advanced}
                        accent={spec.accent}
                        value={
                          isPillOn(spec, selected)
                            ? (part(spec, selected)?.pillColour ?? spec.accent)
                            : undefined
                        }
                        onChange={(pillColour) => patchPart(selected, { pill: true, pillColour })}
                      />
                      <button
                        type="button"
                        onClick={() => patchPart(selected, { pill: false })}
                        className={
                          isPillOn(spec, selected)
                            ? 'tap w-full rounded-xl border border-line py-2 text-[0.8rem] font-semibold'
                            : 'w-full rounded-xl bg-accent-50 py-2 text-[0.8rem] font-semibold text-accent-700'
                        }
                      >
                        {t('bgNone')}
                      </button>
                    </div>
                  )}

                  {/*
                    Font — poori list, aur har naam apni HI likhai mein.

                    Dropdown ki jagah khule hue khaane: banda chunne se PEHLE dekh leta
                    hai ke wo kaisa lagega, aur ungli ko bara nishana milta hai.
                  */}
                  {tool === 'font' && (
                    <div className="grid grid-cols-2 gap-1.5">
                      {FONT_KEYS.map((font) => {
                        const on = (part(spec, selected)?.font ?? 'nastaliq') === font
                        return (
                          <button
                            key={font}
                            type="button"
                            onClick={() => patchPart(selected, { font })}
                            className={
                              on
                                ? 'rounded-xl bg-accent-50 px-2 py-2 text-[0.95rem] text-accent-700 ring-1 ring-accent-600'
                                : 'tap rounded-xl px-2 py-2 text-[0.95rem] ring-1 ring-line'
                            }
                            style={{ fontFamily: FONT_PREVIEW[font] }}
                          >
                            {t(FONT_LABEL[font])}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {tool === 'size' && (
                    <div className="flex items-center gap-3">
                      <IconButton label={t('smaller')} onClick={() => resizeSelected(-1)}>
                        <TextSmallerIcon className="h-4 w-4" />
                      </IconButton>
                      <div className="flex-1">
                        {selectedLayer?.kind === 'image' ? (
                          <SliderField
                            label={t('toolSize')}
                            value={selectedLayer.width}
                            min={3}
                            max={60}
                            onChange={(width) => patchPart(selected, { width })}
                          />
                        ) : (
                          <SliderField
                            label={t('toolSize')}
                            value={part(spec, selected)?.size ?? 40}
                            min={16}
                            max={160}
                            onChange={(size) => patchPart(selected, { size })}
                          />
                        )}
                      </div>
                      <IconButton label={t('bigger')} onClick={() => resizeSelected(1)}>
                        <TextBiggerIcon className="h-4 w-4" />
                      </IconButton>
                    </div>
                  )}

                  {tool === 'place' && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {EDGE_GUIDES.map((x) => (
                        <IconButton
                          key={x}
                          label={
                            x === 4 ? t('alignStart') : x === 50 ? t('alignCentre') : t('alignEnd')
                          }
                          onClick={() => patchPart(selected, { x })}
                        >
                          {x === 4 ? (
                            <AlignStartIcon className="h-4 w-4" />
                          ) : x === 50 ? (
                            <AlignCentreIcon className="h-4 w-4" />
                          ) : (
                            <AlignEndIcon className="h-4 w-4" />
                          )}
                        </IconButton>
                      ))}
                      <span className="w-2" />
                      <IconButton
                        label={t('nudgeUp')}
                        onClick={() =>
                          patchPart(selected, { y: clamp((part(spec, selected)?.y ?? 0) - 2) })
                        }
                      >
                        <ArrowUpIcon className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label={t('nudgeDown')}
                        onClick={() =>
                          patchPart(selected, { y: clamp((part(spec, selected)?.y ?? 0) + 2) })
                        }
                      >
                        <ArrowDownIcon className="h-4 w-4" />
                      </IconButton>
                      {/*
                        Peechay / aage — sirf apni layers par.

                        🔴 Shapes ki poori wajah yehi switch hai: rang ki patti ka kaam
                        likhai ko PARHNE LAIQ banana hai, aur agar wo hamesha upar rahe
                        to wo usi likhai ko dhaanp leti hai jis ke liye lagayi gayi thi.
                      */}
                      {selectedLayer && (
                        <IconButton
                          label={selectedLayer.behind ? t('sendFront') : t('sendBehind')}
                          onClick={() => patchPart(selected, { behind: !selectedLayer.behind })}
                        >
                          {selectedLayer.behind ? (
                            <BringFrontIcon className="h-4 w-4" />
                          ) : (
                            <SendBehindIcon className="h-4 w-4" />
                          )}
                        </IconButton>
                      )}
                    </div>
                  )}

                  {tool === 'more' && (
                    <div className="space-y-2.5">
                      <SliderField
                        label={t('opacityLabel')}
                        value={part(spec, selected)?.opacity ?? 100}
                        min={10}
                        max={100}
                        onChange={(opacity) => patchPart(selected, { opacity })}
                      />
                      <SliderField
                        label={t('rotateLabel')}
                        value={part(spec, selected)?.rotate ?? 0}
                        min={-20}
                        max={20}
                        onChange={(rotate) => patchPart(selected, { rotate })}
                      />
                      {selectedLayer?.kind === 'shape' && (
                        <SliderField
                          label={t('shapeHeight')}
                          value={selectedLayer.height}
                          min={1}
                          max={60}
                          onChange={(height) => patchPart(selected, { height })}
                        />
                      )}
                      {selectedLayer?.kind === 'image' && (
                        <button
                          type="button"
                          onClick={() =>
                            patchPart(selected, { radius: selectedLayer.radius ? 0 : 50 })
                          }
                          className="tap w-full rounded-xl border border-line py-2 text-[0.8rem] font-semibold"
                        >
                          {t('roundLogo')}
                        </button>
                      )}
                      {/*
                        Jo maal se aata hai us ki wajah yahan likhi hai.

                        "Option hai hi nahi" aur "option is liye nahi ke ye khud maal se
                        aata hai" — do bilkul alag baatein hain, aur doosri ko khamoshi
                        se chhor dena pehli jaisa hi lagta hai.
                      */}
                      {(selected === 'title' ||
                        selected === 'price' ||
                        selected === 'name' ||
                        selected === 'phone') && (
                        <p className="rounded-xl bg-paper-sunken px-3 py-2 text-[0.74rem] leading-relaxed text-ink-soft">
                          {selected === 'title'
                            ? t('boundTitle')
                            : selected === 'price'
                              ? t('boundPrice')
                              : t('boundSeller')}
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---------------- Poore template ke faislay ---------------- */}
        {/*
          🔴 EK panel, EK scroll.

          Pehle yahan do alag card the aur DONO apne andar scroll karte the. Screen par
          us ka natija ye tha ke dono aadhe aadhe kate hue dikhte the, do scrollbar ek
          doosre ke saath, aur kisi bhi ek cheez ko poora dekhne ke liye pehle ye
          samajhna parta tha ke kaun sa dabba scroll karna hai.

          Ab bahar ka dabba scroll karta hai aur andar ke hisse sirf lakeeron se juda
          hain — jaisa har design tool ke side panel mein hota hai.
        */}
        {tab === 'settings' && (
        <div className="card order-3 lg:order-2 lg:min-h-0 lg:overflow-y-auto">
          <div className="space-y-4 p-4">
            <label className="block">
              <span className="text-[0.8rem] font-semibold">{t('badgeText')}</span>
              <input
                value={spec.badgeText}
                onChange={(e) => patch({ badgeText: e.target.value })}
                maxLength={24}
                className="field mt-2 w-full text-[0.9rem]"
              />
            </label>

            {/* Template ka apna rang — swatches se, hex ka khana sirf "زیادہ" par */}
            <SwatchRow
              label={t('accentColour')}
              customLabel={t('customColour')}
              showHex={advanced}
              accent={spec.accent}
              value={spec.accent}
              onChange={(accent) => patch({ accent })}
            />

            {advanced && (
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
            )}

            <div>
              <p className="text-[0.8rem] font-semibold">{t('bottomCard')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
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

            {/*
              🔴 Dhund, haashiya aur gol-pan — teenon "زیادہ" ke peechay.

              Ye asli qabu hain magar in ka faisla shakl (preset) ke saath aa chuka hota
              hai. Reseller ko in par sochna nahi chahiye; usay sirf ye dekhna chahiye ke
              tasveer achhi lag rahi hai ya nahi.
            */}
            {advanced && (
              <>
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
              </>
            )}

            {/*
              Saada / ziyada ka switch — panel ke AAKHIR mein, chhota aur khamosh.
              Jise chahiye wo dhoond lega; jise nahi chahiye us ki nazar isay chhoo kar
              guzar jayegi.
            */}
            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              className="w-full pt-1 text-[0.76rem] text-ink-faint underline"
            >
              {advanced ? t('showSimple') : t('showAdvanced')}
            </button>
          </div>
        </div>
        )}

        {(tab === 'layers' || tab === 'text' || tab === 'shapes' || tab === 'upload') && (
        <div className="card order-3 lg:order-2 lg:min-h-0 lg:overflow-y-auto">
          {/*
            Cheezon ki list — Canva ke "layers" wala kaam.

            Do masle ek saath hal karti hai:
             · Do cheezein ek doosre par charh jayen to tasveer par neeche wali ko tap
               karna namumkin ho jata hai. Yahan se wo hamesha chuni ja sakti hai.
             · Chhupi hui cheez tasveer par hai hi nahi — us par tap kar hi nahi sakte,
               yani bina is list ke wo hamesha ke liye gum ho jati.
          */}
          <div className="p-4">
            {/*
              List har darwaze par dikhti hai — kyunke jo cheez abhi banayi gayi hai,
              use foran list mein dekhna hi wo jagah hai jahan se usay chuna aur sanwara
              jata hai. Canva mein bhi layers hamesha haath ki pohanch mein rehti hain.
            */}
            {/*
              Shakl lagane ka rasta — bare khaane, shakl ke saath us ka naam.

              🔴 Pehle ye 36px ke chhote nishan the, bina naam ke, ek qatar mein thunse
              hue. Reseller ne poochha "shape kaise apply hota hai" — yani wo nazar hi
              nahi aa rahe the ke ye button hain.

              Ab har khaana ungli bhar ka hai, shakl bari hai aur naam saath likha hai,
              aur ek tap par wo shakl tasveer par aa jati hai. Canva mein bhi "Elements"
              bare khaane hain, chhote nishan nahi.
            */}
            {tab === 'shapes' && (
              <div>
                <p className="text-[0.85rem] font-bold">{t('addShape')}</p>
                <p className="mt-1 text-[0.74rem] leading-relaxed text-ink-faint">
                  {t('shapeHint')}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      'rect',
                      'circle',
                      'line',
                      'triangle',
                      'diamond',
                      'star',
                      'arrow',
                      'burst',
                    ] as const
                  ).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => addShape(shape)}
                      disabled={(spec.layers?.length ?? 0) >= 6}
                      className="tap flex flex-col items-center gap-1.5 rounded-xl bg-paper-sunken px-1 py-3 disabled:opacity-40"
                    >
                      {/*
                        Nishan wohi shakl hai jo banegi — `clip-path` bhi wohi jo asli
                        render istemal karta hai (SHAPE_PREVIEW_CLIP). Naam parh kar
                        banda "ہیرا" ka matlab nahi jaanta; shakl dekh kar foran jaan
                        jata hai. Naam sirf us ki tasdeeq ke liye hai.
                      */}
                      <span
                        className={
                          shape === 'line'
                            ? 'h-[4px] w-8 rounded-full bg-accent-700'
                            : shape === 'rect'
                              ? 'h-5 w-8 rounded-[3px] bg-accent-700'
                              : 'h-7 w-7 bg-accent-700'
                        }
                        style={
                          shape === 'circle'
                            ? { borderRadius: '50%' }
                            : SHAPE_PREVIEW_CLIP[shape]
                              ? { clipPath: SHAPE_PREVIEW_CLIP[shape] }
                              : undefined
                        }
                      />
                      <span className="text-[0.68rem] font-semibold leading-tight">
                        {t(SHAPE_LABEL[shape])}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              {tab === 'text' && (
              <button
                type="button"
                onClick={addLayer}
                disabled={(spec.layers?.length ?? 0) >= 6}
                className="btn-secondary !py-1.5 text-[0.8rem]"
              >
                + {t('addText')}
              </button>
              )}

              {tab === 'upload' && (
              <>
              {/*
                Logo — `<label>` ke andar chhupa hua file input.

                Ye button jaisa dikhta hai magar hai file chooser, jo phone par gallery
                seedha khol deta hai. Alag button aur alag input rakhne se ek extra tap
                barhta hai, aur wo tap kisi kaam ka nahi.
              */}
              <label
                className={
                  uploading || (spec.layers?.length ?? 0) >= 6
                    ? 'btn-secondary pointer-events-none !py-1.5 text-center text-[0.8rem] opacity-50'
                    : 'btn-secondary cursor-pointer !py-1.5 text-center text-[0.8rem]'
                }
              >
                {uploading ? t('uploading') : `+ ${t('addLogo')}`}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    // Input ko khali karna zaroori hai — warna wohi file dobara chunne
                    // par `change` chalta hi nahi
                    e.target.value = ''
                    if (file) void addLogo(file)
                  }}
                />
              </label>
              </>
              )}
            </div>

            {/*
              🔴 Tanbeeh chhupani nahi chahiye.

              Apna text kisi data se bandha hua nahi. Koi yahan RATE likh de to wo rate
              kabhi khud nahi badlega — reseller slider par rate badalti rahegi aur
              tasveer par purana likha rahega, aur us ka customer usi par order karega.
            */}
            {tab === 'text' && (
              <p className="mt-2 text-[0.72rem] leading-relaxed text-ink-faint">
                {t('layerWarning')}
              </p>
            )}

            <p className="mt-4 border-t border-line pt-3 text-[0.78rem] font-semibold text-ink-soft">
              {t('elementsTitle')}
            </p>

            {/*
              Cheezon ki list — Canva ke "layers" wali.

              🔴 Har qatar par us cheez ka apna NAMOONA hai, koi nishan nahi.

              Pehle yahan 14px ka ek rang bhara gola tha aur us par `T`. Wo "nishan" to
              tha magar batata kuch nahi tha: do text layers ka gola bilkul ek jaisa
              lagta tha, aur banda naam parh kar hi pehchan pata tha. Ab namoona wohi
              likhai, wohi rang aur wohi shakl dikhata hai jo tasveer par hai — apni
              likhi hui line ke pehle do harf bhi wahin hain. Ek nazar, aur pata chal
              jata hai ke kaun si qatar kis cheez ki hai.

              🔴 Tarteeb aur mitane ke button sirf CHUNI HUI qatar par.

              Har qatar par chaar button rakhne se list ek nazar mein shor lagti thi —
              aur wo chaaron 16px ke the, ungli ke liye chhote. Ab qatar par sirf aankh
              (jo sab se zyada dabti hai), aur baqi usi qatar par jis par kaam ho raha
              hai. Nateeja: list saaf, aur button bare.
            */}
            <div className="mt-1.5 space-y-1">
              {allParts(spec).map(({ sel, style }) => {
                const index = layerIndex(sel)
                const layer = index !== null ? spec.layers?.[index] : undefined
                const on = selected === sel
                return (
                  <div
                    key={sel}
                    className={
                      on
                        ? 'flex items-center gap-1.5 rounded-xl bg-accent-50 p-1 ring-1 ring-accent-600'
                        : 'flex items-center gap-1.5 rounded-xl p-1 ring-1 ring-line/70'
                    }
                  >
                    <button
                      type="button"
                      onClick={() => pick(sel)}
                      className="tap flex min-w-0 flex-1 items-center gap-2 text-start"
                    >
                      <LayerThumb sel={sel} style={style} layer={layer} accent={spec.accent} />

                      <span className="min-w-0 flex-1">
                        <span
                          className={
                            style.show
                              ? 'block truncate text-[0.8rem] font-semibold leading-tight'
                              : 'block truncate text-[0.8rem] font-semibold leading-tight text-ink-faint line-through'
                          }
                        >
                          {partLabel(sel)}
                        </span>
                        <span className="block truncate text-[0.62rem] leading-tight text-ink-faint">
                          {layer?.kind === 'image'
                            ? t('addLogo')
                            : layer?.kind === 'shape'
                              ? t(SHAPE_LABEL[layer.shape])
                              : t(FONT_LABEL[style.font ?? 'nastaliq'])}
                        </span>
                      </span>
                    </button>

                    {/* Tarteeb aur mitana — sirf chuni hui qatar par, aur ungli bhar ke */}
                    {on && index !== null && (
                      <>
                        <IconButton
                          label={t('bringForward')}
                          onClick={() => moveLayer(index, 1)}
                          disabled={index === (spec.layers?.length ?? 0) - 1}
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={t('sendBackward')}
                          onClick={() => moveLayer(index, -1)}
                          disabled={index === 0}
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </IconButton>
                        <IconButton
                          label={t('deleteTemplate')}
                          onClick={() => removeLayer(index)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </IconButton>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => patchPart(sel, { show: !style.show })}
                      aria-label={style.show ? t('hideThis') : t('showThis')}
                      title={style.show ? t('hideThis') : t('showThis')}
                      className={
                        style.show
                          ? 'tap flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-soft'
                          : 'tap flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-paper-sunken text-ink-faint'
                      }
                    >
                      {style.show ? (
                        <EyeIcon className="h-3.5 w-3.5" />
                      ) : (
                        <EyeOffIcon className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Rang ki shaklen — likhai ke peechay patti lagana sab se aam kaam hai */}
          </div>
        </div>
        )}
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

/** Naap ki hadd — aur poora hindsa, kyunke spec integer nahi magar UI saaf rehna chahiye. */
function clampSize(value: number, min: number, max: number): number {
  return Math.round(Math.min(max, Math.max(min, value)))
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
  pick,
  children,
}: {
  k: Sel
  cssClass: string
  spec: TemplateSpec
  selected: Sel | null
  drag: { key: Sel; mode: HandleId } | null
  startDrag: (key: Sel, mode: HandleId, event: React.PointerEvent) => void
  pick: (key: Sel) => void
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
        pick(k)
      }}
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      className={`${cssClass} ${
        isSelected
          ? 'outline-dashed outline-[6px] outline-offset-[10px] outline-white/80'
          : 'hover:outline-dashed hover:outline-[4px] hover:outline-offset-[10px] hover:outline-white/35'
      }`}
    >
      {children}

      {/*
        Naap ke handle — charon kone.

        🔴 Canvas simta hua hota hai (aksar 25–30%), is liye handle ko 1080-paimane par
        BARA banana parta hai. 56px yahan asli screen par ~15px ban jata hai — ungli ke
        liye bilkul kaafi. Chhota rakhne par wo ek nuqta ban jata hai jise pakra hi nahi
        ja sakta, aur reseller samajhti hai ke naap badalta hi nahi.

        Sirf kone (kinare wale nahi): aath handle chhoti shakl par ek doosre par charh
        jate hain, aur chaar kone har banday ko pehle se samajh aate hain.
      */}
      {isSelected &&
        (['is-bs', 'ie-bs', 'is-be', 'ie-be'] as const).map((handle) => {
          const top = handle.startsWith('bs') || handle.includes('-bs')
          const inlineStart = handle.startsWith('is')
          return (
            <div
              key={handle}
              onPointerDown={(event) => startDrag(k, handle, event)}
              style={{
                position: 'absolute',
                ...(inlineStart ? { insetInlineStart: -26 } : { insetInlineEnd: -26 }),
                ...(top ? { top: -26 } : { bottom: -26 }),
                width: 52,
                height: 52,
                borderRadius: 999,
                background: '#fff',
                border: '6px solid #C2410C',
                cursor: 'pointer',
                touchAction: 'none',
              }}
            />
          )
        })}
    </div>
  )
}

/**
 * Template ka chhota namoona — wohi spec, wohi CSS, bas bohat chhota.
 *
 * 🔴 Naam se koi nahi jaanta ke "فریم" ya "گہرا" kaisa dikhta hai. Shakl dekh kar
 * foran pata chal jata hai. Isi liye har design tool apne templates tasveer ke tor par
 * dikhata hai, list ke tor par nahi.
 *
 * `templateSpecToCss` wohi function hai jo asli render chalata hai — namoona aur asli
 * pack do alag hisaab se nahi bante. Yahan sirf naap chhota hai aur likhai namoona ki.
 */
function TemplateThumb({ spec, photo }: { spec: TemplateSpec; photo: string | null }) {
  /*
   * Har namoone ka apna class — warna do namoone ek doosre ka CSS le lete (dono
   * `.stage.custom` par chalte hain). `useId` har namoone ko apni pehchan deta hai.
   */
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const scale = THUMB_W / CANVAS_W

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10"
      style={{ width: THUMB_W, height: CANVAS_H * scale }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: templateSpecToCss(spec).replace(/\.stage\.custom/g, `.thumb-${id}`),
        }}
      />
      <div
        className={`tpl-stage stage custom thumb-${id}`}
        style={{ transform: `scale(${scale})` }}
      >
        {photo ? (
          /* eslint-disable-next-line @next/next/no-img-element -- storage ki tasveer */
          <img className="photo" src={photo} alt="" />
        ) : (
          <div
            className="photo"
            style={{ background: 'linear-gradient(150deg, #b45309, #18181b)' }}
          />
        )}
        <div className="scrim" />
        <div className="content">
          <div className="badge">{spec.badgeText || '—'}</div>
          <div className="bottom">
            <div className="title">اردو</div>
            <div className="price-row">
              <div className="price">Rs</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Layer list ka chhota namoona — nishan nahi, asal shakl.
 *
 * 🔴 Tile GEHRA hai, aur ye zaroori hai.
 *
 * Pack ki likhai zyada tar SAFED hoti hai (bhari hui tasveer par wohi parhi jati hai).
 * Safed tile par safed likhai ka namoona bilkul khali dabba lagta hai — yani jo cheez
 * dikhane ke liye banaya gaya wo hi nazar nahi aati. Gehra tile wohi kaam karta hai jo
 * asli pack mein tasveer karti hai.
 */
function LayerThumb({
  sel,
  style,
  layer,
  accent,
}: {
  sel: Sel
  style: PartStyle
  layer: NonNullable<TemplateSpec['layers']>[number] | undefined
  accent: string
}) {
  const box = 'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg'

  if (layer?.kind === 'image') {
    return (
      <span className={`${box} bg-paper-sunken`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- storage ki tasveer */}
        <img src={layer.url} alt="" className="h-full w-full object-cover" />
      </span>
    )
  }

  if (layer?.kind === 'shape') {
    return (
      <span className={`${box} bg-coal-900`}>
        <span
          className={layer.shape === 'line' ? 'h-[3px] w-5' : 'h-4 w-4'}
          style={{
            background: layer.colour ?? accent,
            borderRadius: layer.shape === 'circle' ? '50%' : '2px',
            ...(SHAPE_PREVIEW_CLIP[layer.shape]
              ? { clipPath: SHAPE_PREVIEW_CLIP[layer.shape] }
              : {}),
          }}
        />
      </span>
    )
  }

  /*
   * Likhai ka namoona — apni likhi hui line ke pehle do harf, aur baqi par "آ".
   *
   * Do harf is liye ke poori line 36px mein ghus hi nahi sakti, aur ek harf se font ka
   * mizaj nazar nahi aata. Tay-shuda cheezon (qeemat, naam, number) ka matn editor ko
   * pata hi nahi — wo maal aur profile se aata hai — is liye wahan ek Urdu harf.
   */
  const sample = layer?.kind === 'text' ? layer.text.slice(0, 2) : sel === 'price' ? '₨' : 'آ'
  const pillOn = style.pill ?? (sel === 'badge' || sel === 'price')

  return (
    <span className={`${box} bg-coal-900`}>
      <span
        className="max-w-full truncate px-1 text-[0.72rem] font-bold leading-none"
        style={{
          fontFamily: FONT_PREVIEW[style.font ?? 'nastaliq'],
          color: style.colour ?? '#ffffff',
          ...(pillOn
            ? {
                background: style.pillColour ?? accent,
                borderRadius: 999,
                padding: '2px 5px',
              }
            : {}),
        }}
      >
        {sample}
      </span>
    </span>
  )
}

/** Namoone ki chaurai — is se chhota par shakl pehchani hi nahi jati. */
const THUMB_W = 54

/**
 * Chuni hui cheez ke qatar ka ek button — nishan oopar, naam neeche.
 *
 * 🔴 Naam nazar aata hai, `title` mein chhupa hua nahi.
 *
 * Phone par `title` ka koi wujood hi nahi (hover hota hi nahi), aur sirf nishan par
 * chhor dene ka matlab hai ke banda har button ko tap kar ke dekhe ke ye kya karta hai.
 * "⋯" aur "▥" apne aap kuch nahi kehte. Naam do harf ka hai magar wohi farq hai ke
 * reseller ko rang DHOONDHNA parey ya wo saamne ho.
 *
 * Dobara tap karne se tray band — kholne aur band karne ka ek hi button, jaisa Canva
 * mein hai. Alag "✕" ek aur cheez seekhne ki hai.
 */
function ToolButton({
  id,
  active,
  onPick,
  label,
  children,
}: {
  id: ToolId
  active: ToolId | null
  onPick: (next: ToolId | null) => void
  label: string
  children: React.ReactNode
}) {
  const on = active === id
  return (
    <button
      type="button"
      onClick={() => onPick(on ? null : id)}
      aria-label={label}
      aria-pressed={on}
      className={
        on
          ? 'flex min-h-tap w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-accent-50 px-1 py-1.5 text-accent-700 ring-1 ring-accent-600'
          : 'tap flex min-h-tap w-14 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-ink'
      }
    >
      {children}
      <span className="w-full truncate text-center text-[0.6rem] font-semibold leading-tight">
        {label}
      </span>
    </button>
  )
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  dark = false,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  /** Gehri patti par — wahan `bg-paper-sunken` bilkul nazar nahi aata. */
  dark?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={
        dark
          ? 'flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-[0.85rem] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'
          : 'tap flex h-9 min-w-9 items-center justify-center rounded-xl bg-paper-sunken px-2 text-[0.85rem] font-semibold disabled:opacity-35'
      }
    >
      {children}
    </button>
  )
}

/**
 * Rang — tap karne wale khaane, hex ka khana nahi.
 *
 * 🔴 `#F2600C` likhna ek hunar hai jo hamari reseller ke paas nahi, aur hona bhi nahi
 * chahiye. Aath rang jo asal mein chalte hain (safed, kala, aur brand ke rang) us ke
 * liye kaafi hain, aur har ek ek tap door hai.
 *
 * Poora rangon ka pahiya "زیادہ" ke peechay hai — jis ko waqai koi khaas rang chahiye
 * usay milta hai, magar wo raste mein nahi khara.
 */
const SWATCHES = [
  '#ffffff',
  '#111827',
  '#F2600C',
  '#D4380D',
  '#FACC15',
  '#16A34A',
  '#1D4ED8',
  '#9F1239',
] as const

function SwatchRow({
  label,
  customLabel,
  showHex,
  value,
  accent,
  onChange,
}: {
  label: string
  /** Picker aur hex ke liye — SwatchRow module ke darje par hai, wahan `t` nahi hota. */
  customLabel: string
  /** Hex ka khana — sirf "mazeed settings" par. */
  showHex: boolean
  value: string | undefined
  /** Template ka apna rang — "koi rang nahi chuna" ka matlab yehi hai. */
  accent: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <p className="text-[0.78rem] font-semibold">{label}</p>
      {/*
        🔴 `grid`, `flex-wrap` nahi.

        Wrap par ye aath khaane + pahiya do qatarein ban jate the aur panel ka aadha
        neecha kha lete the. Grid mein har khaana bache hui chaurai ka nauwan hissa le
        leta hai — chahe panel kitna bhi tang ho, qatar EK hi rehti hai.
      */}
      {/*
        🔴 `items-center` — warna khaane GOL nahi bante.

        Grid apne bachchon ko khud khinch deta hai (`align-items: stretch`), aur khinche
        hue box par `aspect-square` haar jata hai: oonchai pehle se tay ho chuki hoti
        hai. Nateeja: gol khaane oval pill ban jate the — sirf chuna hua khaana gol lagta
        tha kyunke us ke ring ne shakl bhar di hoti thi.
      */}
      <div className="mt-1.5 grid grid-cols-9 items-center gap-1">
        {SWATCHES.map((colour) => {
          const active = (value ?? accent).toLowerCase() === colour.toLowerCase()
          return (
            <button
              key={colour}
              type="button"
              onClick={() => onChange(colour)}
              aria-label={colour}
              title={colour}
              className={
                active
                  ? 'aspect-square w-full self-center rounded-full ring-2 ring-accent-700 ring-offset-1'
                  : 'tap aspect-square w-full self-center rounded-full ring-1 ring-black/15'
              }
              style={{ background: colour }}
            />
          )
        })}

        {/*
          Apni marzi ka rang — Canva ki tarah swatches ke SAATH, un ki jagah nahi.

          Aath khaane 90% kaam kar dete hain aur ek tap door hain; magar jise brand ka
          apna theek rang chahiye us ke liye poora picker bhi wahin hona chahiye. Ek ko
          doosre ke peechay chhupana dono qism ke logon mein se ek ko haraa deta hai.

          `<label>` ke andar chhupa hua input: khaana bhi swatches jaisa gol dikhta hai,
          aur tap par system ka apna rang chunne wala khulta hai (phone par bhi).
        */}
        <label
          className="tap relative aspect-square w-full self-center cursor-pointer overflow-hidden rounded-full ring-1 ring-black/15"
          title={customLabel}
          style={{
            background:
              'conic-gradient(#ef4444, #f59e0b, #facc15, #22c55e, #06b6d4, #3b82f6, #a855f7, #ef4444)',
          }}
        >
          <input
            type="color"
            value={value ?? accent}
            onChange={(e) => onChange(e.target.value)}
            aria-label={customLabel}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
      </div>

      {/*
        Hex ka khana sirf "مزید سیٹنگز" par.

        Rang ka pahiya wohi kaam kar deta hai aur qatar mein hi baith jata hai; hex ki
        zaroorat sirf us waqt parti hai jab kisi ke paas apne brand ka rang LIKHA hua ho.
        Us ek soorat ke liye ek poori qatar hamesha kharch karna mehnga hai.
      */}
      {showHex && (
        <input
          value={value ?? accent}
          onChange={(e) => onChange(e.target.value)}
          dir="ltr"
          maxLength={7}
          aria-label={customLabel}
          className="field numeric mt-1.5 h-7 w-24 !py-0 text-[0.72rem]"
        />
      )}
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
        <span className="text-[0.74rem] font-semibold">{label}</span>
        <span dir="ltr" className="numeric text-[0.68rem] text-ink-faint">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-pill bg-paper-sunken accent-brand-500"
      />
    </div>
  )
}
