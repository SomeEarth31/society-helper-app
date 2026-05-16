'use server'
/**
 * ============================================================
 * Server actions for the engagement detail page.
 *
 * Two mutations live here:
 *   1. markAttendance — upsert / clear a single (engagement, date)
 *      row in the `attendance` table. Replicates the same shape
 *      AttendanceToggle uses on the dashboard, but invoked from
 *      a server action so the full-month calendar can call it
 *      without going through the browser client.
 *
 *   2. settlePayment — record a payment row with the UTR the
 *      user pasted back after their UPI app returned. We only
 *      ever flip status to 'completed' here; the initial
 *      'initiated' row is written by <PaymentButton> on the
 *      client when the UPI deep-link is launched.
 *
 * Both functions rely on RLS to scope writes to the calling
 * resident — we don't re-check society_id ourselves.
 * ============================================================
 */

import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

export type AttendanceStatus = 'present' | 'absent' | 'half_day'

/**
 * Mark or clear attendance for a single day.
 * Passing `status: null` removes the row.
 */
export async function markAttendance(
  engagementId: string,
  date: string,                     // YYYY-MM-DD
  status: AttendanceStatus | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!engagementId || !date) {
    return { ok: false, error: 'Missing engagement or date' }
  }

  const supabase = createServerClient()

  // Auth belt-and-braces — middleware should already enforce this.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  if (status === null) {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('engagement_id', engagementId)
      .eq('date', date)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('attendance')
      .upsert(
        { engagement_id: engagementId, date, status },
        { onConflict: 'engagement_id,date' }
      )
    if (error) return { ok: false, error: error.message }
  }

  // Bust both the detail view and the dashboard, which both show MTD counts.
  revalidatePath(`/engagement/${engagementId}`)
  revalidatePath('/')
  return { ok: true }
}

/**
 * Record a completed settlement.
 * Inserts a new row if the user is reporting an out-of-band payment, or
 * updates the most recent 'initiated' row for this engagement if one exists
 * (which is what PaymentButton creates before launching the UPI intent).
 */
export async function settlePayment(
  engagementId: string,
  amount: number,
  utr: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!engagementId || !utr.trim()) {
    return { ok: false, error: 'UTR is required' }
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Invalid amount' }
  }

  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  // Find the most recent 'initiated' row for this engagement — that's the
  // payment PaymentButton just kicked off. If found, attach the UTR to it.
  const { data: pending } = await supabase
    .from('payments')
    .select('id')
    .eq('engagement_id', engagementId)
    .eq('status', 'initiated')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (pending?.id) {
    const { error } = await supabase
      .from('payments')
      .update({ status: 'completed', utr: utr.trim(), amount })
      .eq('id', pending.id)
    if (error) return { ok: false, error: error.message }
  } else {
    // No initiated row — user is recording an out-of-band payment.
    // Compute current-month period and days_worked for the NOT NULL columns.
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString().slice(0, 10)
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString().slice(0, 10)

    const { data: attRows } = await supabase
      .from('attendance')
      .select('status')
      .eq('engagement_id', engagementId)
      .gte('date', periodStart)
      .lte('date', periodEnd)

    const daysWorked = (attRows ?? []).reduce((sum, r) => {
      if (r.status === 'present')  return sum + 1
      if (r.status === 'half_day') return sum + 0.5
      return sum
    }, 0)

    const nodalVpa = process.env.NEXT_PUBLIC_NODAL_VPA ?? ''

    const { error } = await supabase.from('payments').insert({
      engagement_id: engagementId,
      amount,
      utr: utr.trim(),
      status: 'completed',
      period_start: periodStart,
      period_end:   periodEnd,
      days_worked:  daysWorked,
      nodal_vpa:    nodalVpa,
    })
    if (error) return { ok: false, error: error.message }
  }

  revalidatePath(`/engagement/${engagementId}`)
  revalidatePath('/payments')
  revalidatePath('/')
  return { ok: true }
}
