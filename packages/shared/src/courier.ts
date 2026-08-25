/**
 * Courier aur tracking number.
 *
 * 🔴 Ye khaana pehle mojood hi nahi tha, aur us ki qeemat sirf reseller nahi de rahi thi
 * — hum bhi de rahe the.
 *
 * Order `DISPATCHED` se `DELIVERED` tak sirf ek button dabane se jata tha. Us ek button
 * par poora nizam khara hai: reseller ka payout wahin khulta hai, dukan ke sitare wahin
 * bunte hain, RTO ka hisab wahin, aur hamari apni fee bhi wahin (`FeeLedger.earnedAt`).
 * Yani hamari aamdani is baat par mauqoof thi ke dukan ka munshi button dabana yaad
 * rakhe — aur na dabane ka nuqsan us ka nahi, hamara tha.
 *
 * Tracking number wo pehla dhaga hai jis se ye baat kisi din khud-ba-khud ho sakti hai
 * (courier ke API se). Aaj bhi wo ek kaam foran karta hai: reseller apni customer ke sab
 * se aam sawal ka jawab de sakti hai — "mera parcel kahan hai?"
 */

/**
 * 🔴 `site` seedha tracking wala safha hai, number ke saath GHUSA hua link NAHI.
 *
 * Har courier ka apna query param hota hai (`?cn=`, `?tracking_number=`, POST-only
 * form, waghera) aur wo waqtan fawaqtan badalta rehta hai. Andaze se link banane ka
 * matlab hota ke reseller apni customer ko ek TOOTA hua link bhejti — aur toota hua
 * link "link hai hi nahi" se bura hai, kyunke us par bharosa kar ke bheja jata hai.
 *
 * Is liye abhi: number saamne, ek tap mein copy, aur courier ke safhe ka link. Jis din
 * kisi courier ka format jaanch liya jaye, us din us ek ke liye seedha link banaya ja
 * sakta hai — baqi waise hi chalte rahenge.
 */
export const COURIERS = [
  { slug: 'postex', name: 'PostEx', site: 'https://postex.pk/tracking' },
  { slug: 'tcs', name: 'TCS', site: 'https://www.tcsexpress.com/track/' },
  { slug: 'leopards', name: 'Leopards', site: 'https://leopardscourier.com/' },
  { slug: 'mp', name: 'M&P', site: 'https://mulphilog.com/' },
  { slug: 'trax', name: 'Trax', site: 'https://www.trax.pk/' },
  { slug: 'blueex', name: 'BlueEx', site: 'https://www.blue-ex.com/' },
  { slug: 'callcourier', name: 'CallCourier', site: 'https://callcourier.com.pk/' },
  { slug: 'other', name: 'Koi aur courier', site: null },

  /*
   * 🔴 "Apna rider" ka hona LAZMI hai, warna ye poora khaana jhoot ugalne lagta.
   *
   * Bohat si mandi ki dukanein apne bandey ke haath maal bhejti hain — un ke paas CN
   * number hota hi nahi. Agar hum har soorat mein number maangte to wo `1111` ya `-`
   * likh kar aage barh jate, aur phir har number par shak karna parta. Ek saaf jawab
   * "number hai hi nahi" us se kahin behtar hai.
   */
  { slug: 'self', name: 'Apna rider', site: null },
] as const

export type CourierSlug = (typeof COURIERS)[number]['slug']

/** Wahid courier jis par tracking number nahi maanga jata */
export const SELF_COURIER: CourierSlug = 'self'

export const COURIER_SLUGS = COURIERS.map((c) => c.slug) as readonly CourierSlug[]

export function isCourierSlug(value: string): value is CourierSlug {
  return (COURIER_SLUGS as readonly string[]).includes(value)
}

export function courierName(slug: string): string {
  return COURIERS.find((c) => c.slug === slug)?.name ?? slug
}

export function courierSite(slug: string): string | null {
  return COURIERS.find((c) => c.slug === slug)?.site ?? null
}

/**
 * CN number ki lambai ki hadd.
 *
 * Neeche wali hadd 5 hai: Pakistan ke har bare courier ka CN is se lamba hota hai, aur
 * is se chhoti cheez (jaise `1`, `-`, `ok`) number nahi, "kuch to likhna tha" hoti hai.
 */
export const TRACKING_MIN = 5
export const TRACKING_MAX = 40

/** Space aur dash hata kar — log CN ko `1234 5678` ya `1234-5678` likhte hain */
export function normaliseTracking(raw: string): string {
  return raw.replace(/[\s-]+/g, '').toUpperCase()
}
