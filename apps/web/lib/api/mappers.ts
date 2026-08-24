/**
 * 🔴 PRICE LEAK KE KHILAF DOOSRI DEFENCE LAYER.
 *
 * Domain view → wire DTO. Har mapper apne Zod DTO se `.parse()` kar ke nikalta hai,
 * aur har DTO `.strict()` hai — agar kisi din repository galti se extra field le aaye
 * (misal supplierPrice), to yahan RUNTIME par error aayega, chup chaap leak nahi hogi.
 *
 * Layer 1 = Prisma select · Layer 2 = ye mappers · Layer 3 = CI ka price-leak test.
 */
import type {
  CatalogueItem,
  PublicProductView,
  PublicSupplierView,
  ResellerOrderView,
  ResellerProductView,
  ResellerView,
  StatusPackKitResult,
  StatusPackResult,
} from '@oyebazar/core'
import {
  ORDER_STATUS_UR,
  PACK_FORMATS,
  PACK_PLATFORMS,
  PackKitDTO,
  PublicProductDTO,
  ResellerOrderDTO,
  PublicSupplierDetailDTO,
  PublicSupplierListItemDTO,
  ResellerProductDetailDTO,
  ResellerProductListItemDTO,
  ResellerProfileDTO,
  StatusPackDTO,
  maskAccount,
  maskPhone,
  type PublicProduct,
  type PublicSupplierDetail,
  type PublicSupplierListItem,
  type ResellerOrder,
  type ResellerProductDetail,
  type ResellerProductListItem,
  type PackKit,
  type ResellerProfile,
  type StatusPack,
} from '@oyebazar/shared'

export function toPublicProductDTO(view: PublicProductView): PublicProduct {
  return PublicProductDTO.parse(view)
}

export function toPublicSupplierListDTO(view: PublicSupplierView): PublicSupplierListItem {
  return PublicSupplierListItemDTO.parse({
    slug: view.slug,
    businessName: view.businessName,
    city: view.city,
    marketName: view.marketName,
    categories: view.categories,
    logoUrl: view.logoUrl,
    productCount: view.productCount,
    memberSince: view.memberSince,
    lastListedAt: view.lastListedAt,
  })
}

export function toPublicSupplierDetailDTO(view: PublicSupplierView): PublicSupplierDetail {
  return PublicSupplierDetailDTO.parse({
    slug: view.slug,
    businessName: view.businessName,
    city: view.city,
    marketName: view.marketName,
    categories: view.categories,
    logoUrl: view.logoUrl,
    productCount: view.productCount,
    memberSince: view.memberSince,
    lastListedAt: view.lastListedAt,
    bioUr: view.bioUr,
    whatsappPublic: view.whatsappPublic,
    address: view.address,
  })
}

export function toResellerProductListItemDTO(item: CatalogueItem): ResellerProductListItem {
  const { product, myRetailPrice } = item
  return ResellerProductListItemDTO.parse({
    id: product.id,
    titleUr: product.titleUr,
    titleEn: product.titleEn,
    category: product.category,
    coverImageUrl: product.coverImageUrl,
    bajiPrice: product.bajiPrice,
    suggestedRetail: product.suggestedRetail,
    myRetailPrice,
    inStock: product.inStock,
    stockLeft: product.stockLeft,
    listedAt: product.listedAt,
    // Dukan ki SHANAKHT — rabta nahi. Dekhen RESELLER_PRODUCT_SELECT ka note.
    supplier: product.supplier,
  } satisfies ResellerProductListItem)
}

export function toResellerProductDetailDTO(item: CatalogueItem): ResellerProductDetail {
  const { product, myRetailPrice } = item
  return ResellerProductDetailDTO.parse({
    id: product.id,
    titleUr: product.titleUr,
    titleEn: product.titleEn,
    descriptionUr: product.descriptionUr,
    category: product.category,
    coverImageUrl: product.coverImageUrl,
    bajiPrice: product.bajiPrice,
    suggestedRetail: product.suggestedRetail,
    myRetailPrice,
    inStock: product.inStock,
    stockLeft: product.stockLeft,
    listedAt: product.listedAt,
    // Dukan ki SHANAKHT — rabta nahi. Dekhen RESELLER_PRODUCT_SELECT ka note.
    supplier: product.supplier,
    // Domain se readonly aati hain; DTO ki apni copy — spread wahi karta hai
    media: [...product.media],
    variants: [...product.variants],
  } satisfies ResellerProductDetail)
}

export function toStatusPackDTO(result: StatusPackResult): StatusPack {
  return StatusPackDTO.parse({
    id: result.pack.id,
    productId: result.pack.productId,
    templateKey: result.pack.templateKey,
    priceUsed: result.pack.priceUsed,
    status: result.status,
    imageUrl: result.pack.imageUrl,
    caption: result.caption,
    generatedAt: result.pack.generatedAt?.toISOString() ?? null,
  })
}

/** Kit — naap ki tafseel shared/pack-kit se aati hai, hard-code kahin nahi. */
export function toPackKitDTO(result: StatusPackKitResult, key: {
  productId: string
  mediaId?: string | undefined
  templateKey: string
  /** UI isay polling par wapas bhejta hai — warna purani kit ki halat parhi jati hai. */
  optionsKey: string
}): PackKit {
  return PackKitDTO.parse({
    productId: key.productId,
    mediaId: key.mediaId ?? null,
    templateKey: key.templateKey,
    optionsKey: key.optionsKey,
    priceUsed: result.priceUsed,
    assets: result.assets.map((asset) => ({
      format: asset.format,
      width: PACK_FORMATS[asset.format].width,
      height: PACK_FORMATS[asset.format].height,
      labelUr: PACK_FORMATS[asset.format].labelUr,
      labelEn: PACK_FORMATS[asset.format].labelEn,
      status: asset.status,
      imageUrl: asset.pack.imageUrl,
      packId: asset.pack.id,
    })),
    platforms: result.platforms.map((platform) => ({
      key: platform.key,
      labelUr: PACK_PLATFORMS[platform.key].labelUr,
      labelEn: PACK_PLATFORMS[platform.key].labelEn,
      formats: platform.formats,
      caption: result.captions[platform.key],
    })),
  })
}

/** 🔴 Phone aur payout account hamesha masked — shared phone rule. */
export function toResellerProfileDTO(reseller: ResellerView): ResellerProfile {
  return ResellerProfileDTO.parse({
    id: reseller.id,
    name: reseller.name,
    whatsappPhoneMasked: maskPhone(reseller.whatsappPhone),
    city: reseller.city,
    area: reseller.area,
    tier: reseller.tier,
    payoutAccountMasked: maskAccount(reseller.payoutAccount),
    joinedAt: reseller.createdAt.toISOString(),
  })
}

export function toResellerOrderDTO(order: ResellerOrderView): ResellerOrder {
  return ResellerOrderDTO.parse({
    id: order.id,
    orderNo: order.orderNo,
    status: order.status,
    statusUr: ORDER_STATUS_UR[order.status],
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    customerAddress: order.customerAddress,
    area: order.area,
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    myEarnings: order.myEarnings,
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    confirmedBy: order.confirmedBy,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      titleUr: item.titleUr,
      qty: item.qty,
      bajiPrice: item.bajiPrice,
      retailPrice: item.retailPrice,
    })),
  })
}

/** Product views ko bina reseller pricing ke DTO banane ke liye (detail page). */
export function withoutMyPrice(product: ResellerProductView): CatalogueItem {
  return { product, myRetailPrice: null }
}
