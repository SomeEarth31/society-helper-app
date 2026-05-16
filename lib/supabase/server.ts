/**
 * Server-side Supabase client.
 * Use inside React Server Components, Server Actions, and Route Handlers.
 * Reads/writes the session cookie so RLS picks up the right auth.uid().
 */
import { createServerClient as _create, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()

  return _create(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          try { cookieStore.set({ name, value, ...options }) } catch { /* RSC read-only */ }
        },
        remove: (name: string, options: CookieOptions) => {
          try { cookieStore.set({ name, value: '', ...options }) } catch { /* RSC read-only */ }
        },
      },
    }
  )
}
