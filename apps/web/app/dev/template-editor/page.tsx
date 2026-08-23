/**
 * Editor ko akela chalane ki jagah — sirf development mein.
 *
 * 🔴 Ye safha production mein MOJOOD HI NAHI hota (neeche `notFound()` dekhen), aur
 * wajah saaf honi chahiye: is par koi login nahi hai. Agar ye live par khula rehta to
 * jo bhi is ka pata jaan leta wo editor khol leta — aur wo raaz rakhne wali cheez nahi
 * hoti, sirf ek URL hoti hai.
 *
 * Zaroorat is liye pari ke phone ka layout aazmane ke liye asli safha chahiye tha, aur
 * us tak pohanchne ke do hi raaste the: reseller ka session cookie idhar udhar le jana,
 * ya editor ko us ke asli data ke baghair chala lena. Doosra rasta saaf hai — jo cheez
 * aazmani hai wo editor hai, login nahi.
 *
 * Data yahan banawati hai aur JAAN BOOJH KAR poora hai: chhe tay-shuda cheezein, ek
 * apna text, ek shakl aur ek logo — kyunke khali template par wo masle nazar hi nahi
 * aate jo bhare hue par aate hain.
 */
import { notFound } from 'next/navigation'
import { DEFAULT_TEMPLATE_SPEC } from '@oyebazar/shared'
import { TemplateEditor } from '@/components/template-editor'

export const dynamic = 'force-dynamic'

export default function DevTemplateEditorPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <TemplateEditor
      templates={[
        {
          id: 'dev-template',
          name: 'Dev template',
          revision: 1,
          spec: {
            ...DEFAULT_TEMPLATE_SPEC,
            layers: [
              {
                kind: 'text',
                text: 'مفت ڈیلیوری',
                show: true,
                x: 20,
                y: 30,
                size: 48,
              },
              {
                kind: 'shape',
                shape: 'rect',
                show: true,
                x: 8,
                y: 46,
                width: 40,
                height: 6,
                behind: true,
              },
            ],
          },
        },
      ]}
      defaultTemplateKey={null}
      photos={[]}
      locale="ur"
    />
  )
}
