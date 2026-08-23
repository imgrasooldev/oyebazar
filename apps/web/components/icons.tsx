/**
 * Inline SVG icons — koi icon library nahi.
 *
 * Wajah: icon package 30–80KB leta hai aur hamara first-load budget 1MB hai
 * (3G par LCP <3s). Yahan char icons chahiyen, wo bas itne hi hain.
 */

type Props = {
  className?: string
  /**
   * Nishan ka apna rang — sirf un icons par jo reseller ka chuna hua rang KHUD
   * dikhate hain (likhai ka rang, peechay ka rang). Baqi har jagah rang `currentColor`
   * se aata hai, aur wohi theek hai.
   */
  style?: React.CSSProperties
}

export function SearchIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CheckBadgeIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m12 3 2.2 1.6 2.7-.2.9 2.6 2.2 1.6-.9 2.6.9 2.6-2.2 1.6-.9 2.6-2.7-.2L12 21l-2.2-1.6-2.7.2-.9-2.6L4 15.4l.9-2.6L4 10.2l2.2-1.6.9-2.6 2.7.2L12 3Z"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="m8.8 12.2 2.2 2.2 4.2-4.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function WhatsAppIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-1.7-.1a11 11 0 0 1-6-5.3c-.4-.7-.6-1.4-.6-2 0-.7.4-1.3.7-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.8 1.8c0 .2 0 .3-.1.5l-.4.5c-.1.2-.3.3-.1.6.5.9 1.2 1.6 2.1 2.1.3.2.5.1.6 0l.6-.7c.2-.2.3-.2.5-.1l1.7.8c.2.1.3.2.4.3v.9Z" />
    </svg>
  )
}

export function ChevronIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function NoCartIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 4h2l2.4 10.2A2 2 0 0 0 9.3 16h7.9a2 2 0 0 0 2-1.6L20.5 8H6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20" r="1.4" fill="currentColor" />
      <circle cx="17" cy="20" r="1.4" fill="currentColor" />
      <path d="m4 3 17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function ChatIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 12a7 7 0 0 1-7 7H8l-4 3v-5.6A7 7 0 0 1 11 5h2a7 7 0 0 1 7 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 9h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function BoxesIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="12" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="12" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="8" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function ShieldIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3l7 3v5.5c0 4.3-2.9 8-7 9.5-4.1-1.5-7-5.2-7-9.5V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function StoreIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 9h16v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9ZM3 9l1.6-4.4A1 1 0 0 1 5.5 4h13a1 1 0 0 1 .9.6L21 9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export function GridIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function DownloadIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 4v11m0 0 4-4m-4 4-4-4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 18h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export function CopyIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M15 6.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function SparkIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path d="M19 4.5 19.6 6l1.5.5-1.5.5L19 8.5 18.4 7 17 6.5l1.4-.5.6-1.5Z" fill="currentColor" />
    </svg>
  )
}

/**
 * Aankh — cheez dikh rahi hai ya chhupi hui.
 *
 * 🔴 SVG, emoji nahi. `👁`/`🚫` har nizam par apni shakl aur apne rang mein aate hain
 * (kuch par rangeen, kuch par patle) — list be-tarteeb lagti thi aur rang UI se mel
 * nahi khata tha.
 */
export function EyeIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function EyeOffIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.2 7.3A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5c1.4 0 2.6-.3 3.7-.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

/**
 * Undo / redo.
 *
 * 🔴 SVG, `↶`/`↷` nahi. Wo haroof har font mein hote hi nahi — Windows par khali dabba
 * dikhta tha, yani do sab se ahem button be-nishan reh gaye the.
 */
export function UndoIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 9h10.5a4.5 4.5 0 0 1 0 9H9"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 5.5 4 9l3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RedoIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 9H9.5a4.5 4.5 0 0 0 0 9H15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 5.5 20 9l-3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Template — ek canvas jis par cheezein rakhi hui hain. */
export function TemplateIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect
        x="3.5"
        y="2.5"
        width="17"
        height="19"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect x="6.5" y="5.5" width="6" height="3" rx="1.5" fill="currentColor" />
      <path
        d="M6.5 14h11M6.5 17.5h7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function ListIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M8 6h12M8 12h12M8 18h12"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="4" cy="6" r="1.4" fill="currentColor" />
      <circle cx="4" cy="12" r="1.4" fill="currentColor" />
      <circle cx="4" cy="18" r="1.4" fill="currentColor" />
    </svg>
  )
}

export function LogoutIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M20 12H10m10 0-3-3m3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PinIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.4" fill="currentColor" />
    </svg>
  )
}

/** Team — do log. */
export function UsersIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16 6.2a3 3 0 0 1 0 5.6M17.5 14.8c1.8.6 3 2.4 3 4.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Paisa — note aur sikka. */
export function MoneyIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.8" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 9.5v5M18 9.5v5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/* ---------------------------------------------------------------- template editor
 *
 * 🔴 SVG, Unicode glyph nahi — aur ye ek pehle se seekha hua sabaq hai.
 *
 * Editor ke saare nishan `▤ ◆ ⬆ ☰ ⚙ ⋯ ⤢ ✎` jaise haroof the. Do masle: (1) ye haroof
 * har font mein hote hi nahi, aur jis system par na hon wahan khali dabba dikhta hai —
 * bilkul wohi jo `↶`/`↷` ke saath Windows par hua tha; (2) jahan hote bhi hain wahan
 * har ek ka apna wazan aur naap hota hai, is liye qatar mein rakh kar wo bhare hue,
 * halke, chhote, bare — sab mila jula lagta hai. Baqi poori app asli icons par hai;
 * sirf editor haroof par tha, aur wohi wajah thi ke wo "sasta" lagta tha.
 */

export function TextIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M5 6.5V5h14v1.5M12 5v14M9 19h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ShapesIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="12" y="12" width="8.5" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function UploadIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 16V4m0 0L8 8m4-4 4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function LayersIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m4 12 8 4.2 8-4.2M4 16.5l8 4.2 8-4.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function GearIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8m15-6.2-1.7 1.7M7.9 16.1l-1.7 1.7m0-12 1.7 1.7m8.2 8.7 1.7 1.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Likhai ka rang — `A` aur us ke neeche rang ki patti (Canva ka pehchana hua nishan). */
export function TextColourIcon({ className = 'h-5 w-5', style }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path
        d="M5.5 15 10 5h1.6l4.6 10M7.4 12h7.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="4" y="18" width="16" height="3" rx="1.5" fill="currentColor" />
    </svg>
  )
}

/** Peechay ka rang — bhara hua dabba. */
export function FillIcon({ className = 'h-5 w-5', style }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <rect x="3" y="7.5" width="18" height="9" rx="4.5" fill="currentColor" opacity="0.25" />
      <rect x="3" y="7.5" width="18" height="9" rx="4.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function FontIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 18 8 6h1.4l5 12M4.8 14h6.9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 18 18.6 10h1l3.1 8m-6.1-2.6h4.2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SizeIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 10V4h6M20 14v6h-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 4l6.5 6.5M20 20l-6.5-6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

export function AlignIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="4" y="6" width="16" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="7" y="14" width="10" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function MoreIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
    </svg>
  )
}

export function TrashIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4.5 6.5h15M9.5 6.5V4.8A1.3 1.3 0 0 1 10.8 3.5h2.4a1.3 1.3 0 0 1 1.3 1.3v1.7M6.5 6.5l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ArrowUpIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 20V5m0 0-6 6m6-6 6 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ArrowDownIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 4v15m0 0 6-6m-6 6-6-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ExpandIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 4H4v5M15 20h5v-5M20 9V4h-5M4 15v5h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ShrinkIcon({ className = 'h-5 w-5' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 9h5V4m11 5h-5V4M4 15h5v5m11-5h-5v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Kinare par lagana — teenon nishan ek doosre se SAAF alag hone chahiyen.
 *
 * Ek hi shakl ko ghuma dene se (misal `▤ ▥ ▦`) nishan qatar mein bilkul ek jaise lagte
 * hain aur banda teenon ko tap kar ke dekhta hai ke kaun sa kya karta hai. Yahan har
 * nishan mein lakeer wahin hai jahan cheez jayegi, aur pattiyan usi taraf simti hui.
 */
export function AlignStartIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 3v18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7.5" y="6" width="12" height="4" rx="1.5" fill="currentColor" />
      <rect x="7.5" y="14" width="7" height="4" rx="1.5" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

export function AlignCentreIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="3" y="6" width="18" height="4" rx="1.5" fill="currentColor" />
      <rect x="6.5" y="14" width="11" height="4" rx="1.5" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

export function AlignEndIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M20 3v18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4.5" y="6" width="12" height="4" rx="1.5" fill="currentColor" />
      <rect x="9.5" y="14" width="7" height="4" rx="1.5" fill="currentColor" opacity="0.45" />
    </svg>
  )
}

/** Likhai ke peechay / oopar — do parat, aur bhari hui parat batati hai kaun aage hai. */
export function SendBehindIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="12" height="12" rx="2" fill="currentColor" opacity="0.3" />
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

export function BringFrontIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3.5" y="3.5" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="8.5" y="8.5" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  )
}

/** Naap chhota / bara — `A−` aur `A+` ki jagah, taake har button ka wazan ek jaisa rahe. */
export function TextSmallerIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 18 7.5 8h1.2L13 18M4.6 14.6h6.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 13h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export function TextBiggerIcon({ className = 'h-4 w-4' }: Props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 18 7.5 8h1.2L13 18M4.6 14.6h6.8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16 13h5M18.5 10.5v5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}
