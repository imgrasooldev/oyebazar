/**
 * SupplierCatalogueService — wholesaler apna maal dekhta hai aur stock on/off karta hai.
 *
 * Ye portal ka sab se zaroori kaam hai, order accept karne se bhi zyada: maal khatam ho
 * jaye aur listing LIVE rahe to reseller status laga kar customer se paisa wasool karti
 * rehti hai, aur ghalti akhir mein RTO ban kar sab ka nuqsan karti hai. Is liye stock
 * band karna ek tap ka kaam hona chahiye — form ya request nahi.
 *
 * Live karna bhi wholesaler ke haath mein hai, magar sirf us maal ka jo pehle verify ho
 * chuka (LIVE ya OUT_OF_STOCK). DRAFT/ARCHIVED ops ka faisla hai.
 */
import {
  ConflictError,
  MAX_MEDIA_PER_PRODUCT,
  NotFoundError,
  ValidationError,
  applyBasisPoints,
  addPkr,
  pkr,
  type Pkr,
} from '@oyebazar/shared'
import type {
  ProductMediaInput,
  SupplierProductRepository,
  SupplierProductView,
} from '../ports/supplier-portal-repositories'
import type { SupplierInternalRepository } from '../ports/order-repositories'
import type { InventoryRepository } from '../ports/inventory-repositories'
import type { Analytics, Logger } from '../ports/infrastructure'

/**
 * Wholesaler ke rate se hamara rate aur tajweez kardah retail.
 *
 * 🔴 Ye function alag is liye hai ke DO jagah chahiye tha: naya maal banate waqt aur
 * DRAFT edit karte waqt. Do jagah nakal karte to kal fee ka formula ek jagah badalta
 * aur doosri jagah purana reh jata — aur farq kisi ko mahino pata na chalta, kyunke
 * dono soorton mein number "theek lagta" hai.
 */
function derivePrices(supplierPrice: Pkr, feeRateBps: number): { bajiPrice: Pkr; suggestedRetail: Pkr } {
  // Hamari fee: 1000 par 5% = 50 → reseller ko 1050
  const bajiPrice = addPkr(supplierPrice, pkr(applyBasisPoints(supplierPrice, feeRateBps)))

  // Tajweez kardah retail — reseller isay badal sakti hai, ye sirf shuruat hai
  return { bajiPrice, suggestedRetail: pkr(Math.round((bajiPrice * 1.35) / 50) * 50) }
}

export class SupplierCatalogueService {
  constructor(
    private readonly products: SupplierProductRepository,
    private readonly suppliers: SupplierInternalRepository,
    private readonly inventory: InventoryRepository,
    private readonly analytics: Analytics,
    private readonly logger: Logger,
    /**
     * Hamari apni storage ka public prefix — media URL isi se shuru hone chahiyen.
     *
     * 🔴 Ye service ko is liye diya jata hai ke rok DOMAIN mein rahe, route par nahi.
     * Kal koi doosra endpoint bhi product banaye to ye shart us par bhi lagegi.
     */
    private readonly mediaBaseUrl: string,
  ) {}

  /**
   * Wholesaler apna maal daalta hai.
   *
   * Wo sirf APNA rate deta hai (1000). Hamara rate (1050) yahan banta hai — us ki fee
   * ke hisab se — aur wohi reseller ko dikhta hai. Wholesaler ko poora hisab saaf
   * dikhaya jata hai, chhupaya nahi: "aap ko 1000 milenge, reseller ko 1050 dikhega".
   *
   * 🔴 Maal DRAFT banta hai. Ops dekh kar LIVE karti hai — kyunke reseller isay apne
   * status par lagati hai aur ghalat rate ya bina tasveer ka maal poore catalogue ki
   * sakh khata hai.
   */
  async addProduct(
    supplierId: string,
    input: {
      titleUr: string
      titleEn: string
      descriptionUr?: string
      categorySlug: string
      supplierPrice: Pkr
      stockQty: number
      media?: readonly ProductMediaInput[]
    },
  ): Promise<{ id: string; bajiPrice: Pkr; suggestedRetail: Pkr }> {
    const supplier = await this.suppliers.findInternal(supplierId)
    if (!supplier) throw new NotFoundError('Supplier', supplierId)

    if (input.supplierPrice <= 0) {
      throw new ValidationError('Rate likhna zaroori hai')
    }

    const media = this.assertOwnMedia(input.media ?? [])

    const { bajiPrice, suggestedRetail } = derivePrices(input.supplierPrice, supplier.feeRateBps)

    const created = await this.products.create({
      supplierId,
      titleUr: input.titleUr,
      titleEn: input.titleEn,
      ...(input.descriptionUr ? { descriptionUr: input.descriptionUr } : {}),
      categorySlug: input.categorySlug,
      supplierPrice: input.supplierPrice,
      bajiPrice,
      suggestedRetail,
      stockQty: input.stockQty,
      media,
    })

    await this.analytics.track({
      name: 'supplier_product_added',
      actorType: 'supplier',
      actorId: supplierId,
      properties: {
        productId: created.id,
        supplierPrice: input.supplierPrice,
        bajiPrice,
        images: media.filter((item) => item.type === 'IMAGE').length,
        videos: media.filter((item) => item.type === 'VIDEO').length,
      },
    })
    this.logger.info('supplier_product_added', {
      supplierId,
      productId: created.id,
      supplierPrice: input.supplierPrice,
      bajiPrice,
      media: media.length,
    })

    return { id: created.id, bajiPrice, suggestedRetail }
  }

  /**
   * Ginti theek karna — naya maal aaya, ya gin kar kam nikla.
   *
   * Sifar par listing khud band ho jati hai (repository mein) — warna reseller status
   * lagati rehti hai aur order aakhir mein RTO banta hai.
   */
  async setStockQuantity(supplierId: string, productId: string, qty: number): Promise<void> {
    if (!Number.isInteger(qty) || qty < 0 || qty > 100_000) {
      throw new ValidationError('Ginti theek nahi')
    }

    const changed = await this.inventory.setQuantity(supplierId, productId, qty)
    if (!changed) throw new NotFoundError('Product', productId)

    await this.analytics.track({
      name: 'supplier_stock_quantity_set',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { productId, qty },
    })
    this.logger.info('supplier_stock_quantity_set', { supplierId, productId, qty })
  }

  /**
   * Delivery ka rate — isi sheher ka, aur doosre sheher ka.
   *
   * Do khaane is liye ke courier ka bill bhi do tarah ka hota hai: Karachi ke andar aur
   * Karachi se Skardu. Ek hi rate rakhne par ya dukan nuqsan uthati hai ya door wale
   * customer se zyada wasool hota hai.
   */
  async setDeliveryRates(
    supplierId: string,
    rates: { city: number; other: number },
  ): Promise<void> {
    const ok = (value: number) => Number.isInteger(value) && value >= 0 && value <= 5_000
    if (!ok(rates.city) || !ok(rates.other)) {
      throw new ValidationError('Delivery ka rate theek nahi')
    }

    const changed = await this.products.setDeliveryRates(supplierId, rates)
    if (!changed) throw new NotFoundError('Supplier', supplierId)

    await this.analytics.track({
      name: 'supplier_delivery_rates_set',
      actorType: 'supplier',
      actorId: supplierId,
      properties: rates,
    })
    this.logger.info('supplier_delivery_rates_set', { supplierId, ...rates })
  }

  // ------------------------------------------------------------- variants

  /**
   * Rang aur size — har jorhe ki apni ginti.
   *
   * 🔴 Ye "ek maal, ek ginti" wale purane tareeqe ki jagah nahi leta, us ke ooper aata
   * hai: jis maal par variants na hon wo waise hi chalta rehta hai (ek default variant),
   * aur jis par hon us ki ginti variants ke jama se banti hai.
   */
  listVariants(supplierId: string, productId: string) {
    return this.inventory.listVariants(supplierId, productId)
  }

  async addVariant(
    supplierId: string,
    productId: string,
    input: { size?: string; colour?: string; stockQty: number },
  ) {
    const size = input.size?.trim() || null
    const colour = input.colour?.trim() || null

    // Dono khali = wohi purana "sada" variant. Us par alag qatar banane ka koi matlab nahi
    if (!size && !colour) {
      throw new ValidationError('Rang ya size, kam se kam ek likhen')
    }
    if (!Number.isInteger(input.stockQty) || input.stockQty < 0 || input.stockQty > 100_000) {
      throw new ValidationError('Ginti theek nahi')
    }

    const existing = await this.inventory.listVariants(supplierId, productId)

    // Wohi rang aur size dobara — warna ek hi cheez do qataron mein aa jati hai aur
    // ginti do jagah batti hai
    const clash = existing.some(
      (variant) =>
        (variant.size ?? null) === size && (variant.colour ?? null) === colour,
    )
    if (clash) throw new ConflictError('Ye rang aur size pehle se maujood hai')

    /*
     * SKU khud banta hai. Dukan wale se maangte to har dafa ek jhagra hota: ya wo khali
     * chhorta, ya wohi code do jagah likh deta — aur SKU poore nizam mein unique hai.
     */
    const suffix = [colour, size].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const skuCode = `${productId}-${suffix || 'v'}-${existing.length + 1}`

    const created = await this.inventory.addVariant({
      supplierId,
      productId,
      size,
      colour,
      skuCode,
      stockQty: input.stockQty,
    })
    if (!created) throw new NotFoundError('Product', productId)

    await this.analytics.track({
      name: 'supplier_variant_added',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { productId, size, colour, stockQty: input.stockQty },
    })

    return created
  }

  async updateVariant(
    supplierId: string,
    variantId: string,
    input: { size?: string | null; colour?: string | null; stockQty?: number },
  ): Promise<void> {
    if (
      input.stockQty !== undefined &&
      (!Number.isInteger(input.stockQty) || input.stockQty < 0 || input.stockQty > 100_000)
    ) {
      throw new ValidationError('Ginti theek nahi')
    }

    const changed = await this.inventory.updateVariant({ supplierId, variantId, ...input })
    if (!changed) throw new NotFoundError('Variant', variantId)

    await this.analytics.track({
      name: 'supplier_variant_updated',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { variantId, ...input },
    })
  }

  async removeVariant(supplierId: string, variantId: string): Promise<void> {
    const result = await this.inventory.removeVariant(supplierId, variantId)

    if (result === 'not-found') throw new NotFoundError('Variant', variantId)
    if (result === 'in-use') {
      /*
       * Jis par order ho chuka wo mitta nahi — us ki id purane orders mein likhi hai.
       * Mit jaye to "kaun sa rang tha" ka jawab hamesha ke liye gum, aur wahi sawal
       * jhagre mein poochha jata hai. Ginti sifar karna hamesha maujood hai.
       */
      throw new ConflictError('Is par order ho chuka hai — mitane ki jagah ginti sifar kar den')
    }

    await this.analytics.track({
      name: 'supplier_variant_removed',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { variantId },
    })
  }

  async listMyProducts(supplierId: string): Promise<SupplierProductView[]> {
    return this.products.listForSupplier(supplierId)
  }

  async setStock(supplierId: string, productId: string, inStock: boolean): Promise<void> {
    const status = inStock ? 'LIVE' : 'OUT_OF_STOCK'
    const changed = await this.products.setStockStatus(supplierId, productId, status)

    // Repository ne ownership check kiya — false ka matlab "ye maal is dukan ka nahi"
    // ya "DRAFT/ARCHIVED hai". Dono soorton mein wohi jawab, warna doosre wholesaler
    // ke product ids taare ja sakte hain.
    if (!changed) throw new NotFoundError('Product', productId)

    await this.analytics.track({
      name: inStock ? 'supplier_stock_on' : 'supplier_stock_off',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { productId },
    })
    this.logger.info('supplier_stock_changed', { supplierId, productId, status })
  }

  /**
   * DRAFT maal ki poori tafseel badalna — naam, tafseel, category, rate, ginti.
   *
   * 🔴 Sirf DRAFT, aur rok repository ki query mein hai. LIVE maal is raste se nahi
   * badalta: us par reseller apna retail rate save kar chuki hoti hai aur us ke status
   * pack ban chuke hote hain. Rate barhane ka matlab hai ke us ka pehle se WhatsApp par
   * laga hua pack ab us ki apni lagat se neeche ka rate dikha raha hai — aur usay khabar
   * tak nahi. Wo alag flow hai (itla + us ke saved rate ka hisab), ye nahi.
   *
   * Rate ka hisab yahan dobara hota hai, client se nahi aata — wohi wajah jo naya maal
   * banate waqt hai.
   */
  async updateDraft(
    supplierId: string,
    productId: string,
    input: {
      titleUr: string
      titleEn: string
      descriptionUr?: string
      categorySlug: string
      supplierPrice: Pkr
      stockQty: number
    },
  ): Promise<{ bajiPrice: Pkr; suggestedRetail: Pkr }> {
    const supplier = await this.suppliers.findInternal(supplierId)
    if (!supplier) throw new NotFoundError('Supplier', supplierId)

    if (input.supplierPrice <= 0) throw new ValidationError('Rate likhna zaroori hai')
    if (!Number.isInteger(input.stockQty) || input.stockQty < 1 || input.stockQty > 100_000) {
      throw new ValidationError('Ginti theek nahi')
    }

    const { bajiPrice, suggestedRetail } = derivePrices(input.supplierPrice, supplier.feeRateBps)

    const changed = await this.products.updateDraft(supplierId, productId, {
      titleUr: input.titleUr,
      titleEn: input.titleEn,
      ...(input.descriptionUr ? { descriptionUr: input.descriptionUr } : {}),
      categorySlug: input.categorySlug,
      supplierPrice: input.supplierPrice,
      bajiPrice,
      suggestedRetail,
      stockQty: input.stockQty,
    })

    // Maal is dukan ka nahi, ya ab DRAFT nahi raha — dono ka wohi jawab, warna doosri
    // dukan ke product ids taare ja sakte hain
    if (!changed) throw new NotFoundError('Product', productId)

    await this.analytics.track({
      name: 'supplier_draft_updated',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { productId, supplierPrice: input.supplierPrice, bajiPrice },
    })
    this.logger.info('supplier_draft_updated', { supplierId, productId })

    return { bajiPrice, suggestedRetail }
  }

  /**
   * Mojooda maal par nayi tasveerein/video.
   *
   * 🔴 Product banate waqt hi media daal dena kaafi nahi tha: jis dukan wale ki tasveer
   * dhundhli aa gayi ya jis ne jaldi mein sirf ek daali, us ke paas theek karne ka koi
   * raasta hi nahi tha — usay poora maal dobara banana parta, aur purane product par
   * chalte hue order us ke saath nahi jate.
   */
  async addMedia(
    supplierId: string,
    productId: string,
    media: readonly ProductMediaInput[],
  ): Promise<void> {
    const checked = this.assertOwnMedia(media)
    // Nayi media kabhi khud status source nahi banti — wo alag, saaf faisla hai
    const added = await this.products.addMedia(
      supplierId,
      productId,
      checked.map((item) => ({ ...item, isStatusSource: false })),
    )
    if (!added) throw new NotFoundError('Product', productId)

    await this.analytics.track({
      name: 'supplier_media_added',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { productId, count: checked.length },
    })
    this.logger.info('supplier_media_added', { supplierId, productId, count: checked.length })
  }

  async removeMedia(supplierId: string, productId: string, mediaId: string): Promise<void> {
    const removed = await this.products.removeMedia(supplierId, productId, mediaId)
    if (!removed) throw new NotFoundError('Tasveer', mediaId)

    await this.analytics.track({
      name: 'supplier_media_removed',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { productId, mediaId },
    })
  }

  /** Kaunsi tasveer cover banegi — catalogue par yehi dikhti hai. */
  async setStatusSource(supplierId: string, productId: string, mediaId: string): Promise<void> {
    const changed = await this.products.setStatusSource(supplierId, productId, mediaId)
    // Video par status pack nahi banta — repository usay dhoondti hi nahi, is liye
    // yahan wohi "nahi mili" wala jawab aata hai
    if (!changed) throw new NotFoundError('Tasveer', mediaId)

    await this.analytics.track({
      name: 'supplier_media_cover_set',
      actorType: 'supplier',
      actorId: supplierId,
      properties: { productId, mediaId },
    })
  }

  async reorderMedia(
    supplierId: string,
    productId: string,
    mediaIds: readonly string[],
  ): Promise<void> {
    const changed = await this.products.reorderMedia(supplierId, productId, mediaIds)
    if (!changed) throw new NotFoundError('Product', productId)
  }

  /**
   * 🔴 Media ki jaanch — teen sharten, teenon ki apni wajah hai.
   *
   * 1. URL hamari apni storage ka ho. Client `/api/v1/supplier/media` se upload kar ke
   *    URL wapas laata hai; wahan qism aur naap dono jaanche jate hain. Agar yahan bahar
   *    ka link qubool kar lete to poori upload wali jaanch bekaar ho jati — koi bhi
   *    seedha JSON bhej kar catalogue mein kisi aur ki site ki tasveer laga deta.
   * 2. Ginti par hadd — warna ek product par sau tasveerein aa kar catalogue ka safha
   *    Sadia ke 3G par khol hi nahi paata.
   * 3. Status wali tasveer THEEK EK ho, aur wo video na ho. Reseller ke Content Studio
   *    mein yehi pehle se chuni hui aati hai; do "default" ka matlab koi default nahi.
   */
  private assertOwnMedia(media: readonly ProductMediaInput[]): ProductMediaInput[] {
    if (media.length > MAX_MEDIA_PER_PRODUCT) {
      throw new ValidationError(
        `Ek maal par zyada se zyada ${MAX_MEDIA_PER_PRODUCT} tasveerein ya video lag sakti hain`,
      )
    }

    for (const item of media) {
      if (!item.url.startsWith(this.mediaBaseUrl)) {
        throw new ValidationError('Tasveer pehle upload karen — bahar ka link nahi chalta')
      }
      if (item.type === 'VIDEO' && item.isStatusSource) {
        throw new ValidationError('Status pack video par nahi banta — koi tasveer chunen')
      }
    }

    const images = media.filter((item) => item.type === 'IMAGE')
    if (images.length === 0) return [...media]

    // Ek hi status source: jo chuni gayi ho wo, warna pehli tasveer
    const chosen = images.find((item) => item.isStatusSource) ?? images[0]
    return media.map((item) => ({ ...item, isStatusSource: item === chosen }))
  }
}
