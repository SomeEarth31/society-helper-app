/**
 * /profile — Account & Settings
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, Phone, Home as HomeIcon, BadgeCheck, ShieldCheck, UserCog } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'
import DeleteAccountButton from './DeleteAccountButton'
import AvailabilityToggle from './AvailabilityToggle'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('full_name, flat_number, phone, role').eq('id', user.id).single()

  const isWorker = profile?.role === 'worker'
  const name     = profile?.full_name ?? (isWorker ? 'Worker' : 'Resident')
  const initials = name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()

  let workerRow: { id: string; is_available: boolean } | null = null
  if (isWorker) {
    const { data } = await supabase
      .from('workers').select('id, is_available').eq('auth_id', user.id).maybeSingle()
    workerRow = data
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white px-5 pt-14 pb-5 border-b border-slate-100">
        <h1 className="text-2xl font-black text-slate-900">Profile</h1>
        <p className="text-xs text-slate-400 mt-0.5">Your account details</p>
      </header>

      {/* Identity card */}
      <section className="px-5 mt-5">
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className={`px-5 py-6 flex items-center gap-4 ${
            isWorker ? 'bg-gradient-to-br from-emerald-600 to-teal-500' : 'bg-gradient-to-br from-violet-700 to-violet-500'
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
          <DetailRow icon={Mail}     label="Email" value={user.email ?? '—'} />
          <DetailRow icon={Phone}    label="Phone" value={profile?.phone ?? 'Not added'} last={isWorker} />
          
          {/* Only show Flat Number to Residents */}
          {!isWorker && (
            <DetailRow icon={HomeIcon} label="Flat" value={profile?.flat_number ?? 'Not added'} last />
          )}
        </div>
      </section>

      {/* Show Worker Profile Link ONLY to Workers */}
      {isWorker && (
        <section className="px-5 mt-4">
          <Link href="/worker-profile"
            className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-3xl px-5 py-4 shadow-sm active:bg-violet-100 transition min-h-[64px]">
            <div className="h-9 w-9 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm">
              <UserCog size={16} className="text-violet-600" />
            </div>
            <div>
              <p className="font-bold text-violet-900 text-[14px]">Edit Worker Profile</p>
              <p className="text-xs text-violet-600">Update your bio, rate, and specialties</p>
            </div>
          </Link>
        </section>
      )}

      {/* Worker availability toggle */}
      {isWorker && workerRow && (
        <section className="px-5 mt-4">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Availability</p>
            <AvailabilityToggle workerId={workerRow.id} initialAvailable={workerRow.is_available} />
          </div>
        </section>
      )}

      {/* Actions */}
      <section className="px-5 mt-4 space-y-3">
        <Link href="/change-password"
          className="flex items-center gap-3 bg-white border border-slate-100 rounded-3xl px-5 py-4 shadow-sm active:bg-slate-50 transition min-h-[64px]">
          <div className="h-9 w-9 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-amber-600" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-[14px]">Change password</p>
            <p className="text-xs text-slate-400">Update your sign-in password</p>
          </div>
        </Link>
        <LogoutButton />
        <DeleteAccountButton />
      </section>

      <p className="mt-8 text-center text-[11px] text-slate-300">Society Helper · v2.0</p>
    </main>
  )
}

function DetailRow({ icon: Icon, label, value, last = false }: {
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
