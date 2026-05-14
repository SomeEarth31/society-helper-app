/**
 * PROFILE — Account & Settings
 * Route: /profile
 */
import { redirect } from 'next/navigation'
import { Mail, Phone, Home as HomeIcon, BadgeCheck } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'
import DeleteAccountButton from './DeleteAccountButton'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, flat_number, phone, role')
    .eq('id', user.id)
    .single()

  const name     = profile?.full_name ?? 'Resident'
  const initials = name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()
  const isWorker = profile?.role === 'worker'

  return (
    <main className="min-h-screen bg-slate-50 pb-24">

      {/* ── Header ── */}
      <header className="bg-white px-5 pt-14 pb-5 border-b border-slate-100">
        <h1 className="text-2xl font-black text-slate-900">Profile</h1>
        <p className="text-xs text-slate-400 mt-0.5">Your account details</p>
      </header>

      {/* ── Identity card ── */}
      <section className="px-5 mt-5">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          {/* Avatar strip */}
          <div className={`px-5 py-6 flex items-center gap-4 ${
            isWorker
              ? 'bg-gradient-to-br from-emerald-600 to-teal-500'
              : 'bg-gradient-to-br from-violet-700 to-violet-500'
          }`}>
            <div className="h-16 w-16 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center">
              <span className="text-white font-black text-xl">{initials}</span>
            </div>
            <div>
              <p className="text-white font-black text-lg leading-tight">{name}</p>
              {profile?.flat_number && (
                <p className="text-white/70 text-xs mt-0.5">Flat {profile.flat_number}</p>
              )}
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white">
                <BadgeCheck size={11} />
                {isWorker ? 'Helper' : 'Verified Resident'}
              </span>
            </div>
          </div>

          {/* Detail rows */}
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

      <p className="mt-8 text-center text-[11px] text-slate-300">
        Society Helper · v1.0
      </p>
    </main>
  )
}

function DetailRow({
  icon: Icon, label, value, last = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string; value: string; last?: boolean
}) {
  return (
    <div className={`flex items-center gap-4 px-5 py-4 ${!last ? 'border-b border-slate-100' : ''}`}>
      <div className="h-9 w-9 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0">
        <Icon size={15} className="text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{value}</p>
      </div>
    </div>
  )
}
