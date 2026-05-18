/**
 * /hire-requests — Worker sees incoming hire requests from residents.
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { Briefcase, Clock } from 'lucide-react'
import HireRequestCard from './HireRequestCard'

export const dynamic = 'force-dynamic'

export type HireRequest = {
  id: string
  resident_id: string
  message: string | null
  offered_salary: number | null
  specialty: string | null
  status: string
  created_at: string
  resident: {
    id: string
    full_name: string | null
    flat_number: string | null
    society: { name: string } | null
  } | null
}

export default async function HireRequestsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'worker') redirect('/')

  const { data: workerRow } = await supabase
    .from('workers').select('id').eq('auth_id', user.id).maybeSingle()

  const { data: requests } = await supabase
    .from('hire_requests')
    .select(`
      id, resident_id, message, offered_salary, specialty, status, created_at,
      resident:profiles!hire_requests_resident_id_fkey(id, full_name, flat_number, society:societies(name))
    `)
    .eq('worker_id', workerRow?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('created_at', { ascending: false })
    .returns<HireRequest[]>()

  const pending  = (requests ?? []).filter(r => r.status === 'pending')
  const resolved = (requests ?? []).filter(r => r.status !== 'pending')

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white px-5 pt-14 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <h1 className="text-2xl font-black text-slate-900">Hire Requests</h1>
        <p className="text-xs text-slate-400 mt-0.5">Residents who want to hire you</p>
      </header>

      <div className="px-5 mt-5 space-y-6">

        {pending.length > 0 && (
          <section>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Pending ({pending.length})
            </p>
            <ul className="space-y-3">
              {pending.map(req => (
                <HireRequestCard key={req.id} request={req} workerId={workerRow?.id ?? ''} />
              ))}
            </ul>
          </section>
        )}

        {pending.length === 0 && resolved.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
            <Briefcase size={28} className="text-slate-300 mx-auto mb-3" />
            <p className="font-black text-slate-500">No hire requests yet</p>
            <p className="text-xs text-slate-400 mt-1">When a resident wants to hire you, it'll appear here</p>
          </div>
        )}

        {resolved.length > 0 && (
          <section>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Past requests</p>
            <ul className="space-y-3">
              {resolved.map(req => (
                <HireRequestCard key={req.id} request={req} workerId={workerRow?.id ?? ''} resolved />
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  )
}
