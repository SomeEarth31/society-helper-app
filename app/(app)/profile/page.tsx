/**
 * /profile — Account tab (identity, settings, logout, delete)
 * Edit profile links to /profile/edit (resident) or /worker-profile (worker)
 */
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Mail, Phone, ShieldCheck, UserCog, BadgeCheck, Pencil, Star } from 'lucide-react'
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
    .from('profiles')
    .select('full_name, flat_number, phone, role, upi_id, trust_score, society_id, resident_reviews(count), societies(name)')
    .eq('id', user.id)
    .single()

  const isWorker = profile?.role === 'worker'
  const name     = profile?.full_name ?? (isWorker ? 'Worker' : 'Resident')
  const initials = name.split(' ').map((s: string) => s[0]).slice(0, 2).join('').toUpperCase()

  let workerRow: { id: string; is_available: boolean; trust_score: number | null } | null = null
  let workerReviewCount = 0
  if (isWorker) {
    const { data } = await supabase
      .from('workers')
      .select('id, is_available, trust_score, reviews(count)')
      .eq('auth_id', user.id)
      .maybeSingle()
    workerRow = data ? { id: data.id, is_available: data.is_available, trust_score: data.trust_score } : null
    workerReviewCount = (data as any)?.reviews?.[0]?.count ?? 0
  }
  const residentReviewCount = (profile as any)?.resident_reviews?.[0]?.count ?? 0

  return (
    <main className="min-h-screen bg-slate-50 pb-28">
      <header className="bg-white px-5 pt-14 pb-5 border-b border-slate-100">
        <h1 className="text-2xl font-black text-slate-900">Account</h1>
        <p className="text-xs text-slate-400 mt-0.5">Your profile and settings</p>
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
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-lg leading-tight truncate">{name}</p>
              {(profile?.flat_number || (profile as any)?.societies?.name) && (
                <p className="text-white/70 text-xs mt-0.5">
                  {profile?.flat_number ? `Flat ${profile.flat_number}` : ''}
                  {profile?.flat_number && (profile as any)?.societies?.name ? ' · ' : ''}
                  {(profile as any)?.societies?.name ?? ''}
                </p>
              )}
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold text-white">
                <BadgeCheck size={11} />
                {isWorker ? 'Helper' : 'Verified Resident'}
              </span>
            </div>
          </div>
          <DetailRow icon={Mail}  label="Email" value={user.email ?? '—'} />
          <DetailRow icon={Phone} label="Phone" value={profile?.phone ?? 'Not added'} last />
        </div>
      </section>

      {/* Rating card */}
      <section className="px-5 mt-4">
        <div className={`rounded-3xl border px-5 py-4 shadow-sm flex items-center gap-4 ${
          isWorker ? 'bg-white border-slate-100' : 'bg-white border-slate-100'
        }`}>
          <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 ${
            isWorker ? 'bg-emerald-50' : 'bg-amber-50'
          }`}>
            <Star size={20} className={isWorker ? 'text-emerald-600 fill-emerald-400' : 'text-amber-500 fill-amber-400'} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Your Rating</p>
            {(() => {
              const score = isWorker ? workerRow?.trust_score : (profile as any)?.trust_score
              const count = isWorker ? workerReviewCount : residentReviewCount
              if (score == null || count === 0) {
                return <p className="text-sm font-bold text-slate-400 mt-0.5">Unrated</p>
              }
              return (
                <p className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-1">
                  <Star size={13} className="fill-amber-400 text-amber-400" />
                  {score.toFixed(1)}
                  <span className="text-slate-400 font-normal text-xs">({count} {count === 1 ? 'review' : 'reviews'})</span>
                </p>
              )
            })()}
          </div>
        </div>
      </section>

      {/* Edit profile link */}
      <section className="px-5 mt-4">
        <Link
          href={isWorker ? '/worker-profile' : '/profile/edit'}
          className={`flex items-center gap-3 rounded-3xl border px-5 py-4 shadow-sm active:opacity-80 transition min-h-[64px] ${
            isWorker
              ? 'bg-emerald-50 border-emerald-100'
              : 'bg-violet-50 border-violet-100'
          }`}
        >
          <div className={`h-9 w-9 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-sm`}>
            {isWorker
              ? <UserCog size={16} className="text-emerald-600" />
              : <Pencil size={16} className="text-violet-600" />
            }
          </div>
          <div>
            <p className={`font-bold text-[14px] ${isWorker ? 'text-emerald-900' : 'text-violet-900'}`}>
              Edit Profile
            </p>
            <p className={`text-xs ${isWorker ? 'text-emerald-600' : 'text-violet-600'}`}>
              {isWorker ? 'Update bio, rate, societies' : 'Update name, flat, UPI'}
            </p>
          </div>
        </Link>
      </section>

      {/* Worker availability toggle */}
      {isWorker && workerRow && (
        <section className="px-5 mt-4">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm px-5 py-4">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Availability</p>
            <AvailabilityToggle workerId={workerRow.id} initialAvailable={workerRow.is_available} />
          </div>
        </section>
      )}

      {/* Settings + Danger zone */}
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
  icon: React.ElementType
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
