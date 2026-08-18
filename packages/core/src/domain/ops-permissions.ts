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
  manageResellers: {
    needs: 'MANAGER',
    label: 'Suspend and reinstate resellers',
  },
  markInvoicePaid: {
    needs: 'MANAGER',
    label: 'Mark an invoice as paid',
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
