/**
 * /auth/callback — exchanges Supabase auth code for a session.
 * Used by: password-reset link, email confirm links.
 */
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = createServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // On error, send back to login
  return NextResponse.redirect(`${origin}/login?error=link_expired`)
}
