import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { FlatCompat } from '@eslint/eslintrc'

/**
 * ESLint — flat config (ESLint 9).
 *
 * 🔴 Ye file mahino se GHAYAB thi: `pnpm lint` chalte hi ruk jati thi aur "ESLint set
 * up karen?" poochh kar mar jati thi — yani poore repo mein lint kabhi chali hi nahi,
 * aur us ki di hui saari khabar (React hooks ki ghaltiyan, gum shuda `alt`, Next ke
 * apne masle) kisi ne kabhi nahi dekhi.
 *
 * Next ka apna config abhi purane (eslintrc) andaz mein hai, is liye FlatCompat ke
 * zariye laya gaya hai — jab Next khud flat config dene lagega, ye do lakeerein hat
 * jayengi aur baqi sab wohi rahega.
 */
const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default [
  {
    /*
     * Ye jagahen lint se bahar: `.next` bana hua maal hai, `_dev-media` tasveerein hain,
     * aur `shots` screenshots. In par chalane ka matlab sirf minute zaya karna hai.
     */
    ignores: [
      // Bana hua maal — `.next-local` bhi (yahan dev build isi naam se banti hai)
      '.next/**',
      '.next-local/**',
      'out/**',
      'coverage/**',
      'node_modules/**',
      // Test ki tasveerein aur screenshots
      'public/_dev-media/**',
      'next-env.d.ts',
    ],
  },

  ...compat.extends('next/core-web-vitals', 'next/typescript'),

  {
    // Config files ka andaz hi yehi hai — default export seedha object/array hota hai
    files: ['*.mjs', '*.js'],
    rules: { 'import/no-anonymous-default-export': 'off' },
  },

  {
    rules: {
      /*
       * Bina istemal wali cheezein ghalti hain — magar `_` se shuru hone wali nahi.
       * Wo jaan boojh kar chhori jati hain (jaise `catch (_error)` ya wo props jo
       * signature mein zaroori hain magar body mein nahi).
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
]
