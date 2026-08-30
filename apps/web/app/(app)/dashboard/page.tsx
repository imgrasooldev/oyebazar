import Link from 'next/link'
import { LazyImage } from '@/components/lazy-image'
import { FirstRun } from '@/components/first-run'
import type { Metadata } from 'next'
import { formatPkr, whatsappLink } from '@oyebazar/shared'
import { MiniBars, StatTile, Widget } from '@/components/dash-kit'
import { BoxesIcon, GridIcon, ListIcon, MoneyIcon, SparkIcon, WhatsAppIcon } from '@/components/icons'
import { ResellerPayoutReply } from '@/components/payout-actions'
import { toResellerOrderDTO } from '@/lib/api/mappers'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { reviewPeriod } from '@oyebazar/core'
import { SupplierReviewForm } from '@/components/supplier-review-form'
import { orderStatusLabel, pickTitle, translator, type Locale } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'
import { orderStatusStyle } from '@/lib/order-status-style'

export const metadata: Metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

/** Chaal kitne dinon ki — do hafte, dono dashboard par ek jaisa. */
const TREND_DAYS = 14

/**
 * Reseller ka dashboard — login ke baad pehli screen.
 *
 * Pehle login ke baad seedha catalogue khulta tha: maal hi maal, aur ye kahin nahi
 * likha tha ke "aap ne kitna kamaya" ya "kis order par aap atki hui hain". Reseller ke
 * liye ye do sawal maal se pehle aate hain.
 *
 * Tarteeb: pehle wo kaam jo RUKA hua hai (tasdeeq), phir kamai, phir aaj ka maal.
 * Jo cheez ruki ho wohi sab se upar aur garam rang mein — baqi khamosh.
 */
export default async function ResellerDashboard() {
  const { reseller } = await requireReseller()
  const locale = await getLocale()
  const t = translator(locale)

  /*
   * "Aaj kya lagaun" — reseller ka rozana ka asal sawal.
   *
   * 🔴 Ye us ke APNE order ka hisaab NAHI hai. Us ka apna hisaab wo pehle se jaanti hai;
   * jo wo nahi jaanti wo ye hai ke BAQI sab kya bech rahi hain. Aur nayi reseller ke
   * paas apna koi hisaab hota hi nahi — usi ko is ki sab se ziyada zaroorat hai.
   *
   * Saat din: is se kam par ek din ka ittefaq poori list badal deta hai, is se ziyada par
   * "abhi chal raha hai" ka matlab khatam ho jata hai.
   */
  const trendingSince = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    stats,
    ordersPage,
    payouts,
    payoutTotals,
    risk,
    trending,
    pendingReview,
    waitingPata,
    repeatCustomers,
  ] = await Promise.all([
    container.repositories.resellerStats.summary(reseller.id, new Date()),
    container.orders.listForReseller(reseller.id, { limit: 5 }),
    container.payouts.listForReseller(reseller.id),
    container.payouts.totalsForReseller(reseller.id),
    /*
     * 🔴 Us ka apna wapsi ka record — wohi ginti jo DUKAN ko dikhti hai jab wo us ka
     * order qubool karne ka faisla kar rahi hoti hai (dekhen ResellerRtoRecord).
     *
     * Ye insaaf ka masla hai: jis number par us ke bare mein faisla hota hai, wo number
     * usay bhi nazar aana chahiye — warna order kam hone lagen to usay wajah hi pata
     * nahi chalti, aur wo cheez badal bhi nahi sakti jo usay dikhti hi nahi.
     */
    container.payouts.resellerRisk([reseller.id]),
    container.repositories.resellerStats.topSelling(trendingSince, 6),
    /*
     * Kis dukan ki raye baqi hai — aur ye SAB SE OOPAR aati hai.
     *
     * 🔴 Form banana aasan hai; log us tak pohanchte nahi. Alag safha banane ka matlab
     * hota ke raye sirf un se aaye jo usay DHOONDH len — aur wo aksar naraz log hote
     * hain, jis se poora record ek taraf jhuk jata hai. Yahan wo us jagah hai jahan
     * reseller pehle se roz aati hai.
     */
    container.repositories.supplierReviews.pendingFor(reseller.id, reviewPeriod(new Date())),
    /*
     * Wo pate jo customer khud bhej chuki hai aur jin ka order abhi nahi bana.
     *
     * 🔴 Ye dashboard par is liye hai ke reseller ko KHABAR hi nahi hoti. Link us ne
     * WhatsApp par bheja tha; customer ne wahan jawab nahi diya, safhe par pata likh
     * diya — yani reseller ka phone chup raha. Bina is khaane ke wo pata yahan pada
     * rehta aur customer intezar karti rehti ke parcel kab aayega.
     */
    container.addressRequests.listWaiting(reseller.id, 5),
    /*
     * Wo customer jo DOBARA aaye.
     *
     * 🔴 Ye dashboard par hai, kisi alag safhe par nahi — aur nav mein bhi nahi.
     * Nav mein pehle se saat khaane hain aur aathwan phone ki patti par thoosne se
     * baqi saat bhi chhote ho jate. Magar asal wajah us se behtar hai: ye fehrist koi
     * KHOLNE nahi jata. Wo sawal jo ye jawab deti hai ("kaun wapas aaya") banda tab tak
     * poochhta hi nahi jab tak jawab us ke saamne na ho.
     */
    container.repositories.customers.topRepeat(reseller.id, 6),
  ])
  const myRecord = risk[0]



  const orders = ordersPage.items.map(toResellerOrderDTO)

  /*
   * Bilkul nayi reseller — abhi tak ek bhi pack nahi banaya aur ek bhi order nahi.
   *
   * 🔴 Aise mein ginti wale chaar card (`Rs 0`, `0`, `0`, `0`) dikhana nuqsan deta
   * hai: wo kuch batate nahi, aur pehle din ka pehla tassur ye chhorte hain ke "yahan
   * kuch hai hi nahi". Un ki jagah wo EK cheez honi chahiye jo usay karni hai.
   */
  const bilkulNayi = stats.packsMade === 0 && stats.ordersRunning === 0 &&
    stats.ordersDelivered === 0 && orders.length === 0

  /*
   * Kamai ki chaal — do hafte.
   *
   * Ginti PAYOUT ki qataron se banti hai, orders se nahi: payout usi din khulta hai jis
   * din maal pohanchta hai, aur "kamai" ka asal matlab wohi hai. Order ki tareekh se
   * ginte to raste mein khare order bhi kamai mein shumar ho jate — aur wo abhi kamai
   * hai hi nahi.
   *
   * Din sthaniya (local) waqt par bante hain — reseller apna din dekhti hai, UTC ka nahi.
   */
  const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`

  const perDay = new Map<string, number>()
  for (const payout of payouts) {
    const key = dayKey(new Date(payout.createdAt))
    perDay.set(key, (perDay.get(key) ?? 0) + payout.amount)
  }

  const points = Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (TREND_DAYS - 1 - index))
    return {
      label: `${date.getDate()}/${date.getMonth() + 1}`,
      value: perDay.get(dayKey(date)) ?? 0,
    }
  })
  const inTrend = points.reduce((sum, point) => sum + point.value, 0)
  const pending = orders.filter((order) => order.status === 'PENDING_CONFIRM')
  const openPayouts = payouts.filter((payout) => payout.status !== 'SETTLED')

  return (
    <div className="space-y-8">
      {/* Dukan ki raye — safhe par SAB SE OOPAR, kyunke wohi ek cheez hai jo bhoolti hai */}
      {/*
        Customer ne apna pata bhej diya — sab se pehla kaam.

        🔴 Ye raye wale form se bhi UPAR hai. Wo form ek purane order ke bare mein hai
        (kaam ho chuka); ye ek order hai jo abhi BANA hi nahi aur jis ke doosri taraf koi
        intezar kar raha hai. Jis kaam par kisi ka intezar laga ho, wo pehle aata hai.
      */}
      {waitingPata.length > 0 && (
        <section className="rounded-card bg-accent-50 p-4 ring-1 ring-accent-600/40">
          <p className="text-[0.95rem] font-bold text-accent-700">{t('pataWaitingTitle')}</p>
          <ul className="mt-3 space-y-2">
            {waitingPata.map((pata) => (
              <li key={pata.token}>
                <Link
                  href={`/orders/new/${pata.productId}?pata=${pata.token}`}
                  className="flex items-center gap-3 rounded-card bg-paper-raised p-2.5 shadow-soft transition hover:shadow-lift"
                >
                  <span className="h-11 w-11 shrink-0 overflow-hidden rounded-card bg-paper-sunken">
                    {pata.imageUrl && (
                      <LazyImage
                        src={pata.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9rem] font-semibold">
                      {pata.customerName}
                    </span>
                    <span className="block truncate text-[0.78rem] text-ink-faint">
                      {pickTitle(locale, { titleUr: pata.productTitleUr, titleEn: pata.productTitleEn })} ·{' '}
                      {pata.area}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.78rem] font-semibold text-accent-700">
                    {t('pataWaitingHint')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pendingReview && (
        <div className="mb-6">
          <SupplierReviewForm
            orderId={pendingReview.orderId}
            supplierName={pendingReview.supplierName}
            orderNo={pendingReview.orderNo}
            reason={pendingReview.reason}
            labels={{
              titleFirst: t('reviewTitleFirst'),
              titleMonthly: t('reviewTitleMonthly'),
              hint: t('reviewHint'),
              quality: t('reviewQuality'),
              communication: t('reviewCommunication'),
              payoutOnTime: t('reviewPayout'),
              commentPlaceholder: t('reviewComment'),
              submit: t('reviewSubmit'),
              thanks: t('reviewThanks'),
              failed: t('threadFailed'),
              skip: t('reviewSkip'),
            }}
          />
        </div>
      )}

      <div>
        <h1 className="text-[1.35rem] font-bold tracking-tight">
          {t('hello')} {reseller.name}
        </h1>
        <p className="mt-1 text-[0.92rem] text-ink-soft">{t('dashboardBody')}</p>
      </div>

      {/* Ruka hua kaam — sirf tab dikhta hai jab waqai kuch ruka ho */}
      {pending.length > 0 && (
        <section className="card overflow-hidden ring-1 ring-brand-200">
          <div className="bg-brand-50 px-5 py-4">
            <p className="font-bold text-brand-800">
              {t('awaitingConfirmation')} ({pending.length})
            </p>
            <p className="mt-1 text-[0.88rem] text-brand-800/80">
              {t('awaitingConfirmationBody')}
            </p>
          </div>

          <ul className="divide-y divide-black/[0.05]">
            {pending.map((order) => (
              <li key={order.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span>
                  <span dir="ltr" className="numeric text-sm font-bold text-ink-faint">
                    {order.orderNo}
                  </span>
                  <span className="ms-2 text-[0.9rem]">{order.customerName}</span>
                </span>
                <Link href="/orders" className="link-tap text-sm font-semibold text-brand-700">
                  {t('confirm')}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Kamai — reseller ka asal sawal.

        Ye khana kaala hai aur baqi safed: is safhe par sab se bara sawal yehi hai, aur
        ek nazar mein pata chalna chahiye ke wo kahan likha hai.
      */}
      {/*
        Nayi reseller ko pehla qadam — ginti ke card ki JAGAH, un ke saath nahi.

        🔴 Dono ek saath dikhane ka matlab hota ke wo pehle chaar sifar parhti, phir
        neeche jaa kar samajhti ke karna kya hai. Pehla tassur wo chaar sifar hi bante,
        aur wohi yaad rehta.
      */}
      {bilkulNayi && (
        <FirstRun
          labels={{
            title: t('firstRunTitle'),
            body: t('firstRunBody'),
            step1: t('firstRunStep1'),
            step2: t('firstRunStep2'),
            step3: t('firstRunStep3'),
            step3Why: t('firstRunStep3Why'),
            cta: t('firstRunCta'),
          }}
        />
      )}

      {!bilkulNayi && (
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Tarteeb StatTile jaisi — nishan aur naam ek qatar mein; wajah wahin likhi hai */}
        <div className="card bg-coal-900 p-4 text-white">
          <div className="flex items-center gap-2">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-card bg-white/10 text-brand-300"
              aria-hidden="true"
            >
              <MoneyIcon className="h-5 w-5" />
            </span>
            <p className="min-w-0 truncate text-[0.72rem] font-semibold uppercase tracking-wider text-white/50">
              {t('earnedThisMonth')}
            </p>
          </div>
          <p dir="ltr" className="numeric mt-2 text-[1.5rem] font-bold leading-none text-brand-300">
            {formatPkr(stats.earnedThisMonth)}
          </p>
          <p className="mt-1 text-[0.76rem] text-white/45">
            {t('earnedTotal')} <span dir="ltr">{formatPkr(stats.earnedTotal)}</span>
          </p>
        </div>

        <StatTile
          icon={<ListIcon className="h-5 w-5" />}
          label={t('ordersRunning')}
          value={String(stats.ordersRunning)}
          hint={t('ordersRunningHint')}
          href="/orders"
        />
        <StatTile
          icon={<BoxesIcon className="h-5 w-5" />}
          label={t('ordersDelivered')}
          value={String(stats.ordersDelivered)}
          tone="accent"
          href="/orders"
        />
        {/*
          Pack banaye aur pack utaare — do alag ginti, aur farq hi asal khabar hai:
          jo pack ban kar utara hi nahi gaya wo kabhi kisi status par nahi laga.
        */}
        {/*
          Wapsi ka record — sirf tab jab kuch MUKAMMAL ho chuka ho.
          Naye bandey ko "0%" dikhana jhoota tasalli hai: abhi kuch sabit hi nahi hua.
        */}
        {myRecord && myRecord.delivered + myRecord.rto > 0 ? (
          <StatTile
            icon={<ListIcon className="h-5 w-5" />}
            label={t('myReturnsLabel')}
            value={`${myRecord.rtoRate ?? 0}%`}
            hint={`${myRecord.rto}/${myRecord.delivered + myRecord.rto} · ${t('returnsHint')}`}
            tone={(myRecord.rtoRate ?? 0) >= 20 ? 'danger' : 'plain'}
            {...(myRecord.rtoRate !== null ? { progress: myRecord.rtoRate } : {})}
          />
        ) : (
        <StatTile
          icon={<SparkIcon className="h-5 w-5" />}
          label={t('packsMade')}
          value={String(stats.packsMade)}
          hint={`${stats.packsDownloaded} ${t('packsDownloaded')}`}
          {...(stats.packsMade > 0
            ? { progress: Math.round((stats.packsDownloaded / stats.packsMade) * 100) }
            : {})}
          href="/catalogue"
        />
        )}
      </section>
      )}

      {/*
        "Is hafte kya chal raha hai" — reseller ka rozana ka asal sawal.

        🔴 Ye us ki APNI ginti nahi hai, aur wohi is ki poori wajah hai. Apna hisaab wo
        khud jaanti hai; jo wo nahi jaanti wo ye hai ke baqi sab kya bech rahi hain. Nayi
        reseller ke paas to apna koi hisaab hota hi nahi.

        "Kitni reseller ne becha" dikhaya ja raha hai, order ki ginti nahi — do reseller
        ka becha hua maal ek reseller ke pandrah order se ziyada maani rakhta hai, kyunke
        wo ye batata hai ke maal chal raha hai, koi ek achhi customer nahi.
      */}
      {/*
        Wo customer jo DOBARA aaye.

        🔴 Ye trending se PEHLE hai, aur ye tarteeb soch kar hai. Trending ka
        jawab hai "kya bik raha hai" — wo har reseller ke liye ek jaisa hai aur kisi
        bhi din liya ja sakta hai. Ye fehrist SIRF is ke apne kaam se bani hai, aur wo
        cheez batati hai jo kahin aur likhi hi nahi: kaun wapas aaya.

        Naya customer dhoondhne mein us ka poora din jata hai; purana wapas aane wala
        usay muft milta hai — magar sirf tab jab wo usay YAAD ho. Us ke WhatsApp mein
        saikron chat hain aur wahan "ye teesri dafa hai" kahin likha hua nahi hota.
      */}
      {repeatCustomers.length > 0 && (
        <section>
          <h2 className="text-[1.05rem] font-bold tracking-tight">{t('repeatCustomers')}</h2>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{t('repeatCustomersBody')}</p>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {repeatCustomers.map((customer) => (
              <li
                key={customer.id}
                className="card flex items-center gap-3 p-3"
              >
                <span
                  dir="ltr"
                  className="numeric flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[0.85rem] font-bold text-accent-700"
                  aria-hidden="true"
                >
                  {customer.orderCount}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9rem] font-semibold">
                    {customer.name}
                  </span>
                  <span className="block truncate text-[0.76rem] text-ink-faint">
                    {customer.area}
                  </span>
                </span>
                {/*
                  🔴 Number par seedha WhatsApp — kyunke agla qadam yehi hai.

                  Fehrist dekh kar reseller ko jo karna hai wo "naam parhna" nahi, BAAT
                  karna hai. Number dikha kar chhor dena us se copy karwata, WhatsApp
                  kholwata, chat dhoondhwata — aur har qadam par log girte hain. Wohi
                  soch `ask-address-button` par pehle se likhi hui hai.
                */}
                <a
                  href={whatsappLink(customer.phone, '')}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={customer.name}
                  className="shrink-0 rounded-pill bg-accent-50 p-2 text-accent-700 transition hover:bg-accent-500 hover:text-white"
                >
                  <WhatsAppIcon className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trending.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[1.05rem] font-bold">{t('trendingTitle')}</h2>
          <p className="mt-1 text-[0.82rem] text-ink-soft">{t('trendingHint')}</p>

          <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {trending.map((item) => (
              <li key={item.productId}>
                <Link href={`/catalogue/${item.productId}`} className="tile group block">
                  <div className="relative aspect-square overflow-hidden bg-paper-sunken">
                    {item.coverImageUrl && (
                      /* eslint-disable-next-line @next/next/no-img-element -- storage ki tasveer */
                      <img
                        src={item.coverImageUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="line-clamp-2 text-[0.78rem] font-semibold leading-snug">
                      {locale === 'ur' ? item.titleUr : item.titleEn}
                    </p>
                    <p className="mt-1 text-[0.7rem] text-accent-700">
                      <span dir="ltr" className="numeric font-semibold">
                        {item.resellers}
                      </span>{' '}
                      {t('trendingResellers')}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/*
        Kamai ki chaal — sirf tab jab kuch bana ho.

        Khali chart "abhi kuch nahi hua" se bura hai: wo poori jagah ghair kar ke bhi
        kuch nahi kehta, aur nayi reseller ko pehle din yehi sab se bara khana dikhta
        hai. Jab pehli kamai aati hai, ye khud aa jata hai.
      */}
      {inTrend > 0 && (
        <Widget
          title={t('earningsTrend')}
          subtitle={`${formatPkr(inTrend)} · ${TREND_DAYS} ${t('daysShort')}`}
        >
          <MiniBars points={points} caption={t('earningsTrendCaption')} unit={t('rupees')} />
        </Widget>
      )}

      {/*
        Mere paise — kamai aur "haath mein aaye paise" do alag cheezein hain.
        Upar wala khana batata hai ke kitna BANA; ye batata hai ke kitna MILA.
        Reseller ke liye doosra sawal zyada asli hai, aur pehle sirf pehla dikhta tha.
      */}
      {openPayouts.length > 0 && (
        <section className="card overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-paper-sunken px-5 py-4">
            <h2 className="font-bold">{t('myMoney')}</h2>
            <p className="text-[0.82rem] text-ink-soft">
              {t('moneyReceived')}{' '}
              <span dir="ltr" className="numeric font-semibold text-ink">
                {formatPkr(payoutTotals.settled)}
              </span>
              <span className="mx-2 text-ink-faint">·</span>
              {t('moneyAwaiting')}{' '}
              <span dir="ltr" className="numeric font-semibold text-brand-700">
                {formatPkr(payoutTotals.awaiting)}
              </span>
            </p>
          </div>

          <ul className="divide-y divide-paper-sunken">
            {openPayouts.map((payout) => (
              <li key={payout.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p dir="ltr" className="numeric text-sm font-semibold">
                    {payout.orderNo}
                  </p>
                  <p className="mt-0.5 text-[0.76rem] text-ink-faint">
                    {payout.status === 'SENT' ? t('payoutSentClaim') : null}
                    {payout.status === 'PENDING' ? t('payoutPending') : null}
                    {payout.status === 'DISPUTED' ? t('payoutDisputed') : null}
                  </p>
                </div>

                <span dir="ltr" className="numeric font-bold">
                  {formatPkr(payout.amount)}
                </span>

                {/*
                  Tasdeeq PENDING par bhi mumkin hai, sirf SENT par nahi.
                  Dukan wala aksar EasyPaisa kar ke portal kholta hi nahi — us ka na
                  dabana is baat ka saboot nahi ke paisa nahi aaya. Paisa reseller ke
                  haath mein hai; sab se mazboot gawahi wohi de sakti hai.

                  Jhagre par button nahi — wahan ab bari team ki hai.
                */}
                {payout.status !== 'DISPUTED' && (
                  <ResellerPayoutReply
                    payoutId={payout.id}
                    labels={{
                      received: t('payoutReceived'),
                      notReceived: t('payoutNotReceived'),
                      reason: t('payoutReason'),
                      send: t('payoutSend'),
                      cancel: t('cancel'),
                      saving: t('saving'),
                    }}
                  />
                )}
              </li>
            ))}
          </ul>

          <p className="bg-paper-sunken px-5 py-3 text-[0.78rem] text-ink-soft">{t('payoutNote')}</p>
        </section>
      )}

      {/* Aage kya karna hai — teen raaste, teen tap */}
      <section className="grid gap-4 sm:grid-cols-3">
        <Shortcut
          href="/catalogue"
          label={t('catalogue')}
          hint={t('shortcutCatalogue')}
          Icon={GridIcon}
        />
        <Shortcut href="/orders" label={t('orders')} hint={t('shortcutOrders')} Icon={ListIcon} />
        <Shortcut href="/bazaar" label={t('bazaar')} hint={t('shortcutBazaar')} Icon={SparkIcon} />
      </section>

      {orders.length > 0 && (
        <Widget
          title={t('myOrders')}
          subtitle={t('dashboardOrdersHint')}
          action={{ label: t('viewAll'), href: '/orders' }}
        >
          <ul className="divide-y divide-black/[0.05]">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span dir="ltr" className="numeric text-sm font-bold text-ink-faint">
                  {order.orderNo}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.9rem]">{order.customerName}</span>
                <span dir="ltr" className="numeric text-sm font-semibold text-accent-700">
                  {formatPkr(order.myEarnings)}
                </span>
                <span className={`badge ${orderStatusStyle(order.status)}`}>
                  {orderStatusLabel(locale as Locale, order.status)}
                </span>
              </li>
            ))}
          </ul>
        </Widget>
      )}
    </div>
  )
}

function Shortcut({
  href,
  label,
  hint,
  Icon,
}: {
  href: '/catalogue' | '/orders' | '/bazaar'
  label: string
  hint: string
  Icon: (props: { className?: string }) => React.ReactElement
}) {
  return (
    <Link href={href} className="card flex items-center gap-4 p-5 transition hover:shadow-lift">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-brand-50 text-brand-700">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{label}</span>
        <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-faint">{hint}</span>
      </span>
    </Link>
  )
}
