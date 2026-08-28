/**
 * Pack ke wo faislay jo reseller khud karti hai — zaban, aur kya kya tasveer par chhape.
 *
 * Ye sab ek jagah is liye hain ke ye sab ek hi cheez ka hissa hain: **is pack ki shanakht**.
 * Do pack jin ka template, price aur tasveer ek hi hai magar ek par number chhapa hai aur
 * doosre par nahi — wo DO alag tasveerein hain. Agar ye faislay cache key mein na hon to
 * doosri dafa reseller ko pehli wali (ghalat) tasveer milegi, aur usay kabhi samajh nahi
 * aayega ke us ka switch kaam kyun nahi kar raha.
 *
 * 🔴 Isi liye `packOptionsKey` mojood hai aur usi ka natija DB ke unique index mein jata hai.
 */

export type PackLang = 'ur' | 'en'

export interface PackOptions {
  /**
   * Pack ki zaban — reseller ke UI ki zaban se ALAG cheez.
   *
   * Roman likhne wali reseller bhi apne customers ko Urdu pack bhejti hai. Zaban ka
   * faisla us ke customers ka hai, us ka apna nahi — is liye ye alag switch hai.
   */
  readonly lang: PackLang
  readonly showName: boolean
  readonly showPhone: boolean
  /**
   * Qeemat chhupane ka matlab "rate inbox mein" wala tareeqa.
   *
   * Bohat si resellers jaan boojh kar rate status par nahi likhtin — taake customer
   * message kare aur baat shuru ho. Ye un ke liye hai.
   */
  readonly showPrice: boolean
  /** Khali = profile wala naam. Reseller yahan apna brand ka naam likh sakti hai. */
  readonly name?: string | undefined
  /** Khali = profile wala WhatsApp number. Dukan ka doosra number dene ke liye. */
  readonly phone?: string | undefined
  /**
   * Is pack ki apni ek line — "صرف آج", "آخری 2 پیس", "فری ڈیلیوری".
   *
   * 🔴 Ye template ke apne text layer se ALAG cheez hai, aur farq samajhna zaroori hai:
   * layer HAR pack par wohi rehti hai (wo template ka hissa hai), jabke ye line SIRF is
   * pack par hai. Reseller ka asal kaam yehi hai — aaj wali baat aaj ke pack par.
   *
   * Layer par ye likhna kaam nahi deta: kal wo "صرف آج" har naye pack par bhi chhapta
   * rehta, aur reseller ko yaad hi na rehta ke usay hatana hai.
   */
  readonly note?: string | undefined
  /**
   * Pack ke kinare par OyeBazar ka halka sa nishan.
   *
   * 🔴 Default ON hai, magar reseller ise band kar sakti hai — aur ye baat is feature ki
   * poori jaan hai. Ek reseller doosri reseller ko DEKH kar aati hai; ye sab se sasta
   * rasta hai naye log laane ka. Magar agar ye nishan us ke apne brand ko dabaye to wo
   * pack istemal hi nahi karegi — aur phir faida ulta ho jata hai, kyunke pack banta hi
   * nahi. Is liye nishan itna halka hai ke nazar us par ruke hi na, aur band karne ka
   * rasta khula hai.
   */
  readonly showMark?: boolean | undefined
  /**
   * Maal ki tafseel — size, rang, aur kitna bacha.
   *
   * 🔴 EK switch, teen cheezon ke liye. Alag alag rakhne ka matlab hota ke reseller
   * teen faisle kare — jabke ye teenon us ek sawal ka jawab hain jo customer rate ke
   * baad poochhti hai: "mera size mojood hai?"
   *
   * Default ON: jo baat tasveer par likhi ho, wo WhatsApp par poochhi hi nahi jati — aur
   * har na-poochha gaya sawal ek bacha hua sauda hai.
   */
  readonly showStock?: boolean | undefined
  /**
   * Purana rate — qeemat ke saath kata hua chhapta hai.
   *
   * 🔴 Ye RESELLER likhti hai, hum nahi banate. Hum ye jaante hi nahi ke us ne pehle
   * kya rate rakha tha — aur andaze se koi number kaat kar dikhana jhoot hai, jo us ki
   * apni sakh se jata hai.
   *
   * 🔴 Aur ye template ka alag khaana NAHI hai. Kata hua rate akela be-maani hota
   * hai; wo sirf asli rate ke SAATH kuch kehta hai. Is liye wo `.price-row` ke andar
   * rehta hai aur qeemat ke saath hi hilta hai — reseller usay alag ghaseet hi nahi
   * sakti, aur ye rukawat nahi, hifazat hai.
   */
  readonly wasPrice?: number | undefined
}

export const DEFAULT_PACK_OPTIONS: PackOptions = {
  lang: 'ur',
  showName: true,
  showPhone: true,
  showPrice: true,
}

/** Adhoore object ko poora karta hai — API aur DB dono se adhoora aa sakta hai. */
export function packOptionsFrom(partial?: Partial<PackOptions> | null): PackOptions {
  return {
    lang: partial?.lang === 'en' ? 'en' : 'ur',
    showName: partial?.showName ?? true,
    showPhone: partial?.showPhone ?? true,
    showPrice: partial?.showPrice ?? true,
    ...(partial?.name?.trim() ? { name: partial.name.trim() } : {}),
    ...(partial?.phone?.trim() ? { phone: partial.phone.trim() } : {}),
    ...(partial?.note?.trim() ? { note: partial.note.trim().slice(0, NOTE_MAX) } : {}),
    showMark: partial?.showMark ?? true,
    showStock: partial?.showStock ?? true,
    /*
     * Sirf mosbat aur poora hindsa. Sifar ya manfi "kata hua rate" ban hi nahi sakta,
     * aur ghalat qadar ko chup chaap girana us se behtar hai ke pack par "Rs 0" chhap
     * jaye.
     */
    ...(typeof partial?.wasPrice === 'number' &&
    Number.isFinite(partial.wasPrice) &&
    partial.wasPrice > 0
      ? { wasPrice: Math.round(partial.wasPrice) }
      : {}),
  }
}

/**
 * Is line ki hadd.
 *
 * 40 haroof — utne hi jitne template ke apne text layer par hain, aur wajah bhi wohi:
 * is se lambi line pack ke neeche wale hisse ko tor deti hai. Hadd yahan lagti hai (na
 * ke sirf UI par), kyunke ye qadar cache key mein jati hai aur API se bhi aa sakti hai.
 */
export const NOTE_MAX = 40

/**
 * Cache key ka wo hissa jo in faislon se banta hai.
 *
 * 🔴 Default par KHALI string — aur ye jaan boojh kar hai.
 *
 * Is se pehle se mojood har pack (jo default par bana tha) apni jagah qaim rehta hai:
 * na koi migration us ki key badalti hai, na wo dobara render hota hai. Roz ke ~10,000
 * pre-generated packs dobara banne ka matlab ek raat ka poora render budget zaya karna hai.
 *
 * Tarteeb tay-shuda hai (lang, name, phone, price) — object ki property order par
 * bharosa nahi kiya ja sakta, aur key badal jaye to poora cache mar jata hai.
 */
export function packOptionsKey(options: PackOptions): string {
  const parts: string[] = []

  if (options.lang !== 'ur') parts.push(`l:${options.lang}`)
  if (!options.showName) parts.push('n:0')
  if (!options.showPhone) parts.push('p:0')
  if (!options.showPrice) parts.push('r:0')
  // Marzi ka naam/number sirf tab jab wo dikh bhi raha ho — chhupe hue naam ka koi asar
  // tasveer par nahi, aur usay key mein daalna wohi tasveer do dafa bana deta hai
  if (options.showName && options.name) parts.push(`N:${options.name}`)
  if (options.showPhone && options.phone) parts.push(`P:${options.phone}`)
  /*
   * 🔴 Ye line cache key mein LAZMI hai. Do pack jin mein sirf ye line alag ho, wo do
   * alag tasveerein hain — aur is ke baghair reseller ko doosri dafa pehli wali (purani
   * line wali) tasveer milti, bina kisi wajah ke.
   */
  if (options.note) parts.push(`T:${options.note}`)
  /*
   * Sirf BAND hone par key mein — default (laga hua) par khali, taake purane pack apni
   * jagah qaim rahen. Dekhen upar wala note: ye poori file ka bunyadi usool hai.
   */
  if (options.showMark === false) parts.push('m:0')
  // Wohi usool: sirf BAND hone par key mein
  if (options.showStock === false) parts.push('s:0')
  /*
   * 🔴 Purana rate cache key mein LAZMI hai — wo tasveer par chhapta hai. Is ke baghair
   * reseller rate badal kar dobara banati aur usay purani tasveer wapas milti.
   */
  if (options.wasPrice) parts.push(`W:${options.wasPrice}`)

  return parts.join('|')
}
