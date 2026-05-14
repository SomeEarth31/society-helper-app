/**
 * DIRECTORY — Browse all workers
 * Route: /directory
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import WorkerList from './WorkerList'

export const dynamic = 'force-dynamic'

export type WorkerRow = {
  id: string
  full_name: string
  specialty: string
  daily_rate: number | null
  trust_score: number
  photo_url: string | null
  phone: string | null
}

export default async function DirectoryPage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('society_id')
    .eq('id', user.id)
    .single()

  let query = supabase
    .from('workers')
    .select('id, full_name, specialty, daily_rate, trust_score, photo_url, phone')
    .order('trust_score', { ascending: false })

  if (profile?.society_id) {
    query = query.eq('society_id', profile.society_id)
  }

  const { data: workers } = await query.returns<WorkerRow[]>()

  return (
    <main className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-5 pt-14 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Directory</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {workers?.length ?? 0} helpers near you
        </p>
      </header>

      <section className="px-5 mt-5">
        <WorkerList workers={workers ?? []} />
      </section>
    </main>
  )
}
