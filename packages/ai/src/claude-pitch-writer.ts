/**
 * Status ke lafz — Claude se.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔴 Is adapter ki PEHLI shart wo nahi hai jo wo likhta hai — wo hai jo wo nakaam hone
 * par karta hai.
 *
 * Reseller raat ko das baje status lagane baithti hai. Us lamhe agar key khatam ho,
 * network kharab ho, ya model der kar de — to us ke saamne khali jagah nahi aani
 * chahiye. Isi liye `fallback` is class ka LAZMI hissa hai, koi marzi ka option nahi:
 * har nakaami us par girti hai aur reseller ko phir bhi teen jumle milte hain.
 *
 * `TemplatePitchWriter` us soorat mein "kam darje ka badal" nahi hai — wo bunyad hai.
 * Ye us ke lafz behtar karta hai, us ki jagah nahi leta.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type Anthropic from '@anthropic-ai/sdk'
import type { PitchInput, PitchWriter } from '@oyebazar/core'
import { withoutAmounts } from './no-amounts'

/**
 * 🔴 `claude-opus-5` — aur ye faisla jaan boojh kar hai.
 *
 * Sasta model chunna hamara faisla nahi: ye jumle Urdu mein likhe jate hain aur seedha
 * reseller ke customer ke saamne jate hain. Kharcha kam karna ho to safha khud batata
 * hai ke kitna hua; model neeche laana malik ka faisla hai, hamara nahi.
 */
const MODEL = 'claude-opus-5'

/**
 * Teen chhote jumle — is se zyada ki zaroorat hi nahi.
 *
 * Chhoti hadd is liye ke jawab bhi chhota hi chahiye, aur bari hadd rakhne se model
 * lamba likhne lagta hai — jo WhatsApp ke status par kat jata hai.
 */
const MAX_TOKENS = 500

/**
 * Jawab ka dhancha — JSON Schema se, Zod se nahi.
 *
 * 🔴 SDK ka Zod wala helper ab Zod 4 maangta hai; is repo ka baqi sab (DTO, route ke
 * schema) Zod 3 par hai. Sirf is teen-satar wale dhanche ke liye workspace mein Zod ke
 * DO majors le aana wo qeemat hai jo baad mein har us bande ko chukani parti hai jo
 * yahan kuch badalne aaye. Dhancha itna chhota hai ke JSON Schema mein likhna aasan hai.
 */
const PITCH_SCHEMA = {
  type: 'object',
  properties: {
    lines: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 3,
    },
  },
  required: ['lines'],
  additionalProperties: false,
} as const

/**
 * Kaam ka bayan — har dafa bilkul yehi, taake jawab bhi thehra hua rahe.
 *
 * Teen sakht shartein prompt mein hain, aur teenon ka nuqsan reseller ka hai:
 * raqam nahi (do jagah do rate), jhoota dawa nahi (wo apne customer ke saamne jhooti
 * banti hai), aur nayi khoobi gharhna nahi (maal waisa nikla hi nahi).
 */
const SYSTEM = `Tum ek Pakistani thok bazaar ke maal ke liye WhatsApp status ke jumle likhte ho.
Ye jumle ek reseller (ghar se bechne wali khatoon) apne status par lagati hai.

Hamesha TEEN jumle do. Har jumla chhota ho — zyada se zyada 12 lafz.

SAKHT SHARTEIN:
1. Kisi jumle mein QEEMAT, RAQAM, ya hindsa nahi. Rate alag likha jata hai; tumhara
   likha hua number us se alag ho jayega aur reseller apne customer ke saamne phansegi.
2. Sirf wo baat likho jo diye gaye maal se sabit hai. Nayi khoobi mat gharho — "asli
   silk", "import shuda", "12 mahine guarantee" jaisi baat jab tak di na ho, jhoot hai,
   aur us ka bhugtaan reseller karti hai.
3. "Sale", "discount", "offer" mat likho — hum sale nahi kar rahe.

Andaz: seedha, garmjoshi wala, dukan wale jaisa. Angrezi ke wo lafz jo Pakistan mein
rozana bole jate hain (delivery, cotton, size) waise hi rehne do.`

export interface ClaudePitchWriterOptions {
  readonly apiKey: string
  /** 🔴 Lazmi — har nakaami is par girti hai. Dekhen upar. */
  readonly fallback: PitchWriter
  /** Nakaami khamoshi se na guzre — warna koi kabhi nahi jaan paayega ke model band hai */
  readonly onError?: ((error: unknown) => void) | undefined
}

export class ClaudePitchWriter implements PitchWriter {
  private client: Anthropic | null = null

  constructor(private readonly options: ClaudePitchWriterOptions) {}

  /**
   * SDK pehli ASLI zaroorat par load hota hai — module parhte waqt nahi.
   *
   * 🔴 Ye sust-rawi jaan boojh kar hai, aur us ke teen faide hain:
   *
   *  · Har server start par ek bara package parhna nahi parta. Ye safha aksar khulta
   *    hai; SDK shayad hi kabhi.
   *  · Jis nizam ke paas key hi nahi (local, test, aur wo din jab bill nahi bhara) us
   *    par ye kabhi load hota hi nahi.
   *  · Aur wohi cheez us test ko bhi bachati hai jo sirf container khara karta hai:
   *    container banane se model ka SDK chhuwa hi nahi jata.
   */
  private async sdk(): Promise<Anthropic> {
    if (!this.client) {
      const { default: Client } = await import('@anthropic-ai/sdk')
      this.client = new Client({ apiKey: this.options.apiKey })
    }
    return this.client
  }

  async forProduct(input: PitchInput): Promise<readonly string[]> {
    try {
      const client = await this.sdk()
      const { betaJSONSchemaOutputFormat } = await import(
        '@anthropic-ai/sdk/helpers/beta/json-schema'
      )

      /*
       * `beta.messages.parse` — `messages.parse` nahi.
       *
       * Is SDK mein structured output abhi beta ke neeche hai; `messages.parse` mojood
       * hi nahi. Ye baat yahan likhi hui hai taake agle bande ko wo dhoondna na pare jo
       * abhi dhoondni pari.
       */
      const response = await client.beta.messages.parse({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        /*
         * `effort: 'low'` — ye teen chhote jumle likhne ka kaam hai, koi guthi
         * suljhane ka nahi. Ye model neeche laana NAHI hai: wohi model, kam soch.
         */
        output_config: { effort: 'low', format: betaJSONSchemaOutputFormat(PITCH_SCHEMA) },
        messages: [{ role: 'user', content: prompt(input) }],
      })

      const lines = response.parsed_output?.lines ?? []

      /*
       * Do chhanniyan, aur dono zaroori:
       *  · raqam wale jumle girte hain (dekhen `no-amounts.ts`)
       *  · khali/lambe jumle girte hain — model kabhi kabhi ek khali string bhej deta hai
       */
      const clean = withoutAmounts(lines)
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      /*
       * 🔴 Teen se kam par POORA jawab chhor kar template par chale jate hain — bacha
       * hua hissa nahi jorte.
       *
       * Do adhoore jawab milane se wo soorat banti hai jahan pehla jumla model ka aur
       * doosra template ka hota hai: do alag awazein, ek hi status par. Reseller ko wo
       * foran mashini lagta hai — aur wohi ek cheez hai jis se bachne ke liye hum teen
       * jumle de rahe hain, ek nahi.
       */
      if (clean.length < 3) return this.options.fallback.forProduct(input)

      return clean.slice(0, 3)
    } catch (error) {
      this.options.onError?.(error)
      return this.options.fallback.forProduct(input)
    }
  }
}

function prompt(input: PitchInput): string {
  const script =
    input.script === 'roman'
      ? 'Roman Urdu mein likho (angrezi haroof, Urdu zaban). Urdu script bilkul istemal mat karo.'
      : 'Urdu script mein likho.'

  return [
    `Maal ka naam (Urdu): ${input.titleUr}`,
    `Maal ka naam (angrezi): ${input.titleEn}`,
    `Khana: ${input.categoryNameUr} / ${input.categoryNameEn}`,
    `Dukan ka sheher: ${input.city}`,
    input.descriptionUr ? `Dukan wale ki apni tafseel: ${input.descriptionUr}` : null,
    /*
     * Stock ki khabar prompt mein is liye ke "aaj hi nikle ga" wala jumla khali maal
     * par likh dena reseller ko us ke customer ke saamne jhooti bana deta hai — wahi
     * ehtiyat `templatePitch` mein bhi likhi hui hai.
     */
    input.hasStock
      ? 'Maal mojood hai — jaldi bhejne wali baat likhi ja sakti hai.'
      : 'Maal is waqt khatam hai — jaldi bhejne ya "aaj hi milega" jaisa koi dawa mat likho.',
    '',
    script,
  ]
    .filter((line) => line !== null)
    .join('\n')
}

/**
 * Claude wala writer — agar key mojood ho. Warna wohi template wala jo diya gaya hai.
 *
 * 🔴 Key na hone par ye THROW nahi karta. Aksar chalne wale nizam mein key nahi hoti
 * (local, test, aur wo din jab bill nahi bhara), aur us soorat mein safha band ho jana
 * sab se bura anjaam hai — feature ka poora maqsad hi khali jagah bharna tha.
 */
export function createPitchWriter(options: {
  apiKey?: string | undefined
  fallback: PitchWriter
  onError?: ((error: unknown) => void) | undefined
}): PitchWriter {
  if (!options.apiKey) return options.fallback

  return new ClaudePitchWriter({
    apiKey: options.apiKey,
    fallback: options.fallback,
    ...(options.onError ? { onError: options.onError } : {}),
  })
}
