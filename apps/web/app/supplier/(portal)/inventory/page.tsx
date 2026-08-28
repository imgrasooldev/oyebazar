import type { Metadata } from 'next'
import { formatPkr } from '@oyebazar/shared'
import type { StockMoveView } from '@oyebazar/core'
import { StatTile, Widget } from '@/components/dash-kit'
import { SupplierStockActions } from '@/components/supplier-stock-actions'
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
export default async function SupplierInventoryPage() {
  const { supplier } = await requireSupplier()
  const locale = await getLocale()
  const t = translator(locale)

  const [summary, low, moves] = await Promise.all([
    container.inventory.summary(supplier.id),
    container.inventory.lowStock(supplier.id),
    container.inventory.moves({ supplierId: supplier.id, limit: 60 }),
  ])

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
              <li key={line.variantId} className="space-y-2 py-3 first:pt-0 last:pb-0">
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
                        30 din ki chaal SAATH — bina us ke ye list bemani hai: "2 bache
                        hain" us maal par bhi likha jata jo saal mein ek dafa bikta hai,
                        aur aisi list dukan wala ek dafa dekh kar dobara nahi kholta.
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
                        : 'bg-brand-50 text-brand-800'
                    }`}
                  >
                    <span className="numeric">{line.stockQty}</span>
                    {line.reorderLevel > 0 && (
                      <span className="numeric opacity-70"> / {line.reorderLevel}</span>
                    )}
                  </span>
                </div>

                <SupplierStockActions
                  variantId={line.variantId}
                  reorderLevel={line.reorderLevel}
                  labels={actionLabels(t)}
                />
              </li>
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
    </div>
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
    save: t('save'),
    saving: t('saving'),
  }
}
