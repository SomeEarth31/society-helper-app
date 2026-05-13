/**
 * UPI Intent Deep-Link builder.
 *
 * Reference: NPCI's UPI Linking Specification (the `upi://pay` scheme).
 * Format:    upi://pay?pa=<VPA>&pn=<Name>&am=<Amount>&cu=INR&tn=<Note>&tr=<TxnRef>
 *
 * Why this matters for our MVP:
 *   - Works with every UPI app (GPay, PhonePe, Paytm, BHIM, etc.)
 *   - Zero merchant onboarding, zero gateway fees
 *   - User taps → their UPI app opens with everything pre-filled
 *   - We do NOT need a payment gateway license (we're not the merchant —
 *     the resident pays our NODAL VPA, we settle to the worker manually)
 *
 * Caveats:
 *   - We can't confirm the payment from the deep link itself. Post-payment
 *     we ask the user to paste the UTR (txn reference) into the app, which
 *     we store on the `payments` row. Reconcile against bank statement.
 *   - Some UPI apps strip the `am` (amount) if it doesn't match the QR
 *     spec exactly — always pass a 2-decimal string, not a float.
 */

export interface UpiIntentParams {
  /** Payee VPA, e.g. "samarth@upi" */
  pa: string
  /** Payee display name shown by the UPI app */
  pn: string
  /** Amount in INR, will be coerced to 2-decimal string */
  am: number
  /** Transaction note (visible to payer & in their statement) */
  tn?: string
  /** Optional internal txn reference (we generate one per `payments` row) */
  tr?: string
  /** Currency — always INR for now */
  cu?: 'INR'
}

export function buildUpiIntent(p: UpiIntentParams): string {
  const params = new URLSearchParams()
  params.set('pa', p.pa)
  params.set('pn', p.pn)
  params.set('am', p.am.toFixed(2))
  params.set('cu', p.cu ?? 'INR')
  if (p.tn) params.set('tn', p.tn)
  if (p.tr) params.set('tr', p.tr)
  // URLSearchParams uses '+' for spaces — UPI apps want %20. Manual fix:
  return `upi://pay?${params.toString().replace(/\+/g, '%20')}`
}

/** Generate a deterministic-ish txn ref, ≤ 35 chars (UPI limit). */
export function generateTxnRef(prefix = 'SH'): string {
  const stamp = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${prefix}${stamp}${rand}`
}

/**
 * Compute settlement amount from days worked.
 * Pro-rated by working days in the month so partial months don't shortchange anyone.
 */
export function computeDues(
  monthlySalary: number,
  daysWorked: number,
  daysInMonth: number
): number {
  if (daysInMonth <= 0) return 0
  return Math.round((monthlySalary * daysWorked) / daysInMonth)
}
