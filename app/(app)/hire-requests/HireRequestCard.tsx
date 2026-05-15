'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { XCircle, Loader2, IndianRupee, MessageCircle, Home } from 'lucide-react'
import type { HireRequest } from './page'

export default function HireRequestCard({
  request, workerId, resolved = false,
}: {
  request: HireRequest
  workerId: string
  resolved?: boolean
}) {
  const router   = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState<'chat' | 'decline' | null>(null)

  const initials = (request.resident?.full_name ?? 'R')
    .split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  async function handleChat() {
    setLoading('chat')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(null); return }

    // Open or create conversation linked to this hire request
    const { data: conv } = await supabase.from('conversations')
      .upsert({
        resident_id:     request.resident!.id,
        worker_id:       workerId,
        hire_request_id: request.id,
      }, { onConflict: 'resident_id,worker_id' })
      .select().single()

    setLoading(null)
    if (conv) router.push(`/chat/${conv.id}`)
    else router.push('/chat')
  }

  async function handleDecline() {
    setLoading('decline')
    await supabase.from('hire_requests')
      .update({ status: 'declined', resolved_at: new Date().toISOString() })
      .eq('id', request.id)
    setLoading(null)
    router.refresh()
  }

  const statusMap: Record<string, { label: string; cls: string }> = {
    pending:  { label: 'Pending',  cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    accepted: { label: 'Accepted', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    declined: { label: 'Declined', cls: 'bg-red-50 text-red-600 border-red-200' },
    cancelled:{ label: 'Cancelled',cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  }
  const s = statusMap[request.status] ?? statusMap['pending']

  return (
    <li className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-base font-black shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-slate-900 text-[15px] truncate">
              {request.resident?.full_name ?? 'Resident'}
            </p>
            {resolved && (
              <span className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
            )}
          </div>
          {request.resident?.flat_number && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
              <Home size={11} /> Flat {request.resident.flat_number}
            </p>
          )}
          {request.offered_salary && (
            <p className="text-xs font-bold text-slate-700 mt-0.5 flex items-center gap-0.5">
              <IndianRupee size={11} />{request.offered_salary.toLocaleString('en-IN')}/month offered
            </p>
          )}
        </div>
      </div>

      {request.message && (
        <div className="mb-3 rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
          <p className="text-xs text-slate-600 leading-relaxed">"{request.message}"</p>
        </div>
      )}

      {!resolved && (
        <div className="flex gap-2">
          <button onClick={handleDecline} disabled={!!loading}
            className="flex-1 h-11 rounded-2xl border-2 border-slate-200 text-slate-600 text-sm font-bold flex items-center justify-center gap-1.5 active:scale-95 transition disabled:opacity-40">
            {loading === 'decline' ? <Loader2 size={15} className="animate-spin" /> : <><XCircle size={15} /> Decline</>}
          </button>
          <button onClick={handleChat} disabled={!!loading}
            className="flex-1 h-11 rounded-2xl bg-violet-600 text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-violet-100 active:scale-95 transition disabled:opacity-40">
            {loading === 'chat' ? <Loader2 size={15} className="animate-spin" /> : <><MessageCircle size={15} /> Chat</>}
          </button>
        </div>
      )}
    </li>
  )
}
