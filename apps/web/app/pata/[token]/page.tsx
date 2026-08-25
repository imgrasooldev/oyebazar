import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { formatPkr } from '@oyebazar/shared'
import { LazyImage } from '@/components/lazy-image'
import { AddressForm } from '@/components/address-form'
import { container } from '@/lib/container'
import { pickTitle, translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ token: string }> }

/**
 * 🔴 Ye safha `(public)` group ke BAHAR hai — aur ye jaan boojh kar hai.
 *
 * Pehle wo wahin andar tha, aur live dekhne par saaf hua ke customer ko poora
 * marketplace ka header dikh raha tha: "Wholesaler login", "Search wholesalers or
 * markets", "directory of verified wholesalers".
 *
 * Yani jis customer ko reseller ne apna link bheja tha, usay ek tap mein wo jagah nazar
 * aa rahi thi jahan se maal aata hai. Wo reseller ke karobar ki jarh kaat deta hai —
 * aur us link se, jo us ne KHUD bheja tha.
 *
 * Yahan sirf root layout lagta hai (html/body, koi chrome nahi). Safha customer ka hai:
 * reseller ka naam, maal, aur pata likhne ki jagah — aur kuch nahi.
 *
 * 🔴 `noindex` — ye safha kabhi Google par nahi jana chahiye.
 *
 * Is par ek shakhs ka naam, number aur ghar ka pata likha jata hai. Aur khud link ek
 * chabi hai: agar wo kisi fehrist mein aa gaya to koi bhi khol kar kisi aur ka pata
 * dekh ya bhej sakta hai.
 */
export const metadata: Metadata = {
  title: 'Apna pata likhein',
  robots: { index: false, follow: false },
}

export default async function PataPage({ params }: Props) {
  const { token } = await params
  const [locale, request] = await Promise.all([
    getLocale(),
    container.addressRequests.forCustomer(token).catch(() => null),
  ])

  if (!request) notFound()

  const t = translator(locale)
  const expired = request.expiresAt.getTime() < Date.now()

  /*
   * Teen soortein jin mein form dikhta hi nahi — aur teenon ka jawab SAAF likha hai.
   *
   * 🔴 Khali safha ya khamosh form us se bura hai: customer samajhti hai ke us ne
   * pata bhej diya hai, aur reseller intezar karti rehti hai. Dono taraf ka waqt is
   * khamoshi mein jata hai, aur aakhir mein order banta hi nahi.
   */
  const closed = request.usedAt
    ? { title: t('pataUsedTitle'), body: t('pataUsedBody') }
    : request.filledAt
      ? { title: t('pataDone'), body: t('pataDoneBody') }
      : expired
        ? { title: t('pataExpiredTitle'), body: t('pataExpiredBody') }
        : null

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-8">
      {/*
        Reseller ka apna naam sab se upar — OyeBazar ka nahi.

        🔴 Customer reseller ko jaanti hai, hamein nahi. Is safhe par hamara naam bara
        likhna do nuqsan deta: customer ko lagta hai wo kisi anjaan jagah apna pata de
        rahi hai, aur reseller ka apna karobar hamare peechay chhup jata hai.
      */}
      <header className="text-center">
        <p className="text-[1.15rem] font-bold text-ink">{request.shopName}</p>
        <p className="mt-1 text-[0.85rem] text-ink-faint">{t('pataIntro')}</p>
      </header>

      <section className="mt-5 flex items-center gap-3 rounded-card bg-paper-raised p-3 shadow-soft">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-card bg-paper-sunken">
          {request.imageUrl && (
            <LazyImage src={request.imageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {pickTitle(locale, {
              titleUr: request.productTitleUr,
              titleEn: request.productTitleEn,
            })}
          </p>
          <p className="mt-0.5 text-[0.85rem] text-ink-soft">
            {/*
              Jo raqam customer dega — wohi jo reseller ne link banate waqt tay ki thi.
              🔴 Hamara rate, dukan ka rate, reseller ka munafa — teenon mein se kuch bhi
              yahan nahi. Ye safha customer ka hai.
            */}
            <span dir="ltr" className="numeric font-bold text-ink">
              {formatPkr(request.retailPrice * request.qty)}
            </span>
            {request.qty > 1 && (
              <span className="ms-2 text-ink-faint">
                ({request.qty} × <span dir="ltr" className="numeric">{formatPkr(request.retailPrice)}</span>)
              </span>
            )}
          </p>
        </div>
      </section>

      <div className="mt-6">
        {closed ? (
          <section className="rounded-card bg-paper-sunken p-5 text-center">
            <p className="text-[1rem] font-bold text-ink">{closed.title}</p>
            <p className="mt-1 text-[0.88rem] text-ink-soft">{closed.body}</p>
          </section>
        ) : (
          <AddressForm
            token={request.token}
            labels={{
              name: t('pataName'),
              phone: t('pataPhone'),
              phoneHint: t('pataPhoneHint'),
              address: t('pataAddress'),
              addressHint: t('pataAddressHint'),
              area: t('pataArea'),
              pin: t('pataPin'),
              pinBody: t('pataPinBody'),
              pinGot: t('pataPinGot'),
              pinGetting: t('pataPinGetting'),
              pinFailed: t('pataPinFailed'),
              submit: t('pataSubmit'),
              sending: t('pataSending'),
              done: t('pataDone'),
              doneBody: t('pataDoneBody'),
              failed: t('pataFailed'),
            }}
          />
        )}
      </div>

      <p className="mt-8 text-center text-[0.72rem] text-ink-faint">{t('pataFooter')}</p>
    </main>
  )
}
