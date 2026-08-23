import type { Metadata } from 'next'
import { TemplateEditor } from '@/components/template-editor'
import { requireReseller } from '@/lib/api/session'
import { container } from '@/lib/container'
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
     * 🔴 Yahan koi unwan NAHI — na "میرے ٹیمپلیٹ", na us ke neeche ki tafseel.
     *
     * Baayen nav mein "ٹیمپلیٹ" pehle se roshan hai, yani banda jaanta hai ke wo kahan
     * hai. Wohi baat dobara likhne se sirf jagah jati hai — aur yahan jagah hi sab se
     * qeemti cheez hai, kyunke us ki poori kamai canvas ko milti hai.
     *
     * 7.5rem = app ka sticky header + main ki padding. (Pehle 11.5rem thi kyunke unwan
     * bhi shumar hota tha — wo chaar rem seedha canvas ko mil gaye.)
     */
    <div className="mx-auto flex max-w-7xl flex-col lg:h-[calc(100dvh-7.5rem)]">

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
