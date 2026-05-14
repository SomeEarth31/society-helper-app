'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Loader2 } from 'lucide-react'

export default function DeleteAccountButton() {
  const router = useRouter()
  const supabase = createClient()

  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    setLoading(true)
    const { error } = await supabase.rpc('delete_own_account')
    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }
    await supabase.auth.signOut()
    router.replace('/login')
    router.refresh()
  }

  if (showConfirm) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 space-y-3">
        <p className="text-sm font-semibold text-rose-800">Are you sure?</p>
        <p className="text-xs text-rose-700">
          This will permanently delete your account and all your data. This cannot be undone.
        </p>
        {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
          <button
            onClick={() => { setShowConfirm(false); setError(null) }}
            disabled={loading}
            className="flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
    >
      <Trash2 size={14} />
      Delete account
    </button>
  )
}
