/**
 * Browser-side Supabase client.
 * Use inside `'use client'` components for realtime, file uploads, etc.
 */
'use client'
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
