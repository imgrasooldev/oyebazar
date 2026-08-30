/**
 * Ops ke roles aur har role ka ikhtiyar — POORE system ka wahid sach.
 *
 * 🔴 Ye file do jagah chalti hai: service isi se rokti hai, aur admin ka Team safha isi
 * se jadwal banata hai. Pehle jadwal safhe par alag likhi hui thi — aisi nakal hamesha
 * kisi din asli qawaid se alag ho jati hai, aur phir UI kuch aur kehti hai jabke server
 * kuch aur karta hai.
 *
 * Darjay barhte hue: upar wale ke paas neeche walon ka sab kuch hota hai.
 */
export const OPS_ROLES = ['REVIEWER', 'COORDINATOR', 'MANAGER', 'SUPER_ADMIN'] as const

export type OpsRole = (typeof OPS_ROLES)[number]

export const OPS_ROLE_RANK: Record<OpsRole, number> = {
  REVIEWER: 1,
  COORDINATOR: 2,
  MANAGER: 3,
  SUPER_ADMIN: 4,
}

/** Har role kis kaam ke liye hai — Team safhe par yehi jumla dikhta hai. */
export const OPS_ROLE_PURPOSE: Record<OpsRole, string> = {
  REVIEWER: 'Sees everything, changes nothing — for auditors and investors',
  COORDINATOR: 'Runs the day: moves orders along',
  MANAGER: 'Approves wholesalers and stock, handles resellers and payments received',
  SUPER_ADMIN: 'Everything, including money settings and the team itself',
}

/**
 * Har ikhtiyar ke liye kam se kam kaun sa darja chahiye.
 *
 * `view` REVIEWER par hai — dekhna sab ko milta hai. Wajah: number chhupane se koi
 * hifazat nahi hoti, aur ops ka aadha kaam "dekh kar batao" hi hota hai. Badalne wale
 * har kaam ka apna darja hai.
 */
export const OPS_PERMISSIONS = {
  view: {
    needs: 'REVIEWER',
    label: 'See everything — orders, stock, resellers, money',
  },
  moveOrders: {
    needs: 'COORDINATOR',
    label: 'Move orders forward — send to wholesaler, dispatch, deliver, RTO',
  },
  manageSuppliers: {
    needs: 'MANAGER',
    label: 'Verify, list and suspend wholesalers',
  },
  manageProducts: {
    needs: 'MANAGER',
    label: 'Make products live, archive them',
  },
  /*
   * Category ka darakht MANAGER par hai.
   *
   * Ye rozana ka kaam hai — naya mausam, nayi shaakh — aur SUPER_ADMIN par rakhne ka
   * matlab hota ke har chhoti tabdeeli ke liye qatar lage. Khatra bhi mehdood hai:
   * category mitane par maal ke saath rok pehle se lagi hui hai, aur jagah badalne se
   * maal gum nahi hota, sirf jagah badalti hai.
   */
  manageCategories: {
    needs: 'MANAGER',
    label: 'Create, rename, move and reorder categories',
  },
  /*
   * Rate ki manzoori MANAGER par hai, SUPER_ADMIN par nahi — jaan boojh kar.
   *
   * Ye fee rate nahi hai (wo SUPER_ADMIN par hai aur wahin rehna chahiye). Ye ek maal
   * ka rate hai, aur aisi darkhwasten rozana aati hain: kapre ka bhao badla, dollar
   * charha. SUPER_ADMIN par rakhte to qatar lagi rehti aur dukan wala hafton intezar
   * karta — aur akhir mein koi na koi shortcut nikal leta.
   */
  approvePriceChange: {
    needs: 'MANAGER',
    label: 'Approve a wholesaler’s price change on a live product',
  },
  manageResellers: {
    needs: 'MANAGER',
    label: 'Suspend and reinstate resellers',
  },
  /*
   * Aaj ka drop banana COORDINATOR par hai.
   *
   * Ye din ka pehla kaam hai aur subah 9 baje se pehle hona chahiye — MANAGER par
   * rakhne ka matlab hota ke jis din manager der se aaye, us din poore platform ki
   * resellers ke paas lagane ko kuch naya hi na ho. Khatra kam hai: drop khud maal
   * nahi badalta, sirf aaj ki paanch cheezein chunta hai, aur roz naya ban jata hai.
   */
  buildDailyDrop: {
    needs: 'COORDINATOR',
    label: 'Build today’s drop — the 5 items that go out at 9am',
  },
  markInvoicePaid: {
    needs: 'MANAGER',
    label: 'Mark an invoice as paid',
  },
  /*
   * Bonus dena — MANAGER par, aur `markInvoicePaid` ke saath.
   *
   * 🔴 Ye alag ijazat is liye hai ke ye alag SIMT ka paisa hai. `markInvoicePaid`
   * wo paisa hai jo hamare paas AAYA (dukan ne fee di); bonus wo hai jo hamare paas se
   * JATA hai. Dono ek hi naam par rakhne ka matlab ye hota ke jis bande ko "wasooli
   * likhna" ka kaam diya gaya wo chup chaap "paisa dena" bhi kar sakta — aur ye do
   * bilkul alag darje ke ikhtiyar hain, chahe dono MANAGER par hi kyun na hon.
   *
   * MANAGER par (SUPER_ADMIN par nahi) kyunke ye rozana ka kaam hai aur raqam chhoti
   * hai: pachas ya sau rupay. SUPER_ADMIN par rakhne ka matlab hota ke har hafte ki
   * fehrist malik ke intezar mein khari rehti — aur wohi wo soorat hai jahan reseller
   * ka bharosa jata hai, us raqam par nahi jo choti hai, us DER par jo lambi hai.
   */
  payBonus: {
    needs: 'MANAGER',
    label: 'Pay a reseller bonus',
  },
  setFeeRate: {
    needs: 'SUPER_ADMIN',
    label: 'Change a wholesaler’s fee rate',
  },
  generateInvoices: {
    needs: 'SUPER_ADMIN',
    label: 'Generate monthly invoices',
  },
  manageTeam: {
    needs: 'SUPER_ADMIN',
    label: 'Add team members, change roles, disable access',
  },
} as const satisfies Record<string, { needs: OpsRole; label: string }>

export type OpsPermission = keyof typeof OPS_PERMISSIONS

export function canDo(role: OpsRole, permission: OpsPermission): boolean {
  return OPS_ROLE_RANK[role] >= OPS_ROLE_RANK[OPS_PERMISSIONS[permission].needs]
}
