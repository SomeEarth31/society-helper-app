/**
 * Next middleware — refreshes the Supabase session cookie on every request.
 * Without this, RSCs eventually see expired sessions and 401s start appearing.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get:    (n: string) => req.cookies.get(n)?.value,
        set:    (n: string, v: string, o: CookieOptions) => { res.cookies.set({ name: n, value: v, ...o }) },
        remove: (n: string, o: CookieOptions) => { res.cookies.set({ name: n, value: '', ...o }) },
      },
    }
  )
  await supabase.auth.getUser()
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\.(?:png|jpg|svg)).*)'],
}
