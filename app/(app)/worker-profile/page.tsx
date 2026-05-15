/**
 * /worker-profile — Edit worker bio, rate, payment info, societies.
 * No logout/delete here — those live on /profile (Account tab).
 * Saving redirects back to /profile.
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import WorkerProfileForm from './WorkerProfileForm'

export const dynamic = 'force-dynamic'

type WorkerSelf = {
  id: string
  full_name: string
  specialty: string
  bio: string | null
  daily_rate: number | null
  photo_url: string | null
  upi_id: string | null
  phone: string | null
  society_id: string | null
}

export default async function WorkerProfilePage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'worker') redirect('/profile')

  const { data: worker } = await supabase
    .from('workers')
    .select('id, full_name, specialty, bio, daily_rate, photo_url, upi_id, phone, society_id')
    .eq('auth_id', user.id)
    .maybeSingle<WorkerSelf>()

  const [{ data: allSocieties }, { data: workerSocietyRows }] = await Promise.all([
    supabase.from('societies').select('id, name').order('name'),
    worker
      ? supabase.from('worker_societies').select('society_id').eq('worker_id', worker.id)
      : Promise.resolve({ data: [] }),
  ])

  const currentSocietyIds = (workerSocietyRows ?? []).map((r: { society_id: string }) => r.society_id)

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      <header className="bg-white border-b border-neutral-200 px-5 pt-7 pb-5 flex items-center gap-3">
        <Link href="/profile" className="h-8 w-8 rounded-full bg-neutral-100 flex items-center justify-center">
          <ChevronLeft size={16} className="text-neutral-600" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">Edit Profile</h1>
          <p className="text-xs text-neutral-500">{user.email}</p>
        </div>
      </header>

      <section className="px-5 mt-5 space-y-5">
        <WorkerProfileForm
          worker={worker}
          allSocieties={allSocieties ?? []}
          currentSocietyIds={currentSocietyIds}
        />
      </section>
    </main>
  )
}
