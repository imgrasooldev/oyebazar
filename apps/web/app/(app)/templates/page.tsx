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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">{t('myTemplates')}</h1>
      <p className="mt-1 text-sm text-ink-soft">{t('templatesIntro')}</p>

      <div className="mt-6">
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
