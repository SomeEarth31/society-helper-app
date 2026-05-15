'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Check, Loader2 } from 'lucide-react'

export default function ResidentProfileForm({
  initialData,
}: {
  initialData: {
    full_name: string | null
    flat_number: string | null
    phone: string | null
    upi_id: string | null
  }
}) {
  const supabase = createClient()
  const router   = useRouter()

  const [fullName,    setFullName]    = useState(initialData.full_name    ?? '')
  const [flatNumber,  setFlatNumber]  = useState(initialData.flat_number  ?? '')
  const [upiId,       setUpiId]       = useState(initialData.upi_id       ?? '')
  const [saving,      setSaving]      = useState(false)
  const [ok,          setOk]          = useState(false)
  const [err,         setErr]         = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setOk(false); setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name:   fullName   || null,
        flat_number: flatNumber || null,
        upi_id:      upiId      || null,
      })
      .eq('id', user.id)

    setSaving(false)
    if (error) { setErr(error.message); return }
    setOk(true)
    router.refresh()
  }

  return (
    <form onSubmit={handleSave} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Edit Profile</p>

      <Field label="Full Name">
        <input
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="Your full name"
          className={inputCls}
        />
      </Field>

      <Field label="Flat Number">
        <input
          value={flatNumber}
          onChange={e => setFlatNumber(e.target.value)}
          placeholder="e.g. A-204"
          className={inputCls}
        />
      </Field>

      <Field label="UPI ID">
        <input
          value={upiId}
          onChange={e => setUpiId(e.target.value)}
          placeholder="yourname@okhdfc"
          className={inputCls}
        />
      </Field>

      <Field label="Phone (read-only)">
        <input
          value={initialData.phone ?? ''}
          disabled
          className={`${inputCls} opacity-50 cursor-not-allowed`}
        />
      </Field>

      {err && (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{err}</p>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-12 rounded-2xl bg-violet-600 text-white font-bold text-sm shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : 'Save Changes'}
        </button>
        {ok && (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
            <Check size={14} /> Saved
          </span>
        )}
      </div>
    </form>
  )
}

const inputCls =
  'w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-500 focus:bg-white transition'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-500">{label}</span>
      {children}
    </label>
  )
}
