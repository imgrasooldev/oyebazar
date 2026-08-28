import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import type {
  InventoryLineView,
  StockMoveView,
  WarehouseStockLine,
  WarehouseView,
} from '@oyebazar/core'
import { StatTile, Widget } from '@/components/dash-kit'
import { SupplierStockActions } from '@/components/supplier-stock-actions'
import { SupplierWarehouses } from '@/components/supplier-warehouses'
import { ExpiringBatches } from '@/components/expiring-batches'
import { BoxesIcon, LayersIcon, MoneyIcon, ShieldIcon } from '@/components/icons'
import { requireSupplier } from '@/lib/api/supplier-session'
import { container } from '@/lib/container'
import { translator, type Locale } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = {
  title: 'Inventory',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

/**
 * Maal ka hisab — dukan ke ANDAR ka safha.
 *
 * 🔴 Ye `/supplier/stock` se alag safha hai, aur wo faisla soch kar kiya gaya hai. Dono
 * "maal" ke bare mein hain magar do bilkul alag sawal poochhte hain:
 *
 *   · /stock     — "main kya bech raha hoon": naam, tasveer, rate, LIVE ya band.
 *                  Ye sab BAHAR nazar aata hai (reseller ko, Bazaar par).
 *   · yahan      — "mere paas kya para hai": ginti, lagat, register.
 *                  Ye kisi ko nahi dikhta, sirf dukan ko.
 *
 * Dono ek safhe par rakhne ki koshish us safhe ko chalees maal × chhay khaanon ka jaal
 * bana deti — aur wo safha dukan wala din mein sab se zyada kholta hai.
 *
 * 🔴 Lagat (`avgCost`, `unitCost`) sirf YAHAN chhapti hai. Ye `supplierPrice` se bhi
 * zyada hassas number hai: us se hamara margin khulta hai, is se dukan ka MUNAFA. Ye
 * kisi reseller-facing ya public safhe par kabhi nahi jata.
 */
export default async function SupplierInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const [{ supplier }, locale, query] = await Promise.all([
    requireSupplier(),
    getLocale(),
    searchParams,
  ])
  const t = translator(locale)
  const search = query.q?.trim() || undefined

  const [summary, low, all, moves, warehouses, expiring] = await Promise.all([
    container.inventory.summary(supplier.id),
    container.inventory.lowStock(supplier.id),
    container.inventory.allStock(supplier.id, search),
    container.inventory.moves({ supplierId: supplier.id, limit: 60 }),
    container.inventory.listWarehouses(supplier.id),
    container.inventory.expiringStock(supplier.id),
  ])

  /*
   * Jo qatar upar "khatam ho raha hai" mein aa chuki hai, wo neeche dobara nahi aati —
   * magar SIRF jab koi talash na ho. Talash ke waqt banda ek KHAAS cheez dhoond raha
   * hota hai, aur us ka natije se ghayab ho jana (kyunke wo upar bhi maujood hai) us
   * safhe ko toota hua bana deta hai.
   */
  const lowIds = new Set(low.map((line) => line.variantId))
  const rest = search ? all : all.filter((line) => !lowIds.has(line.variantId))

  /*
   * Kis cheez ka maal kis godown mein — SAARI qataron ke liye EK query.
   *
   * Har qatar par alag query chalane se ye safha 250 chakkar lagata (wahi ghalti jo
   * `listVariantsFor` se pehle stock ke safhe par ho chuki hai). Ek godown wali dukan
   * par ye query bhi bekar hai, is liye wahan chalti hi nahi.
   */
  const places =
    warehouses.length > 1
      ? await container.inventory.stockByWarehouse(
          supplier.id,
          [...low, ...rest].map((line) => line.variantId),
        )
      : new Map<string, WarehouseStockLine[]>()

  // Band godown mein naya maal nahi jata — chunne wale khaane mein wo aana hi nahi chahiye
  const openHouses = warehouses.filter((house) => house.isActive)

  /*
   * Qeemat sirf tab jab lagat waqai maloom ho. "Rs 0" parhne wala samajhta hai ke us ka
   * maal bekar hai — jo sach nahi, aur us se ye safha pehli hi nazar mein bharosa kho
   * deta hai. Dekhen `domain/stock.ts`.
   */
  const hasValue = summary.covered > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[1.35rem] font-bold tracking-tight">{t('inventoryNav')}</h1>
        <p className="mt-1 text-[0.92rem] leading-relaxed text-ink-soft">{t('inventoryBody')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<MoneyIcon />}
          tone={hasValue ? 'accent' : 'plain'}
          label={t('stockValue')}
          value={hasValue ? formatPkr(summary.value) : '—'}
          hint={hasValue ? t('stockValuePartial') : t('stockValueUnknown')}
          {...(hasValue && summary.total > 0
            ? // Kitne maal par ye number khara hai — bina is ke banda samajhta hai ke
              // ye us ka POORA maal hai
              { progress: Math.round((summary.covered / summary.total) * 100) }
            : {})}
        />
        <StatTile icon={<BoxesIcon />} label={t('piecesTotal')} value={String(summary.total)} />
        <StatTile
          icon={<LayersIcon />}
          tone={summary.lowCount > 0 ? 'brand' : 'plain'}
          label={t('stockLowCount')}
          value={String(summary.lowCount)}
        />
        <StatTile
          icon={<ShieldIcon />}
          tone={summary.outCount > 0 ? 'danger' : 'plain'}
          label={t('stockOutCount')}
          value={String(summary.outCount)}
        />
      </div>

      <Widget title={t('runningLow')} subtitle={t('runningLowBody')}>
        {low.length === 0 ? (
          <p className="py-6 text-center text-[0.9rem] text-ink-soft">{t('nothingLow')}</p>
        ) : (
          <ul className="divide-y divide-paper-sunken">
            {low.map((line) => (
              <StockRow
                key={line.variantId}
                line={line}
                locale={locale}
                warehouses={openHouses}
                places={places.get(line.variantId) ?? []}
              />
            ))}
          </ul>
        )}
      </Widget>

      {/*
        Maddat — aur ye khana SIRF us dukan ko dikhta hai jo khep likhti hai.

        🔴 Khali hone par poora khana ghayab. Kapre, bartan aur jewellery wali dukanon ki
        koi maddat hoti hi nahi; un ke saamne ek hamesha-khali khana rakhna unhen ye
        sikhata hai ke is safhe par kuch khaane bemani hain — aur us ke baad wo baqi
        khaanon ko bhi utni tawajjo nahi dete.

        Ye "khatam ho raha hai" ke FORAN baad hai: dono ek hi sawal ke do rukh hain —
        "kya cheez ab kaam ki nahi rahegi".
      */}
      {expiring.length > 0 && (
        <Widget title={t('expiringTitle')} subtitle={t('expiringBody')}>
          <ExpiringBatches
            batches={expiring}
            labels={{
              expired: t('batchExpired'),
              daysLeft: t('batchExpiringIn'),
              daysAgo: t('batchExpiredAgo'),
              left: t('batchLeft'),
              writeOff: t('batchWriteOff'),
              reason: t('writeOffReason'),
              save: t('save'),
              saving: t('saving'),
            }}
          />
        </Widget>
      )}

      {/*
        Saara maal — naya maal daalne ki asal jagah.

        🔴 Ye "khatam ho raha hai" wali list ke NEECHE hai, upar nahi. Wajah tarteeb ki
        hai: upar wo hai jis par abhi kaam karna hai; ye wo hai jahan banda tab aata hai
        jab us ke paas naya maal utra ho. Dono ko barabar numaya karne se pehli list ka
        poora maqsad khatam ho jata — wo isi liye upar hai ke us par nazar pare.
      */}
      <Widget title={t('allStock')} subtitle={t('allStockBody')}>
        {/*
          Talash ek saada form hai — koi JavaScript nahi. Bari dukan par 200 qataren
          hoti hain, aur phone par un mein scroll karna wohi kaam hai jise koi nahi karta.
        */}
        <form className="mb-3 flex gap-2" action="/supplier/inventory">
          <input
            type="search"
            name="q"
            defaultValue={search ?? ''}
            placeholder={t('stockSearchPlaceholder')}
            className="min-h-tap flex-1 rounded-card bg-paper-sunken px-4 text-[0.9rem]"
          />
          <button
            type="submit"
            className="inline-flex min-h-tap items-center rounded-pill bg-coal-900 px-5 text-[0.82rem] font-semibold text-white"
          >
            {t('search')}
          </button>
        </form>

        {rest.length === 0 ? (
          <p className="py-6 text-center text-[0.9rem] text-ink-soft">
            {search ? t('noStockMatch') : t('noSupplierProducts')}
          </p>
        ) : (
          <ul className="divide-y divide-paper-sunken">
            {rest.map((line) => (
              <StockRow
                key={line.variantId}
                line={line}
                locale={locale}
                warehouses={openHouses}
                places={places.get(line.variantId) ?? []}
              />
            ))}
          </ul>
        )}
      </Widget>

      <Widget title={t('stockRegister')} subtitle={t('stockRegisterBody')}>
        {moves.length === 0 ? (
          <p className="py-6 text-center text-[0.9rem] text-ink-soft">{t('noMoves')}</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[34rem] text-[0.82rem]">
              <tbody className="divide-y divide-paper-sunken">
                {moves.map((move) => (
                  <MoveRow key={move.id} move={move} locale={locale} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Widget>

      {/*
        Godown sab se NEECHE — ye rozana ka kaam nahi hai.

        Aksar dukan ka ek hi godown hota hai aur wo is khaane ko kabhi nahi kholti; jise
        doosri jagah chahiye wo ek dafa yahan aa kar daal leta hai aur phir bhool jata hai.
        Isay upar rakhne se har roz ka kaam (kya khatam ho raha hai) neeche chala jata.
      */}
      <Widget title={t('warehouses')} subtitle={t('warehousesBody')}>
        <SupplierWarehouses
          warehouses={warehouses}
          labels={{
            add: t('warehouseAdd'),
            name: t('warehouseName'),
            isDefault: t('warehouseDefault'),
            close: t('warehouseClose'),
            open: t('warehouseOpen'),
            closed: t('warehouseClosed'),
            noDelete: t('warehouseNoDelete'),
            pieces: t('pieces'),
            save: t('save'),
            saving: t('saving'),
          }}
        />
      </Widget>
    </div>
  )
}

/**
 * Maal ki ek qatar — dono liston mein WOHI EK.
 *
 * Do alag qataren likhne se dono aahista aahista alag ho jatin (ek par lagat dikhti,
 * doosri par nahi), aur dukan wale ko har list par dobara seekhna parta ke yahan kya
 * likha hai.
 */
function StockRow({
  line,
  locale,
  warehouses,
  places,
}: {
  line: InventoryLineView
  locale: Locale
  warehouses: readonly WarehouseView[]
  places: readonly WarehouseStockLine[]
}) {
  const t = translator(locale)
  const held = places.filter((place) => place.qty > 0)

  return (
    <li className="space-y-2 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {locale === 'ur' ? line.titleUr : line.titleEn}
            {(line.colour || line.size) && (
              <span className="ms-2 text-[0.8rem] font-normal text-ink-faint">
                {[line.colour, line.size].filter(Boolean).join(' · ')}
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[0.78rem] text-ink-faint">
            {/*
              30 din ki chaal SAATH — bina us ke ye list bemani hai: "2 bache hain" us
              maal par bhi likha jata jo saal mein ek dafa bikta hai, aur aisi list dukan
              wala ek dafa dekh kar dobara nahi kholta.
            */}
            {t('soldLast30')}:{' '}
            <span dir="ltr" className="numeric font-semibold text-ink">
              {line.soldLast30}
            </span>
            {line.avgCost > 0 && (
              <>
                {' · '}
                {t('unitCostShort')}{' '}
                <span dir="ltr" className="numeric">
                  {formatPkr(line.avgCost)}
                </span>
              </>
            )}
          </p>
        </div>

        <span
          dir="ltr"
          className={`badge shrink-0 ${
            line.health === 'out'
              ? 'bg-red-50 text-red-700'
              : line.health === 'low'
                ? 'bg-brand-50 text-brand-800'
                : 'bg-paper-sunken text-ink-soft'
          }`}
        >
          <span className="numeric">{line.stockQty}</span>
          {line.reorderLevel > 0 && (
            <span className="numeric opacity-70"> / {line.reorderLevel}</span>
          )}
        </span>
      </div>

      {/*
        Kis godown mein kitna — sirf jab ek se zyada jagah ho AUR maal ek hi jagah na ho.
        "دکان: 12" akela likhna wohi baat dobara likhna hai jo saath wale khaane mein
        pehle se hai.
      */}
      {held.length > 1 && (
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-[0.76rem] text-ink-faint">
          {held.map((place) => (
            <span key={place.warehouseId}>
              {place.warehouseName}:{' '}
              <span dir="ltr" className="numeric font-semibold text-ink-soft">
                {place.qty}
              </span>
            </span>
          ))}
        </p>
      )}

      <SupplierStockActions
        variantId={line.variantId}
        reorderLevel={line.reorderLevel}
        warehouses={warehouses}
        places={places}
        labels={actionLabels(t)}
      />
    </li>
  )
}

function MoveRow({ move, locale }: { move: StockMoveView; locale: Locale }) {
  const t = translator(locale)
  const added = move.delta > 0

  return (
    <tr>
      <td className="py-2 pe-3">
        <p className="truncate font-medium">
          {locale === 'ur' ? move.productTitleUr : move.productTitleEn}
        </p>
        {(move.colour || move.size) && (
          <p className="text-[0.74rem] text-ink-faint">
            {[move.colour, move.size].filter(Boolean).join(' · ')}
          </p>
        )}
      </td>

      <td className="py-2 pe-3 text-ink-soft">
        {t(`move${move.reason}` as Parameters<typeof t>[0])}
        {/*
          Order ka number saath — jhagre ke din yehi wo ek cheez hai jise dukan wala
          dhoondta hai, aur usi number par reseller bhi baat karti hai.
        */}
        {move.orderNo && (
          <span dir="ltr" className="numeric ms-1.5 text-[0.76rem] text-ink-faint">
            {move.orderNo}
          </span>
        )}
        {/* Purani qataron par godown khali hai — register us se pehle bana tha */}
        {move.warehouseName && (
          <span className="ms-1.5 text-[0.76rem] text-ink-faint">· {move.warehouseName}</span>
        )}
        {move.note && (
          <span className="ms-1.5 text-[0.76rem] text-ink-faint">— {move.note}</span>
        )}
      </td>

      <td dir="ltr" className="numeric py-2 pe-3 text-end">
        {move.unitCost !== null && move.unitCost > 0 && (
          <span className="text-[0.76rem] text-ink-faint">{formatPkr(move.unitCost)}</span>
        )}
      </td>

      <td
        dir="ltr"
        className={`numeric py-2 pe-3 text-end font-bold ${
          added ? 'text-accent-700' : 'text-ink'
        }`}
      >
        {added ? '+' : ''}
        {move.delta}
      </td>

      <td dir="ltr" className="numeric py-2 text-end text-ink-faint">
        {move.balanceAfter}
      </td>
    </tr>
  )
}

/** Ek hi jagah — teenon harkatein inhi lafzon par chalti hain. */
function actionLabels(t: ReturnType<typeof translator>) {
  return {
    stockIn: t('stockInAction'),
    stockInQty: t('stockInQty'),
    stockInCost: t('stockInCost'),
    stockInCostNote: t('stockInCostNote'),
    writeOff: t('writeOffAction'),
    writeOffQty: t('writeOffQty'),
    writeOffReason: t('writeOffReason'),
    reorderLabel: t('reorderLevelLabel'),
    reorderOff: t('reorderLevelOff'),
    transfer: t('transferAction'),
    transferFrom: t('transferFrom'),
    transferTo: t('transferTo'),
    warehouse: t('inWarehouse'),
    batchNo: t('batchNo'),
    batchExpiry: t('batchExpiry'),
    batchExpiryNote: t('batchExpiryNote'),
    save: t('save'),
    saving: t('saving'),
  }
}
