/**
 * READ MODELS — surface ke hisaab se alag.
 *
 * Ye is codebase ka sab se ahem design faisla hai:
 * `supplierPrice` sirf `PricingProductView` mein maujood hai, jo SIRF order pricing aur
 * fee calculation ke liye use hota hai. Reseller-facing service is type ko chhoo hi nahi sakti —
 * TypeScript compile hi nahi hoga.
 *
 * Yani price leak ko rokne ke liye discipline par bharosa nahi — type system par hai.
 */
import type { PackFormatKey, PackOptions, Pkr } from '@oyebazar/shared'

/** PUBLIC (Bazaar) — 🔴 koi price field nahi. Ye qanooni requirement hai. */
export interface PublicProductView {
  readonly slug: string
  readonly titleUr: string
  readonly titleEn: string
  readonly category: CategoryView
  readonly coverImageUrl: string | null
  readonly supplierName: string
  readonly supplierSlug: string
  readonly supplierCity: string
  /** Kab list hua — "2 din pehle" isi se banta hai */
  readonly listedAt: Date
}

/** RESELLER (login ke baad) — Baji price dikhta hai, supplier ka kuch nahi. */
export interface ResellerProductView {
  readonly id: string
  readonly titleUr: string
  readonly titleEn: string
  readonly descriptionUr: string | null
  readonly category: CategoryView
  readonly coverImageUrl: string | null
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  readonly inStock: boolean
  /**
   * Kitna maal bacha hai — reserve shuda nikaal kar.
   *
   * 🔴 Reseller ko ye JAAN boojh kar dikhaya jata hai. Pehle sirf haan/na tha ("mojood"
   * ya "khatam"), aur do piece wala maal poore stock jaisa hi lagta tha: wo us par apna
   * status lagati, teen customer laati, aur do ko mana karna parta — nuqsan sirf paise
   * ka nahi, us ki apni sakh ka hota tha, jo is kaam mein us ki asal poonji hai.
   */
  readonly stockLeft: number
  readonly media: readonly ProductMediaView[]
  readonly variants: readonly ProductVariantView[]
  readonly listedAt: Date
  /**
   * Kis dukan ka maal — shanakht, rabta NAHI.
   *
   * 🔴 Yahan `phone`/`whatsappPublic` jaan boojh kar nahi hai. Dekhen
   * `RESELLER_PRODUCT_SELECT` ka note: portal ke andar dukan CHUNI ja sakti hai, us se
   * seedha rabta nahi kiya ja sakta.
   */
  readonly supplier: {
    readonly id: string
    readonly slug: string
    readonly businessName: string
    readonly city: string
    readonly marketName: string | null
  }
}

/**
 * 🔴 INTERNAL ONLY — is mein supplierPrice hai.
 * Sirf order pricing, fee ledger aur ops surfaces. Kabhi bhi reseller ya public response mein nahi.
 */
export interface PricingProductView {
  readonly id: string
  readonly supplierId: string
  readonly supplierPrice: Pkr
  readonly bajiPrice: Pkr
  readonly suggestedRetail: Pkr
  readonly inStock: boolean
}

/** Content Studio render ke liye — image par sirf yehi cheezein chhapti hain. */
/** Ek tasveer jis par status pack ban sakta hai. */
export interface RenderImageView {
  readonly id: string
  readonly url: string
}

export interface RenderProductView {
  readonly id: string
  readonly titleUr: string
  readonly titleEn: string
  /** Pehli/status wali tasveer — mediaId na diya jaye to yehi chalti hai. */
  readonly coverImageUrl: string | null
  /**
   * Saari IMAGE media, sortOrder ke hisab se.
   *
   * 🔴 Sirf tasveerein — video yahan kabhi nahi aati. Status pack Playwright ke HTML
   * screenshot se banta hai; video par template lagane ke liye bilkul alag (ffmpeg wali)
   * pipeline chahiye jo abhi hai hi nahi. Video product gallery ki cheez hai.
   */
  readonly images: readonly RenderImageView[]
  readonly categoryNameUr: string
}

/**
 * Home ki live patti ka ek item.
 *
 * 🔴 Ye Alahdeen ke "buyer requests" jaisa nazar aata hai magar hai bilkul alag:
 * hum banawati requests nahi dikhate (hamare paas public orders hain hi nahi).
 * Ye asli waqia hai — falan wholesaler ne falan maal list kiya.
 */
export interface PublicActivityItem {
  readonly slug: string
  readonly titleUr: string
  readonly titleEn: string
  readonly supplierName: string
  readonly supplierSlug: string
  readonly city: string
  readonly categoryNameUr: string
  readonly categoryNameEn: string
  readonly listedAt: Date
}

/**
 * Rate badalne ki khuli darkhwast — ops ke safhe par yehi dikhti hai.
 *
 * 🔴 `resellersUnderWater` hi is poore safhe ki wajah hai: itni resellers ne is maal
 * par apna retail rate save kar rakha hai jo NAYE bajiPrice se neeche hai. Manzoori
 * milte hi un sab ka laga hua status pack apni lagat se kam ka rate dikha raha hoga.
 * Ye number dekhe baghair "haan" kehna andhere mein faisla karna hai.
 */
export interface PriceChangeRequestView {
  readonly id: string
  readonly productId: string
  readonly supplierId: string
  readonly supplierName: string
  readonly productTitleUr: string
  readonly productTitleEn: string
  readonly currentSupplierPrice: Pkr
  readonly requestedSupplierPrice: Pkr
  /** Abhi reseller ko kya dikhta hai */
  readonly currentBajiPrice: Pkr
  /** Manzoori ke baad kya dikhega */
  readonly proposedBajiPrice: Pkr
  readonly reason: string | null
  readonly resellersWithSavedPrice: number
  readonly resellersUnderWater: number
  readonly createdAt: Date
}

export interface CategoryView {
  readonly slug: string
  readonly nameUr: string
  readonly nameEn: string
}

export interface ProductMediaView {
  /** Status pack isi id se maanga jata hai — har tasveer ka apna pack. */
  readonly id: string
  readonly type: 'IMAGE' | 'VIDEO'
  readonly url: string
  readonly sortOrder: number
}

export interface ProductVariantView {
  readonly id: string
  readonly size: string | null
  readonly colour: string | null
  readonly inStock: boolean
  /**
   * Is jorhe ki apni tasveer — na ho to poore maal wali chalti hai.
   *
   * Reseller ko yehi chahiye: jab wo "laal" chunti hai to us ke saamne laal aaye, warna
   * us ka status pack neela dikhata hai aur customer ko laal milta — aur farq milne par
   * hi pata chalta hai.
   */
  readonly imageUrl: string | null
}

export interface PublicSupplierView {
  readonly slug: string
  readonly businessName: string
  readonly city: string
  readonly marketName: string | null
  readonly bioUr: string | null
  readonly whatsappPublic: string
  readonly address: string | null
  readonly logoUrl: string | null
  /** Dono zubanon mein — UI locale ke hisaab se chunti hai */
  readonly categories: readonly { nameUr: string; nameEn: string }[]
  readonly productCount: number
  /** Kab se OyeBazar par hai — purani dukan par bharosa zyada hota hai */
  readonly memberSince: Date
  /** Aakhri baar naya maal kab laga — null agar abhi tak kuch live nahi */
  readonly lastListedAt: Date | null
}

export interface ResellerView {
  readonly id: string
  readonly name: string
  readonly whatsappPhone: string
  readonly city: string
  readonly area: string | null
  readonly tier: 'NEW' | 'BRONZE' | 'SILVER' | 'GOLD'
  readonly status: 'ACTIVE' | 'LIMITED' | 'SUSPENDED'
  readonly payoutAccount: string | null
  /**
   * Status pack ke default faislay — zaban, aur kya kya tasveer par chhape.
   *
   * Ek hi object (chhe alag khaane nahi) is liye ke Studio, service aur cache key —
   * teenon ko yehi poori shakal chahiye, aur beech mein tootne ki gunjaish kam rehti hai.
   */
  readonly packDefaults: PackOptions
  /**
   * Default template — built-in ki key (`sale`) ya apna (`custom:<id>@<n>`).
   *
   * `packDefaults` se alag rakha hai jaan boojh kar: `PackOptions` wo faislay hain jo
   * ek hi tasveer ki SHANAKHT badalte hain, aur templateKey pehle se cache key ka apna
   * hissa hai. Dono ko mila dena us key ko do jagah rakhna hota.
   */
  readonly packTemplateKey: string | null
  readonly createdAt: Date
}

export interface StatusPackView {
  readonly id: string
  readonly resellerId: string
  readonly productId: string
  /** Kis tasveer par bana — khali string = cover. */
  readonly mediaId: string
  readonly templateKey: string
  readonly priceUsed: Pkr
  readonly format: PackFormatKey
  readonly imageUrl: string | null
  readonly generatedAt: Date | null
  readonly downloadedAt: Date | null
}
