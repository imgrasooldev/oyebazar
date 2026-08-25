/**
 * "Apna pata khud likhein" — link jo reseller apni customer ko WhatsApp par bhejti hai.
 *
 * 🔴 Ye sahulat ka feature nahi, RTO ka hai.
 *
 * Ab tak raasta ye tha: customer WhatsApp par "haan chahiye" likhti, aur reseller us ki
 * baat parh kar naam, number aur pata KHUD type karti. Funnel ka sab se nazuk qadam —
 * aur poori tarah haath par. Har ghalat harf ek wapas aane wala parcel hai; wapsi ka
 * dono taraf ka kiraya dukan bharti hai, aur sakh reseller ki jati hai.
 *
 * Aur ek cheez jo pehle mumkin hi nahi thi: customer ka apna GPS pin. Order wale form
 * mein sirf "MERI abhi ki location" ka button hai — jo theek likha hai, magar jab
 * customer WhatsApp par apni location bhejti thi, usay daalne ka koi khaana hi nahi
 * tha. Wo pin `Order.locationLat` ka asal maqsad hai ("RTO ka sab se bara lever"), aur
 * ab wo customer ke apne phone se ek tap mein aata hai.
 */
import { NotFoundError, ValidationError } from '@oyebazar/shared'
import type { Clock, TokenGenerator } from '../ports/infrastructure'
import type {
  AddressRequestRepository,
  FilledAddressRequestView,
  PublicAddressRequestView,
} from '../ports/address-request-repositories'

/**
 * Link kitne din chalta hai.
 *
 * 🔴 Hadd ka hona lazmi hai. Purana link customer ke phone par pada reh jata hai, aur
 * bina hadd ke wo mahino baad khul kar us qeemat par order bana deta jo ab mojood hi
 * nahi — ya us maal ka jo ab bikta hi nahi. Saat din is liye ke WhatsApp par baat aksar
 * usi din ya agle din mukammal hoti hai; jo us se aage jaye wo aksar mukammal hoti hi
 * nahi.
 */
export const ADDRESS_LINK_DAYS = 7

export class AddressRequestService {
  constructor(
    private readonly requests: AddressRequestRepository,
    private readonly tokens: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  /** Reseller link banati hai — maal, tadaad aur us ka apna retail rate saath. */
  async open(input: {
    resellerId: string
    productId: string
    variantId?: string | undefined
    qty: number
    retailPrice: number
  }): Promise<{ token: string; expiresAt: Date }> {
    if (input.qty < 1) throw new ValidationError('Tadaad kam se kam ek')
    if (input.retailPrice <= 0) throw new ValidationError('Rate likhen')

    const token = this.tokens.randomToken(32)
    const expiresAt = new Date(
      this.clock.now().getTime() + ADDRESS_LINK_DAYS * 24 * 60 * 60 * 1000,
    )

    await this.requests.create({
      token,
      resellerId: input.resellerId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      qty: input.qty,
      retailPrice: input.retailPrice,
      expiresAt,
    })

    return { token, expiresAt }
  }

  /** Public safha — token hi chabi hai, koi login nahi. */
  async forCustomer(token: string): Promise<PublicAddressRequestView> {
    const view = await this.requests.findPublicByToken(token)
    if (!view) throw new NotFoundError('Link')
    return view
  }

  /**
   * Customer apna pata bhejti hai.
   *
   * 🔴 Miyaad aur "pehle se bhara hua" — dono yahan rukte hain, aur dono ki wajah alag
   * hai. Miyaad us qeemat se bachati hai jo ab mojood nahi. "Pehle se bhara hua" is se
   * bachata hai ke link aage forward ho jane par doosra shakhs pehle wale ka pata apne
   * pate se dabaa de — jis ka natija ye hota ke parcel bilkul ghalat jagah jata aur kisi
   * ko wajah samajh na aati.
   */
  async fill(
    token: string,
    input: {
      customerName: string
      customerPhone: string
      customerAddress: string
      area: string
      locationLat?: number | undefined
      locationLng?: number | undefined
    },
  ): Promise<void> {
    const view = await this.requests.findPublicByToken(token)
    if (!view) throw new NotFoundError('Link')

    if (view.usedAt) throw new ValidationError('Is link par order ban chuka hai')
    if (view.filledAt) throw new ValidationError('Pata pehle hi bhej diya gaya hai')
    if (view.expiresAt.getTime() < this.clock.now().getTime()) {
      throw new ValidationError('Ye link purana ho chuka — dukandar se naya mangwayen')
    }

    /*
     * Dono milen ya koi bhi nahi.
     *
     * Ek akela `lat` be-maani hai, magar us se bura ye hai ke wo khaana "bhara hua"
     * lagta hai — aur courier ka banda us par bharosa kar ke ghalat jagah pohanchta hai.
     */
    const hasPin = input.locationLat !== undefined && input.locationLng !== undefined

    const wrote = await this.requests.fill(token, {
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerAddress: input.customerAddress,
      area: input.area,
      locationLat: hasPin ? (input.locationLat as number) : null,
      locationLng: hasPin ? (input.locationLng as number) : null,
      at: this.clock.now(),
    })

    // DB ne mana kar diya — yani doosra shakhs ek lamha pehle bhar chuka tha
    if (!wrote) throw new ValidationError('Pata pehle hi bhej diya gaya hai')
  }

  /** Reseller ke wo pate jin ka order abhi nahi bana */
  listWaiting(resellerId: string, limit = 10): Promise<FilledAddressRequestView[]> {
    return this.requests.listFilledFor(resellerId, limit)
  }

  /** Order banane se pehle — 🔴 sirf apna, doosri reseller ka nahi. */
  async takeForOrder(resellerId: string, token: string): Promise<FilledAddressRequestView> {
    const view = await this.requests.findFilledForReseller(resellerId, token)
    if (!view) throw new NotFoundError('Link')
    return view
  }

  /**
   * Order ban gaya — link band.
   *
   * 🔴 `false` ghalti NAHI hai, aur usay ghalti banana ghalat hoga. Order banana
   * idempotent hai (wohi key dobara bhejne par wohi order milta hai), is liye ek retry
   * par ye `false` dega — kyunke link pehli koshish mein band ho chuka tha. Us par
   * error phenkna ek KAMYAB order ko nakaam dikhana hoga.
   *
   * `false` do soorton mein aata hai: pehle hi band tha, ya link is reseller ka hai hi
   * nahi. Dono mein aage kuch nahi karna.
   */
  close(resellerId: string, token: string, orderId: string): Promise<boolean> {
    return this.requests.markUsed(resellerId, token, orderId, this.clock.now())
  }
}
