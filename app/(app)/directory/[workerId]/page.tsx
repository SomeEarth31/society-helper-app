/**
 * /directory/[workerId] — Worker detail page for residents.
 * Shows worker info + a form to send a hire request.
 */
import { redirect, notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import HireForm from './HireForm'
import { ArrowLeft, Star, IndianRupee } from 'lucide-react'
import Link from 'next/link'

const SPECIALTY_EMOJI: Record<string, string> = {
  maid: '🧹', cook: '👨‍🍳', cleaner: '🫧', car_washer: '🚗',
  caretaker: '🤲', gardener: '🌿', other: '⚙️',
}

export const dynamic = 'force-dynamic'

export default async function WorkerDetailPage({
  params,
}: {
  params: { workerId: string }
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'resident') redirect('/directory')

  const { data: worker } = await supabase
    .from('workers')
    .select('id, full_name, specialty, daily_rate, trust_score, photo_url, is_available, reviews(count)')
    .eq('id', params.workerId)
    .maybeSingle()

  if (!worker) notFound()

  // Check if resident already has a pending hire request for this worker
  const { data: existing } = await supabase
    .from('hire_requests')
    .select('id, status')
    .eq('resident_id', user.id)
    .eq('worker_id', worker.id)
    .eq('status', 'pending')
    .maybeSingle()

  const initials = worker.full_name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()
  const emoji = SPECIALTY_EMOJI[worker.specialty] ?? '⚙️'
  const reviewCount = (worker as any).reviews?.[0]?.count ?? 0

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 pt-12 pb-4 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <Link
          href="/directory"
          className="h-9 w-9 flex items-center justify-center text-slate-500 active:opacity-60 shrink-0"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-black text-slate-900 text-lg">Hire Helper</h1>
      </header>

      <div className="px-5 mt-6 space-y-5">

        {/* Worker card */}
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-black shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-slate-900 text-lg">{worker.full_name}</p>
                {!worker.is_available && (
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Unavailable</span>
                )}
              </div>
              <p className="text-sm text-slate-400 capitalize mt-0.5">
                {emoji} {worker.specialty.replace(/_/g, ' ')}
              </p>
              <div className="flex items-center gap-4 mt-2">
                {worker.trust_score != null ? (
                  <span className="flex items-center gap-1 text-sm">
                    <Star size={13} className="text-amber-400 fill-amber-400" />
                    <span className="font-black text-slate-700">{worker.trust_score.toFixed(1)}</span>
                    <span className="text-slate-400 text-xs">({reviewCount} reviews)</span>
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">Unrated</span>
                )}
                {worker.daily_rate != null && (
                  <span className="flex items-center gap-0.5 text-sm text-slate-600 font-bold">
                    <IndianRupee size={13} />
                    {worker.daily_rate.toLocaleString('en-IN')}<span className="font-normal text-slate-400">/day</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hire form */}
        <HireForm
          workerId={worker.id}
          workerName={worker.full_name}
          isAvailable={worker.is_available}
          existingRequestId={existing?.id ?? null}
        />
      </div>
    </main>
  )
}
