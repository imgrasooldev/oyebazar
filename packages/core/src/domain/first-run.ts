/**
 * "Kya ye behen ne abhi tak KUCH kiya hai?" — dashboard ka pehla faisla.
 *
 * 🔴 Ye chhoti si shart yahan is liye aayi ke wo GHALAT thi, aur us ki ghalti ka koi
 * nishan nahi banta tha.
 *
 * Pehle wo `packsMade === 0` par khari thi. Magar `packsMade` wo ginti hai jo RAAT KA
 * JOB bharta hai: pre-generation har reseller ke liye har raat pack bana deti hai, chahe
 * us ne login bhi na kiya ho. Nateeja ye tha ke pehli raat ke baad har reseller ke paas
 * 40 pack hote the — yani ye shart hamesha `false` rehti thi, aur `FirstRun` ka poora
 * card kisi ko kabhi nazar hi nahi aaya.
 *
 * Live jaanch mein wohi dikha: ek reseller jis ke sifar order the, usay chaar sifar wale
 * card mile ("Rs 0 · 0 · 0 · 40 pack bane, 0 download") aur "shuru yahan se karen" wala
 * card kahin nahi tha. Us ke liye jo cheez likhi gayi thi, wo usay mili hi nahi.
 *
 * 🔴 Sabaq jo is se aage bhi chalta hai: **shart us cheez par lagayen jo BANDE ne ki
 * hai, us par nahi jo nizam ne us ke liye ki hai.** `packsMade` nizam ka kaam hai;
 * `packsDownloaded` us ka apna. Pack utha lena us ka pehla asli qadam hai, aur usay koi
 * background job nakli tor par nahi bhar sakta.
 */

export interface FirstRunSignals {
  /** Kitne pack us ne KHUD utha liye — nizam ke banaye hue nahi, us ke liye hue */
  readonly packsDownloaded: number
  readonly ordersRunning: number
  readonly ordersDelivered: number
  /** Us ki apni fehrist mein koi order — chahe kisi bhi halat mein */
  readonly ordersAny: number
}

/**
 * Bilkul nayi — abhi tak koi qadam nahi uthaya.
 *
 * Char sifar wale card ki jagah "shuru yahan se karen" wala card isi par khulta hai.
 *
 * 🔴 Har shart ka apna kaam hai aur koi bhi fazool nahi:
 *  · `packsDownloaded` — us ne pack utha liya? (pehla qadam)
 *  · `ordersRunning` / `ordersDelivered` / `ordersAny` — order kisi bhi shakl mein aaya?
 *
 * Order ki teen alag shartein is liye ke order us tak DOOSRE raste se bhi pohanch sakta
 * hai: customer public Bazaar se us ka link dekh kar bhi aa sakta hai, bina us ke koi
 * pack utha'e. Us soorat mein wo nayi nahi rahi — chahe us ne ek bhi pack chhoo'a na ho.
 */
export function isBrandNewReseller(signals: FirstRunSignals): boolean {
  return (
    signals.packsDownloaded === 0 &&
    signals.ordersRunning === 0 &&
    signals.ordersDelivered === 0 &&
    signals.ordersAny === 0
  )
}
