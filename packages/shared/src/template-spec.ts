/**
 * Reseller ka apna banaya hua template.
 *
 * 🔴 YAHAN SAB SE AHEM FAISLA: reseller CSS NAHI likhti.
 *
 * Wo ek tay-shuda spec bharti hai (rang, jagah, naap) aur CSS hum banate hain. Seedha
 * CSS lene ka matlab hota ke ajnabi ka likha hua text hamare render HTML mein chala
 * jaye — aur wahan se `url(https://...)` kisi bhi cheez ko bahar bhej sakta hai, aur
 * `position: fixed` jaisi ek line poore pack ko tor sakti hai. Spec is darwaze ko band
 * rakhta hai: jo qadar spec mein nahi, wo CSS mein pohanch hi nahi sakti.
 *
 * Drag-and-drop ko waise bhi yehi chahiye — jagah ek number hai, CSS nahi.
 */
import { z } from 'zod'

/** Sirf `#rgb` ya `#rrggbb` — koi `url()`, koi `expression()`, koi CSS function. */
const HexColour = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Rang #rrggbb ki shakal mein hona chahiye')

/**
 * Ek cheez ki jagah aur naap.
 *
 * x/y canvas ke FEESAD mein hain, px mein nahi — canvas chaar naap ka hota hai (story,
 * chokor, lamba, chaura) aur px wali jagah chokor pack par tasveer se bahar nikal jati.
 */
/**
 * Ek cheez ka apna mizaj.
 *
 * 🔴 `show`, `x`, `y`, `size` ke baad har khana IKHTIYARI hai — aur ye majboori nahi,
 * faisla hai.
 *
 * Jo template pehle se bane hue hain, un ke spec mein ye khaane hain hi nahi. Ikhtiyari
 * hone ki wajah se wo waise ke waise parse hote hain, AUR `templateSpecToCss` un par ek
 * lafz bhi ziyada nahi likhta — yani un ka CSS haraf ba haraf wohi rehta hai jo pehle
 * tha. Agar in ki koi default qadar hoti (misal `opacity: 100`), to CSS badal jata, aur
 * us ke saath har wo pack jo cache mein para hai — bina kisi ne kuch badle.
 */
const ElementSpec = z.object({
  show: z.boolean(),
  /** 0 = daayen kinara (RTL), 100 = baayen. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  /** Font ka naap 1080px chaure canvas par; chhote naap par --scale khud chhota kar deta hai. */
  size: z.number().int().min(16).max(160),

  /** Likhai ka apna rang — na ho to template ka aam rang chalta hai. */
  colour: HexColour.optional(),
  /** 0–100. Halka karne se cheez tasveer mein ghul jati hai (CTA par aksar achha lagta hai). */
  opacity: z.number().int().min(10).max(100).optional(),
  /** Thora sa terha — sale wale badge par jaan daal deta hai. Hadd chhoti hai jaan boojh kar. */
  rotate: z.number().int().min(-20).max(20).optional(),
  /**
   * Kaun si likhai.
   *
   * `nastaliq` Urdu ka asal mizaj hai magar us ki line-height 2.1 se kam nahi ho sakti;
   * `naskh` kam jagah leta hai aur chhoti likhai mein zyada saaf parha jata hai;
   * `latin` (Inter) angrezi naam aur number ke liye.
   */
  font: z.enum(['nastaliq', 'naskh', 'latin']).optional(),
  /** Rang bhara hua dabba — jaisa qeemat par pehle se hai. */
  pill: z.boolean().optional(),
})

/**
 * Reseller ka apna likha hua text.
 *
 * 🔴 Ye chhe tay-shuda cheezon se ALAG darja hai, aur farq samajhna zaroori hai:
 *
 * Tay-shuda cheezein ASLI DATA se bandhi hui hain — qeemat wohi jo slider par tay hui,
 * naam wohi jo profile mein hai. Rate badle to tasveer khud badal jati hai.
 *
 * Ye layer bandha hua NAHI hai. Ye us kaam ke liye hai jo data se aata hi nahi: "مفت
 * ڈیلیوری", "صرف 3 دن", "آخری 2 پیس". Wohi cheezein jo reseller aksar tasveer par haath
 * se likhwati thi.
 *
 * Us ki qeemat ye hai ke agar koi yahan RATE likh de to wo rate kabhi khud nahi
 * badlega — reseller slider par rate badalti rahegi aur tasveer par purana likha rahega.
 * Is liye UI us ke saath saaf tanbeeh dikhata hai. Rokna mumkin nahi (text to text hai),
 * magar chhupana nahi chahiye.
 */
const TextLayerSchema = z.object({
  kind: z.literal('text'),
  /** Jo likha jayega. Hadd chhoti hai: lamba text template ka neecha hissa tor deta hai. */
  text: z.string().trim().min(1).max(40),
  show: z.boolean(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  size: z.number().int().min(16).max(160),
  colour: HexColour.optional(),
  opacity: z.number().int().min(10).max(100).optional(),
  rotate: z.number().int().min(-20).max(20).optional(),
  font: z.enum(['nastaliq', 'naskh', 'latin']).optional(),
  pill: z.boolean().optional(),
})

export type TextLayer = z.infer<typeof TextLayerSchema>

/**
 * Reseller ka apna logo ya koi chhoti tasveer.
 *
 * 🔴 `url` HAMARI apni storage ka hona LAZMI hai, aur ye jaanch server par hoti hai
 * (dekhen `assertOwnAsset`). Bahar ka link qubool karna do darwaze kholta hai:
 *
 *  · Hamara render worker us pate par jata hai — yani koi bhi hamare server se
 *    apni marzi ke pate par request karwa sakta hai (andar wale network samet).
 *  · Tasveer kal badal sakti hai. Aaj logo, kal kuch aur — aur wo har us pack par
 *    chhap jayega jo us waqt bana.
 *
 * `width` canvas ke FEESAD mein hai, px mein nahi: canvas chaar naap ka hota hai aur
 * px wala logo chokor pack par tasveer se bahar nikal jata.
 */
const ImageLayerSchema = z.object({
  kind: z.literal('image'),
  url: z.string().url().max(500),
  show: z.boolean(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  width: z.number().min(3).max(60),
  opacity: z.number().int().min(10).max(100).optional(),
  rotate: z.number().int().min(-20).max(20).optional(),
  /** Gol logo ke liye — 50 par bilkul daira ban jata hai. */
  radius: z.number().int().min(0).max(50).optional(),
})

export type ImageLayer = z.infer<typeof ImageLayerSchema>

/** Text ya tasveer — tarteeb dono ke liye ek hi list mein. */
const LayerSchema = z.discriminatedUnion('kind', [TextLayerSchema, ImageLayerSchema])

export type Layer = z.infer<typeof LayerSchema>

/**
 * Kya ye pata hamari apni storage ka hai?
 *
 * 🔴 Shuruaat ka mel (`startsWith`) hi kaafi hai magar sirf tab jab `base` poora
 * prefix ho (protocol + host + path). Us se chhota kuch bhi (misal sirf host) `evil
 * .com/oyebazar...` jaise pate ko andar aane deta.
 */
export function isOwnAssetUrl(url: string, mediaBaseUrl: string): boolean {
  return mediaBaseUrl.length > 0 && url.startsWith(mediaBaseUrl)
}

export const TemplateSpecSchema = z.object({
  /** Spec ki shakal badle to purane packs ka cache apne aap alag ho jaye. */
  version: z.literal(1),
  accent: HexColour,
  accentText: HexColour,
  /** Neeche wali patti — safed card, kaala card, ya kuch nahi (seedha tasveer par). */
  card: z.enum(['none', 'light', 'dark']),
  /** Tasveer par kaali dhund, 0–100. Halki tasveer par likhai isi se parhi jati hai. */
  scrim: z.number().int().min(0).max(100),
  /** Safed haashiya, canvas ke feesad mein. 0 = koi haashiya nahi. */
  frame: z.number().min(0).max(12),
  radius: z.number().int().min(0).max(80),
  badgeText: z.string().trim().max(24),
  elements: z.object({
    badge: ElementSpec,
    title: ElementSpec,
    price: ElementSpec,
    name: ElementSpec,
    phone: ElementSpec,
    cta: ElementSpec,
  }),
  /**
   * Reseller ke apne likhe hue text.
   *
   * 🔴 IKHTIYARI — aur `ElementSpec` ke ikhtiyari khaanon wali wajah se: purane template
   * ke spec mein ye khana hai hi nahi, aur us par `templateSpecToCss` ek lafz bhi
   * ziyada nahi likhta. Un ka CSS haraf ba haraf wohi rehta hai, aur cache mein pare
   * hue laakhon packs apni jagah qaim rehte hain.
   *
   * Tarteeb hi layer ki tarteeb hai: baad wala upar chhapta hai (z-index list se banta
   * hai) — jaise har design tool mein hota hai.
   */
  layers: z.array(LayerSchema).max(6).optional(),
})

export type TemplateSpec = z.infer<typeof TemplateSpecSchema>

/**
 * Naya template banate waqt ka nuqta-e-aaghaz.
 *
 * Ye `simple` ki naqal hai — yani reseller khali safhe se nahi, ek chalti hui shakal se
 * shuru karti hai aur usay badalti hai. Khali canvas se shuru karne par zyada tar log
 * pehle hi qadam par chhor dete hain.
 */
export const DEFAULT_TEMPLATE_SPEC: TemplateSpec = {
  version: 1,
  accent: '#F2600C',
  accentText: '#ffffff',
  card: 'none',
  scrim: 78,
  frame: 0,
  radius: 28,
  badgeText: 'نیا',
  elements: {
    badge: { show: true, x: 4, y: 9, size: 44 },
    title: { show: true, x: 4, y: 62, size: 64 },
    price: { show: true, x: 4, y: 75, size: 78 },
    /*
     * Naam aur number ek hi qatar mein, magar 62% ke faasle par.
     *
     * Pehle number 55% par tha aur lamba naam ("صادیہ بی بی" jaisa) us par charh jata
     * tha — dono ka box overlap karta aur editor mein number par tap karne se naam
     * chun liya jata tha. 62% se pehle naam ko poori jagah mil jati hai.
     */
    name: { show: true, x: 4, y: 85, size: 46 },
    phone: { show: true, x: 62, y: 85, size: 46 },
    cta: { show: true, x: 4, y: 91, size: 40 },
  },
}

/**
 * Likhai ke teen mizaj.
 *
 * 🔴 Teenon font worker mein INLINE hote hain (apps/worker/src/render/template.ts).
 * CDN se aane wala font render ko ghair-mustaqil bana deta hai — kabhi font pehle aata
 * hai, kabhi screenshot.
 */
const FONT_STACK: Record<'nastaliq' | 'naskh' | 'latin', string> = {
  nastaliq: "'Noto Nastaliq Urdu', serif",
  naskh: "'Noto Naskh Arabic', serif",
  latin: "'Inter', system-ui, sans-serif",
}

/**
 * Rang bhara dabba — jaisa qeemat par pehle se hai.
 *
 * Nastaliq ke liye neeche ki padding upar se zyada hai: haroof ki dumen (ی, ں, ج)
 * baseline se kaafi neeche jati hain aur barabar padding par wo dabbe se bahar nikal
 * kar kati hui lagti hain.
 */
const PILL_ON = `background: var(--accent);
  color: var(--badge-text);
  padding: calc(10px * var(--scale)) calc(40px * var(--scale)) calc(24px * var(--scale));
  border-radius: 999px;
  display: inline-block;`

const PILL_OFF = `background: transparent;
  padding: 0;
  box-shadow: none;`

/**
 * Shuru karne ki jagahen.
 *
 * 🔴 Khali canvas se shuru karne par zyada tar log pehle hi qadam par chhor dete hain —
 * "kya banaun" us se kahin bara sawal hai "isay kaisa karun". Har preset ek chalti hui
 * shakl hai jise reseller pakar kar apna bana leti hai.
 *
 * Ye built-in templates ki HOOBAHOO naqal nahi hain (wo CSS files hain, ye spec hai) —
 * un ka mizaj hai. Nazdeek hona kaafi hai; asal maqsad khali safha na dena hai.
 */
export const TEMPLATE_PRESETS: readonly { key: string; nameUr: string; nameEn: string; spec: TemplateSpec }[] = [
  {
    key: 'plain',
    nameUr: 'سادہ',
    nameEn: 'Simple',
    spec: DEFAULT_TEMPLATE_SPEC,
  },
  {
    key: 'card',
    nameUr: 'سفید کارڈ',
    nameEn: 'White card',
    spec: {
      ...DEFAULT_TEMPLATE_SPEC,
      accent: '#111827',
      card: 'light',
      scrim: 25,
      radius: 36,
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        badge: { show: true, x: 4, y: 8, size: 40, pill: true },
        title: { show: true, x: 8, y: 56, size: 58 },
        price: { show: true, x: 8, y: 68, size: 84, pill: false },
        name: { show: true, x: 8, y: 80, size: 42 },
        phone: { show: true, x: 8, y: 86, size: 40, font: 'latin' },
        cta: { show: true, x: 8, y: 91, size: 32, opacity: 55 },
      },
    },
  },
  {
    key: 'loud',
    nameUr: 'نمایاں ریٹ',
    nameEn: 'Bold price',
    spec: {
      ...DEFAULT_TEMPLATE_SPEC,
      accent: '#FACC15',
      accentText: '#1C1917',
      scrim: 70,
      radius: 18,
      badgeText: 'خاص ریٹ',
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        badge: { show: true, x: 4, y: 8, size: 44, rotate: -3 },
        title: { show: true, x: 4, y: 60, size: 46 },
        price: { show: true, x: 4, y: 68, size: 118, rotate: -2 },
        name: { show: true, x: 4, y: 86, size: 44 },
        phone: { show: true, x: 55, y: 86, size: 44, font: 'latin' },
        cta: { show: true, x: 4, y: 92, size: 34, opacity: 80 },
      },
    },
  },
  {
    key: 'night',
    nameUr: 'گہرا',
    nameEn: 'Dark',
    spec: {
      ...DEFAULT_TEMPLATE_SPEC,
      accent: '#22D3EE',
      accentText: '#042F35',
      card: 'dark',
      scrim: 85,
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        badge: { show: true, x: 4, y: 8, size: 42 },
        title: { show: true, x: 6, y: 62, size: 56 },
        price: { show: true, x: 6, y: 73, size: 80 },
        name: { show: true, x: 6, y: 84, size: 44, colour: '#22D3EE' },
        phone: { show: true, x: 6, y: 89, size: 40, font: 'latin' },
        cta: { show: true, x: 6, y: 93, size: 30, opacity: 65, font: 'naskh' },
      },
    },
  },
  {
    key: 'framed',
    nameUr: 'فریم',
    nameEn: 'Framed',
    spec: {
      ...DEFAULT_TEMPLATE_SPEC,
      accent: '#9F1239',
      accentText: '#FFF1F2',
      frame: 5,
      scrim: 70,
      radius: 10,
      badgeText: 'خاص',
      elements: {
        ...DEFAULT_TEMPLATE_SPEC.elements,
        badge: { show: true, x: 9, y: 11, size: 38 },
        title: { show: true, x: 10, y: 58, size: 54 },
        price: { show: true, x: 10, y: 69, size: 76 },
        name: { show: true, x: 10, y: 81, size: 40 },
        phone: { show: true, x: 10, y: 86, size: 38, font: 'latin' },
        cta: { show: true, x: 10, y: 90, size: 30, opacity: 75, font: 'naskh' },
      },
    },
  },
]

/** Har cheez ka CSS class — spec ki key se DOM tak ek hi naqsha. */
const ELEMENT_SELECTOR: Record<keyof TemplateSpec['elements'], string> = {
  badge: '.badge',
  title: '.title',
  price: '.price-row',
  name: '.seller-name',
  phone: '.seller-phone',
  cta: '.cta',
}

/** Neeche wali patti ke andar kaun kaun si cheezein aati hain. */
const CARD_ELEMENTS = ['title', 'price', 'name', 'phone', 'cta'] as const

/**
 * Neeche wali patti.
 *
 * 🔴 Ye `.content::before` par banti hai, `.bottom` par nahi — aur ye majboori hai.
 * Custom template mein har cheez apni jagah par absolutely baithti hai, is liye `.bottom`
 * ko `display: contents` karna parta hai (warna wo apne bachchon ko qaid rakhta). Magar
 * `display: contents` wale element ka koi box hi nahi banta, yani us par background lag
 * hi nahi sakta. Pehli koshish yehi thi aur patti khamoshi se gayab rehti thi.
 *
 * Patti ka upri kinara khud nikala jata hai — jo cheez sab se upar hai, us se thora
 * upar. Reseller se ek aur number poochhna (patti kahan se shuru ho) us kaam ko barha
 * deta jise wo ungli se pehle hi kar chuki hai.
 */
function cardCss(spec: TemplateSpec): string {
  if (spec.card === 'none') return ''

  const tops = CARD_ELEMENTS.filter((key) => spec.elements[key].show).map(
    (key) => spec.elements[key].y,
  )
  if (tops.length === 0) return ''

  const top = Math.max(0, Math.min(...tops) - 4)
  const light = spec.card === 'light'
  const inset = spec.frame > 0 ? spec.frame + 2 : 3

  return `
.stage.custom .content::before {
  content: '';
  position: absolute;
  top: ${top}%;
  inset-inline: ${inset}%;
  bottom: ${inset}%;
  background: ${light ? '#ffffff' : 'rgba(2, 6, 23, 0.9)'};
  border-radius: calc(${spec.radius}px * var(--scale));
}
${
  light
    ? `
/* Safed patti par safed likhai nazar nahi aati — sab kuch gehra, aur saaya bekar */
.stage.custom .title,
.stage.custom .seller-name,
.stage.custom .seller-phone,
.stage.custom .cta { color: #111827; text-shadow: none; }
/* Do dabbe ek doosre ke andar bhare hue lagte hain — qeemat ka apna dabba hata dete hain */
.stage.custom .price { background: transparent; color: #111827; padding: 0; }
`
    : ''
}`
}

/**
 * Spec → CSS.
 *
 * 🔴 Har qadar ya to number hai (jise Zod ne hadd mein rakha) ya jaancha hua hex rang.
 * Reseller ka likha hua wahid TEXT `badgeText` hai, aur wo CSS mein nahi jata — worker
 * usay HTML mein escape kar ke daalta hai (dekhen template.ts ka `escapeHtml`).
 *
 * Custom template `.stage.custom` par chalta hai: wahan `.content` ka flex bahao khatam
 * ho jata hai aur har cheez apni jagah par absolutely baithti hai — warna drag-and-drop
 * ki jagah ka koi matlab hi na rehta.
 */
export function templateSpecToCss(spec: TemplateSpec): string {
  const positioned = (Object.keys(spec.elements) as (keyof TemplateSpec['elements'])[])
    .map((key) => {
      const element = spec.elements[key]
      const selector = `.stage.custom ${ELEMENT_SELECTOR[key]}`

      if (!element.show) return `${selector} { display: none; }`

      /*
       * `right` (LTR par `left`) — kyunke Urdu pack RTL hai aur reseller ke liye "0" ka
       * matlab wahi kinara hai jahan se wo parhna shuru karti hai.
       */
      /*
       * Ikhtiyari khaane sirf tab likhe jate hain jab wo waqai mojood hon — dekhen
       * `ElementSpec` ka note. Purane spec par ye saari lines gayab rehti hain aur CSS
       * haraf ba haraf wohi banta hai jo pehle tha.
       */
      const extra = [
        element.colour ? `color: ${element.colour};` : '',
        element.opacity !== undefined ? `opacity: ${element.opacity / 100};` : '',
        element.rotate ? `transform: rotate(${element.rotate}deg);` : '',
        element.font ? `font-family: ${FONT_STACK[element.font]};` : '',
        element.pill === true ? PILL_ON : '',
        element.pill === false ? PILL_OFF : '',
      ]
        .filter(Boolean)
        .join('\n  ')

      return `${selector} {
  position: absolute;
  inset-inline-start: ${element.x}%;
  top: ${element.y}%;
  font-size: calc(${element.size}px * var(--scale));
  margin: 0;${extra ? `\n  ${extra}` : ''}
}`
    })
    .join('\n')

  return `
:root {
  --accent: ${spec.accent};
  --badge-text: ${spec.accentText};
}

/* Custom template mein bahao nahi, jagah hai — har cheez wahin jahan reseller ne rakhi */
.stage.custom .content { inset: 0; display: block; }
.stage.custom .bottom { display: contents; }
.stage.custom .seller { display: contents; border: 0; }
.stage.custom .price-row { display: block; }

.stage.custom .scrim {
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, ${(spec.scrim / 100) * 0.45}) 0%,
    rgba(0, 0, 0, 0) 32%,
    rgba(0, 0, 0, 0) 48%,
    rgba(0, 0, 0, ${spec.scrim / 100}) 100%
  );
}

.stage.custom .price { border-radius: calc(${spec.radius}px * var(--scale)); }
.stage.custom .badge { border-radius: calc(${spec.radius}px * var(--scale)); }

${spec.frame > 0 ? frameCss(spec.frame) : ''}
${cardCss(spec)}
${positioned}
${layersCss(spec)}
`.trim()
}

/**
 * Reseller ke apne text ka CSS.
 *
 * 🔴 Layer na hon to KHALI string — purane template ka CSS haraf ba haraf wohi rehta hai.
 *
 * `z-index` list ki tarteeb se: baad wala upar. Tay-shuda cheezein 1 par hain, layers 2
 * se shuru — yani reseller ka apna text hamesha unke upar chhapta hai. Ye jaan boojh kar
 * hai: wo usay AKHIR mein lagati hai, aur akhir mein lagayi hui cheez upar honi chahiye.
 */
function layersCss(spec: TemplateSpec): string {
  if (!spec.layers?.length) return ''

  return spec.layers
    .map((layer, index) => {
      const selector = `.stage.custom .layer-${index}`
      if (!layer.show) return `${selector} { display: none; }`

      if (layer.kind === 'image') {
        /*
         * Sirf chaurai di jati hai, oonchai nahi — `height: auto` tasveer ki apni
         * nisbat qaim rakhta hai. Dono dene ka matlab hota ke reseller ka logo khinch
         * kar bhadda ho jaye, aur wo aksar khud usay theek nahi kar paati.
         */
        return `${selector} {
  position: absolute;
  inset-inline-start: ${layer.x}%;
  top: ${layer.y}%;
  width: ${layer.width}%;
  height: auto;
  z-index: ${2 + index};
  ${layer.radius ? `border-radius: ${layer.radius}%;` : ''}
  ${layer.opacity !== undefined ? `opacity: ${layer.opacity / 100};` : ''}
  ${layer.rotate ? `transform: rotate(${layer.rotate}deg);` : ''}
}`
      }

      const extra = [
        layer.colour ? `color: ${layer.colour};` : 'color: #ffffff;',
        layer.opacity !== undefined ? `opacity: ${layer.opacity / 100};` : '',
        layer.rotate ? `transform: rotate(${layer.rotate}deg);` : '',
        `font-family: ${FONT_STACK[layer.font ?? 'nastaliq']};`,
        layer.pill ? PILL_ON : '',
      ]
        .filter(Boolean)
        .join('\n  ')

      return `${selector} {
  position: absolute;
  inset-inline-start: ${layer.x}%;
  top: ${layer.y}%;
  font-size: calc(${layer.size}px * var(--scale));
  font-weight: 700;
  line-height: ${layer.font === 'nastaliq' || !layer.font ? '2.1' : '1.3'};
  white-space: nowrap;
  z-index: ${2 + index};
  text-shadow: 0 4px 24px rgba(0, 0, 0, 0.6);
  ${extra}
}`
    })
    .join('\n')
}

/**
 * Haashiya — tasveer andar simat jati hai.
 *
 * 🔴 `<img>` par width/height saaf likhna lazmi hai: sirf `inset` dene se replaced
 * element apne asli naap par reh jata hai aur tasveer kone mein simat jati hai.
 * (Yehi keeda `frame` template mein pehli dafa pakra gaya tha.)
 */
function frameCss(framePercent: number): string {
  return `
.stage.custom .photo {
  inset: ${framePercent}%;
  width: ${100 - framePercent * 2}%;
  height: ${100 - framePercent * 2}%;
  border-radius: calc(18px * var(--scale));
}
.stage.custom .scrim {
  inset: ${framePercent}%;
  border-radius: calc(18px * var(--scale));
}
`
}

/**
 * Custom template ki key — `custom:<id>`.
 *
 * Ek hi khaane (`templateKey`) mein dono qism ke template rehte hain, is liye cache key,
 * queue ka job aur DB ka column — kisi ko bhi is farq ka pata nahi chalta.
 */
export const CUSTOM_TEMPLATE_PREFIX = 'custom:'

/**
 * `custom:<id>@<revision>`.
 *
 * 🔴 Revision key ka hissa hai. Iske baghair reseller apna template badalti, key wohi
 * purani rehti, aur usay wohi purani tasveer milti rehti — bina kisi wajah ke.
 */
export function customTemplateKey(id: string, revision: number): string {
  return `${CUSTOM_TEMPLATE_PREFIX}${id}@${revision}`
}

/** `custom:abc` → `abc`; built-in template par `null`. */
export function customTemplateId(templateKey: string): string | null {
  return templateKey.startsWith(CUSTOM_TEMPLATE_PREFIX)
    ? templateKey.slice(CUSTOM_TEMPLATE_PREFIX.length)
    : null
}
