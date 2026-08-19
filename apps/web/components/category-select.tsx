'use client'

import type { Locale } from '@/lib/i18n'

export interface CategoryOption {
  slug: string
  nameUr: string
  nameEn: string
}

export interface CategoryGroup extends CategoryOption {
  children: readonly CategoryOption[]
}

/**
 * Category chunne ka khaana — naya maal aur DRAFT edit, dono yahi istemal karte hain.
 *
 * 🔴 SUB-category dikhati hai, sirf bari nahi.
 *
 * Pehle dono form `categories.findAll()` par the, jo sirf `parentId: null` wali (bari)
 * categories deta hai — jabke poore system mein maal SUB-category par lagta hai (lawn,
 * abaya…). Natija do alag kharabiyan thin:
 *
 *  · naya maal hamesha bari category par lagta tha, kabhi lawn/abaya par nahi
 *  · edit form kholte hi `lawn` wala maal "apparel" dikhata (kyunke `lawn` list mein
 *    thi hi nahi, aur `<select>` chup chaap pehla option chun leta hai) — aur bina
 *    kuch chhue "save" dabane par maal ki category waqai badal jati
 *
 * Doosri wali sab se buri qism ki kharabi hai: aap kuch badalte nahi, aur phir bhi
 * kuch badal jata hai.
 */
export function CategorySelect({
  name,
  groups,
  value,
  locale,
  required,
}: {
  name: string
  groups: readonly CategoryGroup[]
  /** Mojooda category (edit ke liye). List mein na ho to bhi mehfooz rehti hai. */
  value?: string | undefined
  locale: Locale
  required?: boolean
}) {
  const label = (category: CategoryOption) => (locale === 'ur' ? category.nameUr : category.nameEn)

  const known = new Set(
    groups.flatMap((group) => [group.slug, ...group.children.map((child) => child.slug)]),
  )

  return (
    <select name={name} required={required} defaultValue={value} className="field mt-2">
      {/*
        Mojooda category kisi wajah se list mein na ho (archived, ya darakht badal gaya)
        to usay yahan rakh dete hain. Warna `<select>` pehla option chun leta aur
        maal chup chaap kisi aur category mein chala jata.
      */}
      {value && !known.has(value) && <option value={value}>{value}</option>}

      {groups.map((group) =>
        group.children.length > 0 ? (
          <optgroup key={group.slug} label={label(group)}>
            {group.children.map((child) => (
              <option key={child.slug} value={child.slug}>
                {label(child)}
              </option>
            ))}
          </optgroup>
        ) : (
          // Jis bari category ke neeche kuch nahi, wo khud chuni ja sakti hai
          <option key={group.slug} value={group.slug}>
            {label(group)}
          </option>
        ),
      )}
    </select>
  )
}
