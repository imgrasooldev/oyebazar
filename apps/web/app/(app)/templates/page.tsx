import type { Metadata } from 'next'
import { TemplateEditor } from '@/components/template-editor'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
import { translator } from '@/lib/i18n'
import { getLocale } from '@/lib/i18n-server'

export const metadata: Metadata = { title: 'میرے ٹیمپلیٹ' }
export const dynamic = 'force-dynamic'

/**
 * Reseller ke apne template.
 *
 * Ye Content Studio se ALAG safha hai, aur jaan boojh kar. Studio ka kaam roz ka hai —
 * teen tap mein pack banao. Template banana mahine mein ek dafa ka kaam hai aur us mein
 * waqt lagta hai. Dono ko ek safhe par rakhne ka matlab hota ke roz wala kaam mahine
 * wale kaam ke bojh tale dab jaye.
 */
export default async function TemplatesPage() {
  const [{ reseller }, locale] = await Promise.all([requireReseller(), getLocale()])
  const t = translator(locale)

  const templates = await container.repositories.resellerTemplates.listForReseller(reseller.id)

  return (
    /*
     * 🔴 Ye safha jaan boojh kar POORI screen ka hai — editor ke andar scroll hota hai,
     * safhe ka nahi.
     *
     * Baqi safhe lambe ho kar neeche barhte hain, aur wo un ke liye theek hai. Magar
     * yahan canvas aur us ke qabu SAATH dikhne chahiyen: reseller ek cheez khiskati hai
     * aur foran dekhti hai ke kaisi lagi. Agar un ke darmiyan scroll aa jaye to har
     * chhoti tabdeeli ek safar ban jati hai.
     *
     * `100dvh` (`100vh` nahi): phone par address bar chhupti aur khulti hai, aur `vh`
     * us ko shumar nahi karta — us soorat mein neeche wali patti screen se bahar
     * chali jati hai.
     *
     * 11.5rem = app ka sticky header + main ki padding + is safhe ka apna unwan. Ye
     * ginti haath se naapi gayi hai: is se kam par safha khud scroll karne lagta hai,
     * aur us se poora maqsad hi khatam ho jata hai.
     */
    <div className="mx-auto flex max-w-7xl flex-col lg:h-[calc(100dvh-11.5rem)]">
      <div className="mb-3 shrink-0">
        <h1 className="text-xl font-bold">{t('myTemplates')}</h1>
        <p className="mt-0.5 line-clamp-1 text-[0.8rem] text-ink-soft">{t('templatesIntro')}</p>
      </div>

      <div className="lg:min-h-0 lg:flex-1">
        <TemplateEditor
          templates={templates.map((template) => ({
            id: template.id,
            name: template.name,
            spec: template.spec,
            revision: template.revision,
          }))}
          defaultTemplateKey={reseller.packTemplateKey}
          locale={locale}
        />
      </div>
    </div>
  )
}
