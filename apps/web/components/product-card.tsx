import Link from 'next/link'
import { formatPkr, type ResellerProductListItem } from '@oyebazar/shared'
import type { SupplierRating } from '@oyebazar/core'
import { LazyImage } from '@/components/lazy-image'
import { pickName, timeAgo, translator, type Locale } from '@/lib/i18n'

/**
 * Maal ka card — catalogue ki qatar mein aur dukan ke apne safhe par, EK hi.
 *
 * 🔴 Ye component is liye bana ke wohi card ab DO safhon par chahiye tha, aur usay
 * dobara likhna sab se aasan aur sab se mehnga rasta hota.
 *
 * Catalogue ke safhe par is ke bare mein ek note likha tha: "maal yahan dobara nahi
 * dikhaya jata, warna card TEESRI dafa likha jayega". Aitraaz bilkul durust tha — magar
 * us ka hal maal chhupa dena nahi tha. Naqal ka anjaam maloom hai: kal card ki oonchai,
 * rate ka hisaab, ya munafe ka rang ek jagah badalta aur doosri jagah purana reh jata,
 * aur wo farq mahino baad kisi ko nazar aata.
 *
 * Ab ek hi jagah badalne se dono safhe badalte hain.
 */

/**
 * Is se kam maal bache to card par ginti aati hai.
 *
 * 5 is liye ke ek reseller ka ek status aam tor par is se zyada order nahi laata — yani
 * is hadd se neeche wo waqai "mana karna par sakta hai" wale ilaqe mein hai.
 */
const LOW_STOCK = 5
export function ProductCard({
  item,
  locale,
  rating,
  now,
  listView = false,
  showSupplier = true,
}: {
  item: ResellerProductListItem
  locale: Locale
  /** Dukan ke sitare — na hon to kuch nahi dikhta */
  rating: SupplierRating | undefined
  /** Ek hi "abhi" poori list ke liye — har card apna waqt na nikale */
  now: Date
  listView?: boolean
  /**
   * Dukan ka naam dikhana ya nahi.
   *
   * 🔴 Us dukan ke APNE safhe par wo naam har card par dobara likhna shor hai — bees
   * card, bees dafa wohi naam, aur reseller ko wahan wo cheez chahiye jo har maal mein
   * ALAG hai (rate aur munafa). Jo baat safhe ke sar-name se pehle hi maloom ho, usay
   * dobara likhna nazar ka waqt khata hai.
   */
  showSupplier?: boolean
}) {
  const t = translator(locale)


      const title = locale === 'ur' ? item.titleUr : item.titleEn
      const myPrice = item.myRetailPrice ?? item.suggestedRetail
      const profit = Math.max(myPrice - item.bajiPrice, 0)

      /*
        Qatar wali shakl — ek maal, ek poori line.
        Yahan tasveer chhoti hai aur numbers ek hi line par: lagat, rate, munafa.
        Grid mein aankh ko har card par neeche utarna parta hai; moqable ke waqt
        wo teen guna kaam hai.
      */
      if (listView) {
        return (
          <li key={item.id} className="card flex flex-wrap items-center gap-3 p-2.5">
            <Link
              href={`/catalogue/${item.id}`}
              className="tile-media-wrap h-16 w-16 shrink-0 rounded-card bg-paper-sunken"
            >
              {item.coverImageUrl && (
                <LazyImage
                  src={item.coverImageUrl}
                  alt={title}
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover"
                />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link href={`/catalogue/${item.id}`} className="block">
                <p className="truncate text-[0.92rem] font-semibold">{title}</p>
              </Link>
              <p className="mt-0.5 text-[0.74rem] text-ink-faint">
                {pickName(locale, item.category)}
                <span className="mx-1.5">·</span>
                {timeAgo(locale, item.listedAt, now)}
                {!item.inStock && (
                  <span className="ms-2 rounded-pill bg-coal-900/85 px-2 py-0.5 text-white">
                    {t('outOfStock')}
                  </span>
                )}
                {/*
                  Bacha hua maal SIRF tab jab wo kam ho.
                  Har card par "47 bache hain" likhna khabar nahi, shor hai — aur
                  us shor mein wo "3 bache hain" bhi doob jata hai jo asal khabar
                  hai. Hadd wohi jahan reseller ka faisla waqai badalta hai.
                */}
                {item.inStock && item.stockLeft > 0 && item.stockLeft <= LOW_STOCK && (
                  <span className="ms-2 rounded-pill bg-red-50 px-2 py-0.5 font-semibold text-red-700">
                    <span dir="ltr" className="numeric">
                      {item.stockLeft}
                    </span>{' '}
                    {t('onlyLeft')}
                  </span>
                )}
              </p>
            </div>

            <div className="text-end">
              <p className="text-[0.72rem] text-ink-faint">
                {t('yourCost')}{' '}
                <span dir="ltr" className="numeric">
                  {formatPkr(item.bajiPrice)}
                </span>
              </p>
              <p dir="ltr" className="numeric text-[1.05rem] font-bold">
                {formatPkr(myPrice)}
              </p>
            </div>

            {/* Qatar mein bhi wahi wazan — chhoti goli baqi numbers mein gum ho jati thi */}
            <span className="inline-flex items-baseline gap-1.5 rounded-card bg-accent-50 px-3 py-1.5 text-accent-700">
              <span className="text-[0.75rem] font-semibold uppercase tracking-wide text-accent-700/80">
                {t('yourProfit')}
              </span>
              <span dir="ltr" className="numeric text-[1rem] font-bold">
                +{formatPkr(profit)}
              </span>
            </span>

            <Link
              href={`/catalogue/${item.id}`}
              className="btn-primary !px-4 !py-2 !text-[0.8rem]"
            >
              {t('makePackShort')}
            </Link>
          </li>
        )
      }

      return (
        <li key={item.id} className="tile group flex flex-col">
          <Link href={`/catalogue/${item.id}`} className="block">
            <div className="relative aspect-square overflow-hidden bg-paper-sunken">
              {item.coverImageUrl && (
                <LazyImage
                  src={item.coverImageUrl}
                  alt={title}
                  wrapperClassName="h-full w-full"
                  className="tile-media h-full"
                />
              )}

              {/*
                Waqt aur "sirf itne bache" — tasveer ke KONE par, apni qatar mein
                nahi.

                🔴 Ye ek qatar 22px leti thi (18px likhai + 4px faasla), aur card
                pehle hi 456px ka tha. Tasveer ke neeche ka kona waise bhi khali
                rehta hai — wahan rakh dene se wohi maloomat milti hai aur oonchai
                ka kuch bhi kharch nahi hota.

                Halka kaala parda is liye ke tasveer chamakdaar bhi ho sakti hai
                aur safed likhai us par gum ho jati hai.
              */}
              <p className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/55 to-transparent px-2 pb-1.5 pt-4 text-[0.68rem] text-white/85">
                {timeAgo(locale, item.listedAt, now)}
                {item.inStock && item.stockLeft > 0 && item.stockLeft <= LOW_STOCK && (
                  <span className="font-semibold text-red-300">
                    ·{' '}
                    <span dir="ltr" className="numeric">
                      {item.stockLeft}
                    </span>{' '}
                    {t('onlyLeft')}
                  </span>
                )}
              </p>
              {!item.inStock && (
                <span className="badge absolute start-2 top-2 bg-coal-900/85 text-white">
                  {t('outOfStock')}
                </span>
              )}
            </div>
          </Link>

          {/*
            Card ab kasa hua hai: pehle har card poore screen ka bara hissa kha
            jata tha aur ek nazar mein chaar hi maal dikhte the. Reseller yahan
            scroll kar ke chunti hai — zyada maal ek saath dikhna hi kaam ka hai.

            Lagat halke rang mein, rate gehra, aur munafa usi qatar mein sabz —
            teen alag lines teen guna jagah leti thin, jabke faisla ek number par
            hota hai.
          */}
          <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
            <p className="line-clamp-2 text-[0.85rem] font-semibold leading-snug">
              {title}
            </p>

            {/*
              🔴 Teen number, teen alag qatarein — ek hi line mein thay aur 214px
              ke card mein "Your cost Rs…" kat jata tha aur rate do lines mein
              toot jata ("Rs" upar, "1,350" neeche). Ab har number apni qatar
              mein hai aur kisi ko tootna nahi parta.

              Mashwara (hamara tajweez kardah rate) bhi yahin: reseller ko lagat
              aur mashwara dono saath chahiyen, warna wo apna rate andaze se
              lagati hai.
            */}
            {/*
              Dukan ka naam aur us ke sitare — RATE se pehle.

              🔴 Tarteeb jaan boojh kar hai. Reseller pehle ye dekhti hai ke maal
              KIS KA hai, phir rate. Ulta rakhne ka matlab hota ke wo rate par
              faisla kar chuki hoti aur dukan ka naam ek baad ki tafseel ban jata
              — jabke us ka customer aur us ki sakh usi dukan par khari hai.

              Sitare na hon to ginti bhi nahi likhte: "0 raye" us dukan par ek
              khali khaana chhaap deta hai jo bure number jaisa dikhta hai.
            */}
            {/*
              🔴 Dukan ka naam ab DABNE wala hai — pehle wo sirf likha hua tha.

              Yehi wo jagah hai jahan reseller ka agla sawal uthta hai: "ye dukan
              kaun hai?" Naam dikha kar us sawal ka koi jawab na dena us se bura
              hai ke naam dikhaya hi na jata — banda dabata hai, kuch nahi hota,
              aur wo samajhta hai ke safha toota hua hai.

              Sitare is ka sabab aur bhi barha dete hain: "★ 4.2" dekh kar pehla
              khayal hi ye aata hai ke ye number kis cheez ka hai — aur us ka
              jawab dukan ke apne safhe par hai.

              🔴 Ye upar wale `Link` ke BAHAR hai (wo sirf tasveer par lipta hua
              hai), warna link ke andar link banta — jo HTML mein jaiz hi nahi
              aur browser mein ajeeb chalta hai.
            */}
            {showSupplier && (
            <Link
              href={`/wholesalers/${item.supplier.slug}`}
              className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[0.7rem] text-ink-faint transition hover:text-brand-700"
            >
              <span className="min-w-0 truncate underline decoration-dotted underline-offset-2">
                {item.supplier.businessName}
              </span>
              {rating?.stars ? (
                <span className="shrink-0 whitespace-nowrap font-semibold text-accent-700">
                  ★ <span dir="ltr" className="numeric">{rating.stars}</span>
                </span>
              ) : null}
            </Link>
            )}

            <dl className="mt-2 space-y-0.5 text-[0.75rem] leading-tight">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="shrink-0 text-ink-faint">{t('yourCost')}</dt>
                <dd dir="ltr" className="numeric whitespace-nowrap text-ink-soft">
                  {formatPkr(item.bajiPrice)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="shrink-0 text-ink-faint">{t('suggested')}</dt>
                <dd dir="ltr" className="numeric whitespace-nowrap text-ink-soft">
                  {formatPkr(item.suggestedRetail)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 pt-0.5">
                <dt className="shrink-0 text-[0.72rem] font-semibold text-ink">
                  {t('yourPriceShort')}
                </dt>
                <dd
                  dir="ltr"
                  className="numeric whitespace-nowrap text-[0.95rem] font-bold"
                >
                  {formatPkr(myPrice)}
                </dd>
              </div>
            </dl>

            {/*
              Munafa aur button ek hi qatar mein thay — 214px ke card mein dono
              samate nahi the aur button ke lafz toot jate the. Ab munafa apni
              line mein (chhota, sabz) aur button poori chaurai par: ek nazar
              mein saaf, aur ungli ke liye bara nishana.
            */}
            <div className="mt-auto pt-2">
              {/*
                Munafa — card ka sab se numaya number.
                Pehle ye ek chhoti si goli thi aur "+Rs 350" par lafz bhi nahi
                tha. Reseller ke liye YEHI faisla hai (baqi do number us tak
                pohanchne ka rasta hain), is liye ab poori chaurai par apna
                khaana, bara hindsa aur sabz zameen.
              */}
              <div className="rounded-card bg-accent-50 px-3 py-1.5">
                {/*
                  Lafz upar, hindsa neeche — saath rakhte to 180px ke card mein
                  dono toot jate the ("YOUR / PROFIT" aur "+Rs / 350"). Tootа hua
                  number parhne mein sab se buri cheez hai.
                */}
                <span className="block text-[0.75rem] font-semibold text-accent-700/70">
                  {t('yourProfit')}
                </span>
                <span
                  dir="ltr"
                  className="numeric mt-0.5 block whitespace-nowrap text-[1.1rem] font-bold leading-none text-accent-700"
                >
                  +{formatPkr(profit)}
                </span>
              </div>

              <Link
                href={`/catalogue/${item.id}`}
                className="btn-primary mt-2 w-full !px-2 !py-1.5 !text-[0.78rem]"
              >
                {t('makePackShort')}
              </Link>
            </div>
          </div>
        </li>
      )
}
