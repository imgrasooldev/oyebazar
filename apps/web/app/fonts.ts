import localFont from 'next/font/local'

/**
 * Font — do zubanein, do bilkul alag masle.
 *
 * 🔴 Pehle dono font `globals.css` mein `@import` se aate the. Do kharabiyan thin:
 *
 *  1. `@import` ka matlab hai browser pehle hamari CSS utaray, PARHE, phir font ki
 *     darkhwast bheje — ek poora chakkar zaya. Preload bhi nahi lag sakta kyunke build
 *     ke waqt Next ko pata hi nahi hota ke font kahan se aa raha hai.
 *  2. Nastaliq HAR visitor ko jata tha — Roman Urdu aur English wale ko bhi, jab ke un
 *     ke safhe par ek bhi Nastaliq haraf nahi hota. 400 aur 700 milakar 317 KB.
 *
 * Ab Latin yahan se (hashed URL, immutable cache, khud-ba-khud preload), aur Nastaliq
 * `globals.css` ke apne `@font-face` se — us ka preload sirf Urdu wale safhe par lagta
 * hai (dekhen `app/layout.tsx`).
 */

/**
 * Inter — sirf Latin subset, sirf weight axis.
 *
 * Har hindsa isi mein chhapta hai (qeemat, phone, ginti), is liye ye teenon zubanon par
 * lazmi hai — Urdu safhe par bhi. Yehi wajah hai ke ye preload hota hai aur Nastaliq nahi.
 *
 * `latin-ext`, Greek aur Cyrillic jaan boojh kar nahi (85 KB ka farq, aur hamare paas
 * un mein ek lafz nahi). Italic bhi nahi — poore portal mein kahin italic nahi hai.
 */
export const inter = localFont({
  src: './fonts/inter-latin-wght-normal.woff2',
  variable: '--font-sans-loaded',
  display: 'swap',
  weight: '100 900',
  // Font aane se pehle wala system font isi naap par set hota hai — matn hilta nahi
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
  preload: true,
})
