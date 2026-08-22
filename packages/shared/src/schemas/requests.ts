/**
 * Request schemas — har API endpoint par input inhi se parse hota hai.
 * Route handler kabhi raw `body` ko haath na lagaye.
 */
import { z } from 'zod'
import { MAX_MEDIA_PER_PRODUCT } from '../media'
import { PAGINATION } from '../constants'
import { TemplateKeySchema } from '../dto/status-pack'

/** Pakistani mobile: 03XXXXXXXXX ya +923XXXXXXXXX — normalise ho kar E.164 (923XXXXXXXXX) banta hai. */
export const PakistaniPhoneSchema = z
  .string()
  .trim()
  .transform((raw) => raw.replace(/[\s-()]/g, ''))
  .refine((v) => /^(?:\+?92|0)3\d{9}$/.test(v), {
    message: 'Sahih WhatsApp number likhen (misal: 03001234567)',
  })
  .transform((v) => {
    const digits = v.replace(/^\+/, '')
    return digits.startsWith('92') ? digits : `92${digits.slice(1)}`
  })

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
})

// ---------- Auth ----------

export const OtpRequestSchema = z.object({
  phone: PakistaniPhoneSchema,
})

/**
 * Nayi dukan ki darkhwast.
 *
 * Sirf wo cheezen jo ops ko FAISLA karne ke liye chahiyen: naam, malik, number, sheher,
 * pata. NTN marzi ka hai — bohat si dukanen registered nahi hotin, aur usay lazmi karne
 * ka matlab hai aadhi mandi ko darwaze par rok dena.
 */
/**
 * Wholesaler apna maal daalta hai.
 *
 * Sirf apna rate deta hai — hamara rate (aur reseller ko dikhne wala) server par banta
 * hai. Agar ye client se aata to koi bhi apni marzi ka rate bhej kar hamari fee ura
 * sakta tha.
 */
export const NewProductSchema = z
  .object({
    /**
     * 🔴 Lazmi sirf teen cheezein: angrezi naam, rate, aur kam az kam ek tasveer.
     *
     * Wajah: maal daalne ka rasta jitna lamba hoga, utne hi dukan wale beech mein chhor
     * kar chale jayenge — aur khali catalogue par koi reseller nahi tikti. Baqi sab baad
     * mein bhi lag sakta hai (tafseel badalne wala safha DRAFT par khula rehta hai).
     */
    titleEn: z.string().trim().min(2, 'Naam likhen').max(80),
    /**
     * Urdu naam — ab lazmi nahi.
     *
     * Na ho to angrezi naam hi dono jagah chalta hai. Dukan wale ke paas aksar ek hi
     * naam hota hai; usay do khaanon mein wohi cheez do dafa likhwana sirf bojh tha.
     */
    titleUr: z.string().trim().max(80).optional(),
    /** Tafseel — pehle bhi ikhtiyari thi, ab bhi */
    descriptionUr: z.string().trim().max(300).optional(),
    /**
     * Category — ikhtiyari.
     *
     * Na chuni jaye to maal "Baqi maal" mein jata hai, jahan se ops usay theek kar sakti
     * hai. Lazmi rakhne se maal daalne mein ek qadam barhta tha; bilkul chhor dene se
     * maal kisi list mein na aata — ye beech ka rasta dono se behtar hai.
     */
    categorySlug: z.string().trim().min(2).optional(),
    supplierPrice: z.number().int().positive('ریٹ لکھیں').max(1_000_000),
    /**
     * Ginti ab lazmi nahi — na ho to 10.
     *
     * Bina ginti ke maal OUT_OF_STOCK rehta hai aur kisi ko nazar nahi aata, is liye
     * khali chhorne par usay sifar farz karna sab se bura jawab hota: dukan wala maal
     * daal kar chala jata aur usay pata bhi na chalta ke wo kahin dikh hi nahi raha.
     */
    stockQty: z.number().int().min(0).max(100_000).default(10),
    /**
     * Rang/size ke jorhe — JAAN BOOJH KAR optional.
     *
     * Bohot sa maal aisa hai jis par rang ya size hote hi nahi (ek design, ek qism).
     * Un par ye sawal poochhna maal daalne ka rasta lamba karta hai, aur lamba rasta
     * wo cheez hai jis par dukan wala beech mein chhor kar chala jata hai.
     *
     * Jab hon: har jorhe ki apni ginti, aur upar wali `stockQty` un ka jama nahi —
     * wo poore maal ki apni ginti hai jo variants na hone par chalti hai.
     */
    variants: z
      .array(
        z
          .object({
            colour: z.string().trim().max(30).optional(),
            size: z.string().trim().max(30).optional(),
            stockQty: z.number().int().min(0).max(100_000),
          })
          .strict()
          // Dono khali = wo "sada" maal hai, us ke liye alag qatar bekar hai
          .refine((v) => Boolean(v.colour?.trim() || v.size?.trim()), {
            message: 'Rang ya size, kam se kam ek likhen',
          }),
      )
      .max(30)
      .optional(),
    /**
     * Tasveerein aur video — pehle `/api/v1/supplier/media` par upload ho chuki hoti hain.
     *
     * 🔴 URL yahan sirf shakl ke lehaz se jaancha jata hai. Ye HAMARI storage ka hai ya
     * nahi, wo faisla service karti hai (SupplierCatalogueService) — kyunke storage ka
     * base URL environment se aata hai aur schema ko environment ka pata nahi hota.
     */
    media: z
      .array(
        z
          .object({
            url: z.string().url().max(500),
            type: z.enum(['IMAGE', 'VIDEO']),
            isStatusSource: z.boolean().default(false),
          })
          .strict(),
      )
      /*
       * 🔴 Kam az kam EK tasveer lazmi.
       *
       * Bina tasveer ka maal is platform par bikta hi nahi: reseller ka poora kaam
       * WhatsApp status par tasveer lagana hai. Pehle ye optional tha aur bina tasveer
       * wale maal catalogue mein khali khaane ban kar parre rehte the — na koi unhen
       * lagati, na dukan wale ko wajah pata chalti.
       */
      .min(1, 'Kam az kam ek tasveer lagayen')
      .max(MAX_MEDIA_PER_PRODUCT),
  })
  .strict()

/**
 * DRAFT maal ki nayi tafseel.
 *
 * Shakl `NewProductSchema` jaisi hai magar `media` ke baghair — tasveerein apne alag
 * endpoint se lagti aur hatti hain, aur unhen is form ke saath baandhne ka matlab hota
 * ke naam theek karne ke liye bhi saari tasveerein dobara bhejni paren.
 */
export const EditDraftProductSchema = z
  .object({
    titleUr: z.string().trim().min(2, 'مال کا نام لکھیں').max(80),
    titleEn: z.string().trim().min(2, 'English name').max(80),
    descriptionUr: z.string().trim().max(300).optional(),
    categorySlug: z.string().trim().min(2),
    supplierPrice: z.number().int().positive('ریٹ لکھیں').max(1_000_000),
    stockQty: z.number().int().min(1, 'کتنا مال ہے؟').max(100_000),
  })
  .strict()

export const SupplierApplicationSchema = z
  .object({
    businessName: z.string().trim().min(2, 'دکان کا نام لکھیں').max(80),
    ownerName: z.string().trim().min(2, 'مالک کا نام لکھیں').max(60),
    phone: PakistaniPhoneSchema,
    city: z.string().trim().min(2, 'شہر لکھیں').max(40),
    marketName: z.string().trim().max(60).optional(),
    address: z.string().trim().min(5, 'پتہ لکھیں').max(200),
    ntn: z.string().trim().max(20).optional(),
  })
  .strict()

export const RegisterSchema = z
  .object({
    phone: PakistaniPhoneSchema,
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Code 6 hindson ka hota hai'),
    // Sirf do khaane. Har extra khana ek aur wajah hai chhor jane ki —
    // area aur payout tab poochhte hain jab zaroorat parti hai.
    name: z.string().trim().min(2, 'Apna naam likhen').max(40),
    city: z.string().trim().min(2, 'Sheher likhen').max(40),
  })
  .strict()

export const OtpVerifySchema = z.object({
  phone: PakistaniPhoneSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Code 6 hindson ka hota hai'),
})

// ---------- Catalogue ----------

export const CatalogueQuerySchema = CursorPaginationSchema.extend({
  category: z.string().optional(),
  q: z.string().trim().min(1).max(60).optional(),
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  inStockOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
}).refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
  message: 'minPrice, maxPrice se zyada nahi ho sakta',
  path: ['minPrice'],
})

export const BazaarQuerySchema = CursorPaginationSchema.extend({
  city: z.string().trim().max(40).optional(),
  category: z.string().trim().max(40).optional(),
  q: z.string().trim().min(1).max(60).optional(),
  /** Sirf wo dukanen jinhon ne pichhle hafte kuch naya lagaya */
  fresh: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

// ---------- Pricing ----------

export const SetRetailPriceSchema = z.object({
  retailPrice: z.number().int().positive().max(1_000_000),
})

// ---------- Status pack ----------

/**
 * Pack ke apne faislay — zaban, aur kya kya tasveer par chhape.
 *
 * 🔴 `name`/`phone` ki hadd chhoti hai aur ye jaan boojh kar hai: ye qadrein SEEDHA
 * tasveer par chhapti hain. Lamba naam template ka poora neecha hissa tor deta hai
 * (Nastaliq lipatta nahi, phailta hai) aur pack bekar ban kar reseller ke paas jata hai.
 */
export const PackOptionsSchema = z.object({
  lang: z.enum(['ur', 'en']).optional(),
  showName: z.boolean().optional(),
  showPhone: z.boolean().optional(),
  showPrice: z.boolean().optional(),
  /** Khali chhoren to profile ka naam chalta hai. */
  name: z.string().trim().max(30).optional(),
  phone: z.string().trim().max(20).optional(),
})

export const GenerateStatusPackSchema = z.object({
  productId: z.string().min(1),
  /** Kaunsi tasveer — na den to product ki cover. */
  mediaId: z.string().min(1).max(40).optional(),
  templateKey: TemplateKeySchema,
  /**
   * Agar reseller ne price abhi slider par set kiya hai to yahan aata hai;
   * warna us ka saved retail price (ya suggestedRetail) use hota hai.
   */
  retailPrice: z.number().int().positive().max(1_000_000).optional(),
  /** Na den to reseller ke profile wale default chalte hain. */
  options: PackOptionsSchema.optional(),
})

/** "ہمیشہ کے لیے" — Studio ke mojooda faislay profile par mehfooz kar dena. */
export const SavePackDefaultsSchema = PackOptionsSchema.extend({
  /**
   * Kaun sa template default ho — built-in ki key (`sale`) ya apna (`custom:<id>@<n>`).
   * `null` = system ka default (`simple`). Na den to jo pehle se hai wohi rehta hai.
   */
  templateKey: TemplateKeySchema.nullable().optional(),
})

// ---------- Orders ----------

export const OrderLineInputSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  qty: z.number().int().min(1).max(50),
  /** wo price jo reseller ne customer se tay kiya */
  retailPrice: z.number().int().positive().max(1_000_000),
})

export const CreateOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, 'Customer ka naam likhen').max(80),
    phone: PakistaniPhoneSchema,
    address: z.string().trim().min(10, 'Poora pata likhen — gali/mohalla ke saath').max(400),
    area: z.string().trim().min(2, 'Ilaqa likhen').max(80),
    // 🔴 RTO ka sab se bara lever — optional hai magar UI is par zor deti hai
    locationLat: z.number().min(-90).max(90).optional(),
    locationLng: z.number().min(-180).max(180).optional(),
  }),
  lines: z.array(OrderLineInputSchema).min(1, 'Kam se kam ek item chahiye').max(20),
  deliveryFee: z.number().int().nonnegative().max(5_000).default(200),
  paymentMethod: z.enum(['COD', 'PREPAID']).default('COD'),
})

export const CancelOrderSchema = z.object({
  reason: z.string().trim().min(3, 'Wajah likhen').max(200),
})

export const OrderListQuerySchema = CursorPaginationSchema.extend({
  status: z
    .enum([
      'PENDING_CONFIRM',
      'CONFIRMED',
      'SENT_TO_SUPPLIER',
      'DISPATCHED',
      'DELIVERED',
      'RTO',
      'CANCELLED',
    ])
    .optional(),
})

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>
export type CancelOrderInput = z.infer<typeof CancelOrderSchema>
export type OrderListQuery = z.infer<typeof OrderListQuerySchema>

export type OtpRequestInput = z.infer<typeof OtpRequestSchema>
export type OtpVerifyInput = z.infer<typeof OtpVerifySchema>
export type CatalogueQuery = z.infer<typeof CatalogueQuerySchema>
export type BazaarQuery = z.infer<typeof BazaarQuerySchema>
export type SetRetailPriceInput = z.infer<typeof SetRetailPriceSchema>
export type GenerateStatusPackInput = z.infer<typeof GenerateStatusPackSchema>
export type PackOptionsInput = z.infer<typeof PackOptionsSchema>
export type EditDraftProductInput = z.infer<typeof EditDraftProductSchema>
