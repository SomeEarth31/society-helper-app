/**
 * PROFILE — Account & Settings
 * Route: /profile
 */
import { redirect } from 'next/navigation'
import { Mail, Phone, Home as HomeIcon, BadgeCheck, ChevronRight } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'
import DeleteAccountButton from './DeleteAccountButton'

export const dynamic = 'force-dynamic'

type Profile = {
  full_name: string | null
  flat_number: string | null
  phone: string | null
}

export default async function ProfilePage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, flat_number, phone')
    .eq('id', user.id)
    .single<Profile>()

  const name     = profile?.full_name ?? 'Resident'
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* ── Gradient header with avatar ── */}
      <header className="bg-gradient-to-br from-violet-700 to-violet-500 px-5 pt-14 pb-16">
        <div className="flex flex-col items-center text-center">
          <div className="h-20 w-20 rounded-full bg-white/20 border-4 border-white/40 flex items-center justify-center mb-3">
            <span className="text-white font-bold text-2xl">{initials}</span>
          </div>
          <h1 className="text-xl font-bold text-white">{name}</h1>
          {profile?.flat_number && (
            <p className="text-violet-200 text-xs mt-0.5">Flat {profile.flat_number}</p>
          )}
          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold text-white">
            <BadgeCheck size={12} />
            Verified Resident
          </span>
        </div>
      </header>

      {/* ── Info card (overlaps header) ── */}
      <section className="px-5 -mt-6">
        <div className="rounded-3xl bg-white shadow-lg shadow-violet-50 border border-slate-100 overflow-hidden">
          <DetailRow icon={Mail}     label="Email"  value={user.email ?? '—'} />
          <DetailRow icon={Phone}    label="Phone"  value={profile?.phone ?? 'Not added'} />
          <DetailRow icon={HomeIcon} label="Flat"   value={profile?.flat_number ?? 'Not added'} last />
        </div>
      </section>

      {/* ── Actions ── */}
      <section className="px-5 mt-5 space-y-3">
        <LogoutButton />
        <DeleteAccountButton />
      </section>

      <p className="mt-8 text-center text-[11px] text-slate-400">
        Society Helper · v1.0
      </p>
    </main>
  )
}

function DetailRow({
  icon: Icon, label, value, last = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  last?: boolean
}) {
  return (
    <div className={`flex items-center gap-3.5 px-5 py-4 ${!last ? 'border-b border-slate-100' : ''}`}>
      <div className="h-9 w-9 rounded-2xl bg-violet-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-violet-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-900 truncate mt-0.5">{value}</p>
      </div>
      <ChevronRight size={16} className="text-slate-300 shrink-0" />
    </div>
  )
}
