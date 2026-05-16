'use client'
/**
 * HireForm — resident fills specialty, message + offered salary, submits hire_request.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { IndianRupee, Send, CheckCircle2, Loader2 } from 'lucide-react'

const SPECIALTIES = [
  { value: 'cook',       label: 'Cook' },
  { value: 'cleaner',    label: 'Cleaner' },
  { value: 'car_washer', label: 'Car Washer' },
  { value: 'caretaker',  label: 'Caretaker' },
  { value: 'gardener',   label: 'Gardener' },
  { value: 'maid',       label: 'Maid' },
  { value: 'other',      label: 'Other' },
]

export default function HireForm({
  workerId,
  workerName,
  workerSpecialty,
  isAvailable,
  existingRequestId,
}: {
  workerId: string
  workerName: string
  workerSpecialty: string
  isAvailable: boolean
  existingRequestId: string | null
}) {
  const router   = useRouter()
  const supabase = createClient()

  const [specialty,     setSpecialty]     = useState(workerSpecialty || 'other')
  const [message,       setMessage]       = useState('')
  const [offeredSalary, setOfferedSalary] = useState('')
  const [submitting,    setSubmitting]    = useState(false)
  const [sent,          setSent]          = useState(!!existingRequestId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim() || submitting) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    const salary = offeredSalary ? parseInt(offeredSalary, 10) : null

    await supabase.from('hire_requests').insert({
      resident_id:    user.id,
      worker_id:      workerId,
      message:        message.trim(),
      offered_salary: isNaN(salary as number) ? null : salary,
      specialty:      specialty,
      status:         'pending',
    })

    setSubmitting(false)
    setSent(true)
    router.refresh()
  }

  if (!isAvailable) {
    return (
      <div className="rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 p-8 text-center">
        <p className="font-black text-slate-500">Not available right now</p>
        <p className="text-xs text-slate-400 mt-1">{workerName} is not accepting new hire requests at the moment.</p>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="rounded-3xl bg-emerald-50 border border-emerald-200 p-8 text-center">
        <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
        <p className="font-black text-slate-800">Request sent!</p>
        <p className="text-sm text-slate-500 mt-1">
          {workerName} will see your request and can chat or decline from their hire requests page.
        </p>
        <button
          onClick={() => router.push('/directory')}
          className="mt-5 text-sm font-bold text-violet-600 underline"
        >
          Back to directory
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
        <h2 className="font-black text-slate-900">Send a hire request</h2>
        <p className="text-xs text-slate-400 -mt-2">
          Tell {workerName} what you need and what you&apos;re offering.
        </p>

        {/* Specialty selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Role / Specialty <span className="text-red-400">*</span>
          </label>
          <select
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            required
            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none focus:border-violet-500 focus:bg-white transition appearance-none"
          >
            {SPECIALTIES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Message <span className="text-red-400">*</span>
          </label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={`Hi ${workerName.split(' ')[0]}, I'm looking for help with...`}
            rows={4}
            required
            className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none focus:border-violet-500 focus:bg-white transition resize-none"
          />
        </div>

        {/* Offered salary */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Offered monthly salary (optional)
          </label>
          <div className="relative">
            <IndianRupee size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="number"
              value={offeredSalary}
              onChange={e => setOfferedSalary(e.target.value)}
              placeholder="e.g. 8000"
              min={0}
              className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 pl-10 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none focus:border-violet-500 focus:bg-white transition"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={!message.trim() || submitting}
        className="w-full h-14 rounded-2xl bg-violet-600 text-white font-bold text-[15px] flex items-center justify-center gap-2 shadow-lg shadow-violet-200 active:scale-[0.97] transition disabled:opacity-40"
      >
        {submitting
          ? <Loader2 size={18} className="animate-spin" />
          : <><Send size={16} /> Send Hire Request</>}
      </button>
    </form>
  )
}
