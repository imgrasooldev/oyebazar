import type { Config } from 'tailwindcss'

/**
 * Design system — Orange + Charcoal.
 *
 * Rang ka faisla: orange wo rang hai jo Pakistani khareedar ke dimagh mein "sauda"
 * ka matlab rakhta hai (Daraz ne ye seekha diya). Magar poora safha orange karne se
 * do nuqsan hain — site naqal lagti hai, aur thok wale ko sanjeeda nahi lagti.
 *
 * Is liye: orange sirf WAHAN jahan kaam hota hai (button, badge, link), aur base
 * gehra charcoal. Sabz (accent) sirf "tasdeeq shuda" jaise bharosay ke ishare par.
 *
 * Border ki jagah SHADOW: patli grey lakeerein purane admin panel jaisi lagti hain.
 */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // kaghaz — safed nahi, halka garam off-white
        paper: {
          DEFAULT: '#F7F6F4',
          raised: '#FFFFFF',
          sunken: '#F0EEEA',
        },
        ink: {
          DEFAULT: '#191A1D',
          soft: '#55575E',
          faint: '#8C8E96',
        },
        // brand — orange, sirf kaam wali jagahon par
        brand: {
          50: '#FFF3EC',
          100: '#FFE4D3',
          200: '#FFC6A6',
          300: '#FFA273',
          400: '#FB7C40',
          500: '#F2600C',
          600: '#D44F05',
          700: '#AE3F06',
          800: '#8A330A',
          900: '#6B280A',
        },
        // charcoal — hero, footer, gehri sathen
        coal: {
          50: '#F4F4F5',
          100: '#E4E4E7',
          300: '#A1A1A6',
          500: '#5B5C63',
          700: '#2F3035',
          800: '#232428',
          900: '#191A1D',
          950: '#0F1012',
        },
        // accent — sabz, sirf bharosay ke ishare (tasdeeq shuda, kamyabi)
        accent: {
          50: '#E7F5F1',
          100: '#CDEAE2',
          300: '#6FC0AC',
          500: '#0E7C66',
          700: '#0A5A4A',
        },
      },
      fontFamily: {
        // asli values globals.css ke :root mein hain (self-hosted @fontsource)
        urdu: ['var(--font-urdu)'],
        sans: ['var(--font-sans)'],
      },
      borderRadius: {
        card: '1rem',
        pill: '999px',
      },
      boxShadow: {
        // do parton wali parchhain — ek qareeb ki, ek door ki. Ek hi shadow flat lagti hai.
        soft: '0 1px 2px rgba(25,26,29,.05), 0 10px 30px -18px rgba(25,26,29,.28)',
        lift: '0 2px 6px rgba(25,26,29,.07), 0 18px 40px -20px rgba(25,26,29,.4)',
      },
      maxWidth: {
        // 1200 par bari screen dono taraf khali lagti thi. 1440 marketplace ka aam arz hai.
        shell: '1440px',
      },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config
