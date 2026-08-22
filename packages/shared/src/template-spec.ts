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
const ElementSpec = z.object({
  show: z.boolean(),
  /** 0 = daayen kinara (RTL), 100 = baayen. */
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  /** Font ka naap 1080px chaure canvas par; chhote naap par --scale khud chhota kar deta hai. */
  size: z.number().int().min(16).max(160),
})

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
    name: { show: true, x: 4, y: 85, size: 46 },
    phone: { show: true, x: 55, y: 85, size: 46 },
    cta: { show: true, x: 4, y: 91, size: 40 },
  },
}

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
      return `${selector} {
  position: absolute;
  inset-inline-start: ${element.x}%;
  top: ${element.y}%;
  font-size: calc(${element.size}px * var(--scale));
  margin: 0;
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
`.trim()
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
