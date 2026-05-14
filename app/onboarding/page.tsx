/**
 * Onboarding — first-time signup completion.
 * Route: /onboarding
 *
 * Reached when a user authenticates (typically via OTP) but
 * profiles.full_name is still null. Collects:
 *   • role (resident | worker)
 *   • full name, phone
 *   • flat number (residents) OR specialty (workers)
 *   • password (so they can log in without OTP next time)
 *
 * On submit it (1) updates profiles, (2) sets a password on
 * auth.users, (3) creates/links the workers row if applicable.
 */
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import OnboardingForm from './OnboardingForm'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, society_id')
    .eq('id', user.id)
    .single()

  // Already onboarded → bounce to dashboard.
  if (profile?.full_name) redirect('/')

  // Pick a default society — first one available — so workers/residents land somewhere sane.
  const { data: societies } = await supabase
    .from('societies')
    .select('id, name')
    .order('name')
    .limit(20)

  return (
    <OnboardingForm
      userEmail={user.email ?? ''}
      societies={societies ?? []}
      defaultSocietyId={profile?.society_id ?? societies?.[0]?.id ?? null}
    />
  )
}
