/**
 * Tasveer se maal ka bayan — Claude se.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 Is adapter ki pehli shart wohi hai jo `ClaudePitchWriter` ki hai: nakaam hone par
 * KUCH NAHI hota. Koi khaali khaana nahi bharta, koi ghalti ka paighaam nahi aata.
 * Dukan wala waise hi haath se likhta rehta hai jaise wo pehle likhta tha.
 *
 * Magar ek farq hai, aur wo ahem hai: yahan koi TEMPLATE fallback nahi hai. Status ke
 * jumle bina maal dekhe bhi likhe ja sakte hain (naam aur category kaafi hain); maal ka
 * apna naam nahi. Jo cheez andaze se banti hi nahi, us ka koi badal nahi hota — us ka
 * sahi jawab khamoshi hai, koi gharha hua naam nahi.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { ProductDescriber, ProductDraft, ProductDraftInput } from '@oyebazar/core'

/**
 * 🔴 `claude-opus-5` — wohi jo pitch writer par hai, aur usi wajah se.
 *
 * Ye naam seedha reseller ke catalogue par chhapta hai aur us ke customer tak jata hai.
 * Sasta model chunna kharche ka faisla hai, hamara nahi — aur wo faisla ek jagah badla
 * jata hai, do adapteron mein alag alag nahi.
 */
const MODEL = 'claude-opus-5'

/** Naam, chhoti tafseel, ek slug — is se zyada ki gunjaish chahiye hi nahi. */
const MAX_TOKENS = 700

/**
 * Jawab ka dhancha.
 *
 * `categorySlug` mein `null` ki ijazat hai — dekhen port ka note. Model ko har haal
 * mein chunne par majboor karne se wo andhere mein bhi ek chun leta hai, aur ghalat
 * category ka nuqsan khali category se bara hai.
 */
const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    titleUr: { type: 'string' },
    titleEn: { type: 'string' },
    descriptionUr: { type: 'string' },
    categorySlug: { type: ['string', 'null'] },
  },
  required: ['titleUr', 'titleEn', 'descriptionUr', 'categorySlug'],
  additionalProperties: false,
} as const

/**
 * Kaam ka bayan.
 *
 * 🔴 Sab se sakht shart wohi hai jo pitch writer par hai, aur yahan wo aur bhi bhaari
 * hai: SIRF WO LIKHO JO TASVEER MEIN DIKH RAHA HAI. "Asli silk", "import shuda",
 * "dhoop mein rang nahi chhorta" — ye baatein tasveer se sabit nahi hoteen. Aur is dafa
 * un ka bhugtaan sirf reseller nahi karti: wo jhoot MAAL KE APNE SAFHE par likha jata
 * hai, dukan ke naam ke saath, aur wahin se har reseller usay uthati hai.
 */
const SYSTEM = `Tum ek Pakistani thok bazaar ki dukan ke liye maal ka naam aur chhoti tafseel likhte ho.
Tumhein maal ki tasveer di jayegi. Us ko dekh kar khaane bharo.

titleUr  — Urdu script mein naam. Chhota, seedha, jaisa dukan wala bolta hai.
titleEn  — wohi naam angrezi mein.
descriptionUr — Urdu script mein ek ya do chhote jumle. Sirf wo baat jo TASVEER MEIN DIKH RAHI HAI.
categorySlug — di gayi fehrist mein se EK slug, ya null.

SAKHT SHARTEIN:
1. Sirf wo likho jo tasveer mein NAZAR AA RAHA hai. "Asli silk", "import shuda", "12
   mahine guarantee", "dhoop mein rang nahi chhorta" — ye tasveer se sabit nahi hote.
   Jo likha jaye wo maal ke safhe par dukan ke NAAM se chhapta hai; jhoot ka bhugtaan
   dukan aur reseller dono karte hain.
2. Koi QEEMAT, RAQAM ya hindsa nahi. Rate dukan wala khud lagata hai.
3. "Sale", "discount", "offer", "best quality", "number 1" mat likho.
4. categorySlug SIRF di gayi fehrist mein se. Agar koi theek se mel na khaye to null —
   ghalat khaane mein daalne se maal us chhanni mein chala jata hai jahan koi usay
   dhoondh hi nahi raha.

Andaz: seedha aur saada, dukan wale jaisa. Angrezi ke wo lafz jo Pakistan mein rozana
bole jate hain (cotton, lawn, size, piece) waise hi rehne do.`

export interface ClaudeProductDescriberOptions {
  readonly apiKey: string
  /** Nakaami khamoshi se na guzre — warna koi kabhi nahi jaan paayega ke model band hai */
  readonly onError?: ((error: unknown) => void) | undefined
}

export class ClaudeProductDescriber implements ProductDescriber {
  private client: Anthropic | null = null

  constructor(private readonly options: ClaudeProductDescriberOptions) {}

  /** SDK pehli ASLI zaroorat par — wajah `ClaudePitchWriter` par likhi hui hai. */
  private async sdk(): Promise<Anthropic> {
    if (!this.client) {
      const { default: Client } = await import('@anthropic-ai/sdk')
      this.client = new Client({ apiKey: this.options.apiKey })
    }
    return this.client
  }

  async describe(input: ProductDraftInput): Promise<ProductDraft | null> {
    try {
      const client = await this.sdk()
      const { betaJSONSchemaOutputFormat } = await import(
        '@anthropic-ai/sdk/helpers/beta/json-schema'
      )

      const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        /*
         * `effort: 'low'` — ye tasveer dekh kar naam likhne ka kaam hai, koi guthi
         * suljhane ka nahi. Model wohi hai; sirf soch kam.
         */
        output_config: { effort: 'low', format: betaJSONSchemaOutputFormat(DRAFT_SCHEMA) },
        messages: [
          {
            role: 'user',
            content: [
              /*
               * 🔴 Tasveer PEHLE, matn baad mein — aur ye tarteeb ittefaqi nahi.
               * Model tasveer ko us matn ke tanazur mein dekhta hai jo us ke baad aata
               * hai; ulta rakhne par sawal us cheez se pehle poochha jata hai jis ke
               * bare mein poochha ja raha hai.
               */
              { type: 'image', source: { type: 'url', url: input.imageUrl } },
              { type: 'text', text: prompt(input) },
            ],
          },
        ],
      })

      const draft = response.parsed_output
      if (!draft) return null

      const titleUr = draft.titleUr?.trim() ?? ''
      const titleEn = draft.titleEn?.trim() ?? ''

      /*
       * 🔴 Naam khali ho to POORA jawab girta hai.
       *
       * Adhoora bharna sab se buri soorat hai: dukan wala dekhta hai ke khaane bhar
       * gaye, "Save" daba deta hai, aur maal bina naam ke listed ho jata hai. Aisa maal
       * catalogue par to aa jata hai magar us par koi order kabhi nahi aata — aur wajah
       * kisi ko teen mahine tak nazar nahi aati.
       */
      if (!titleUr || !titleEn) return null

      /*
       * Slug ki tasdeeq HAMARI apni fehrist se.
       *
       * 🔴 Model ka bheja hua slug bharosa nahi. Wo fehrist se milta julta magar mojood
       * na hone wala slug likh sakta hai ("kids-toys" jab hamare paas "toys" ho), aur
       * wo khaana chup chaap ghalat bhar jata. Jo hamari fehrist mein nahi, wo `null`.
       */
      const slug = draft.categorySlug?.trim() ?? ''
      const known = input.categories.some((category) => category.slug === slug)

      return {
        titleUr,
        titleEn,
        descriptionUr: draft.descriptionUr?.trim() ?? '',
        categorySlug: known ? slug : null,
      }
    } catch (error) {
      this.options.onError?.(error)
      return null
    }
  }
}

function prompt(input: ProductDraftInput): string {
  const list = input.categories.map((c) => `${c.slug} = ${c.nameEn}`).join('\n')
  const hint = input.hint?.trim()

  return [
    'Ye maal hai. Is ke khaane bharo.',
    '',
    'Mojood categories (slug = naam):',
    list,
    ...(hint
      ? [
          '',
          /*
           * Dukan wale ka apna ishara — magar hukm nahi.
           *
           * 🔴 Wo aksar sirf do lafz likhta hai ("lawn 3 piece"), aur wo do lafz tasveer
           * se ziyada bhi keh sakte hain (kapre ki qism) aur ghalat bhi ho sakte hain
           * (us ne pichhle maal wala matn chhor diya ho). Isi liye ye "ishara" hai:
           * tasveer se mel khaye to kaam ka, warna tasveer hi asal hai.
           */
          `Dukan wale ka ishara (zaroori nahi ke poora ya durust ho): ${hint}`,
        ]
      : []),
  ].join('\n')
}

export function createProductDescriber(options: {
  apiKey: string | undefined
  onError?: ((error: unknown) => void) | undefined
}): ProductDescriber | null {
  /*
   * Key na ho to adapter banta hi NAHI — `null`.
   *
   * 🔴 Ek aisa adapter banana jo har dafa nakaam ho, us se bura hai ke adapter ho hi na:
   * safhe par button dikhta rehta, dukan wala har dafa dabata, aur har dafa kuch na
   * hota. `null` par button chhupa dena is se kahin behtar jawab hai.
   */
  if (!options.apiKey?.trim()) return null
  return new ClaudeProductDescriber({
    apiKey: options.apiKey.trim(),
    onError: options.onError,
  })
}
