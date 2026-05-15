/**
 * /profile/edit — Resident profile editor.
 * No logout/delete here — those live on /profile (Account tab).
 * Saving redirects back to /profile.
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import ResidentEditForm from './ResidentEditForm'

export const dynamic = 'force-dynamic'

export default async function ResidentEditPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, flat_number, phone, upi_id, bio, society_id')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'worker') redirect('/worker-profile')

  const { data: allSocieties } = await supabase
    .from('societies').select('id, name').order('name')

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

      <section className="px-5 mt-5">
        <ResidentEditForm
          initialData={{
            full_name:   profile?.full_name   ?? null,
            flat_number: profile?.flat_number ?? null,
            phone:       profile?.phone       ?? null,
            upi_id:      profile?.upi_id      ?? null,
            bio:         profile?.bio         ?? null,
            society_id:  profile?.society_id  ?? null,
          }}
          allSocieties={allSocieties ?? []}
        />
      </section>
    </main>
  )
}
