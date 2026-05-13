/**
 * ============================================================
 * PROFILE — Account & Settings
 * Route: /profile
 *
 * Renders a small "about you" card and a logout action.
 * Server component fetches the profile row; logout is a client
 * island because it needs to call the browser supabase client
 * (so the auth cookie is cleared in the user's session storage)
 * and then push to /login.
 * ============================================================
 */
import { redirect } from 'next/navigation'
import { Mail, Phone, Home as HomeIcon, BadgeCheck } from 'lucide-react'
import { createServerClient } from '@/lib/supabase/server'
import LogoutButton from './LogoutButton'

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

  const name = profile?.full_name ?? 'Resident'
  const initials = name
    .split(' ')
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <main className="min-h-screen bg-neutral-50 pb-24">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 px-5 pt-6 pb-4">
        <h1 className="text-2xl font-semibold text-neutral-900">Profile</h1>
        <p className="text-xs text-neutral-500 mt-0.5">Your account details</p>
      </header>

      {/* Identity card */}
      <section className="px-5 mt-5">
        <div className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-5">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-lg text-neutral-900 truncate">{name}</p>
              {profile?.flat_number && (
                <p className="text-xs text-neutral-500 mt-0.5">Flat {profile.flat_number}</p>
              )}
            </div>
          </div>

          {/* Detail rows */}
          <ul className="mt-5 divide-y divide-neutral-100 border-t border-neutral-100">
            <DetailRow
              icon={Mail}
              label="Email"
              value={user.email ?? '—'}
            />
            <DetailRow
              icon={Phone}
              label="Phone"
              value={profile?.phone ?? 'Not added'}
            />
            <DetailRow
              icon={HomeIcon}
              label="Flat"
              value={profile?.flat_number ?? 'Not added'}
            />
            <DetailRow
              icon={BadgeCheck}
              label="Account"
              value="Verified resident"
            />
          </ul>
        </div>
      </section>

      {/* Logout */}
      <section className="px-5 mt-6">
        <LogoutButton />
      </section>

      <p className="mt-6 text-center text-[11px] text-neutral-400">
        Society Helper · v1.0
      </p>
    </main>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="h-8 w-8 rounded-lg bg-neutral-100 text-neutral-600 flex items-center justify-center">
        <Icon size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-neutral-400">{label}</p>
        <p className="text-sm text-neutral-900 truncate">{value}</p>
      </div>
    </li>
  )
}
