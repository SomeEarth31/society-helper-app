'use client'
/**
 * /jobs/new — Resident posts a new job opening
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'

type Specialty = 'cook' | 'cleaner' | 'car_washer' | 'caretaker' | 'gardener' | 'maid' | 'other'

const SPECIALTIES: { key: Specialty; label: string; emoji: string }[] = [
  { key: 'maid',       label: 'Maid',       emoji: '🧹' },
  { key: 'cook',       label: 'Cook',       emoji: '👨‍🍳' },
  { key: 'cleaner',    label: 'Cleaner',    emoji: '🫧' },
  { key: 'car_washer', label: 'Car Wash',   emoji: '🚗' },
  { key: 'caretaker',  label: 'Caretaker',  emoji: '🤲' },
  { key: 'gardener',   label: 'Gardener',   emoji: '🌿' },
  { key: 'other',      label: 'Other',      emoji: '⚙️' },
]

export default function PostJobPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [specialty, setSpecialty] = useState<Specialty>('maid')
  const [title, setTitle]         = useState('')
  const [description, setDesc]    = useState('')
  const [schedule, setSchedule]   = useState('')
  const [salary, setSalary]       = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !description) { setError('Title and description are required.'); return }
    setError(null); setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('society_id').eq('id', user.id).single()

    const { error } = await supabase.from('job_postings').insert({
      employer_id: user.id,
      society_id: profile?.society_id ?? null,
      specialty,
      title: title.trim(),
      description: description.trim(),
      schedule: schedule.trim() || null,
      offered_salary: salary ? parseFloat(salary) : null,
      status: 'open',
    })

    // After your supabase.from('job_postings').insert() call succeeds:
    router.push('/'); // Or '/directory', wherever your jobs feed is
    router.refresh();

    setLoading(false)
    if (error) { setError(error.message); return }
    router.replace('/jobs')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">

      {/* Hero */}
      <div className="flex-none px-6 pt-14 pb-20">
        <button onClick={() => router.back()}
          className="mb-8 flex items-center gap-2 text-slate-400 text-sm min-h-[44px]">
          <ArrowLeft size={18} /> Back
        </button>
        <p className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-2">Post a job</p>
        <h1 className="text-4xl font-black text-white leading-none tracking-tight">
          What help<br />do you need?
        </h1>
        <p className="mt-3 text-slate-400 text-sm">Describe the work — helpers in your society will apply.</p>
      </div>

      {/* Form sheet */}
      <form onSubmit={handleSubmit} className="flex-1 bg-white rounded-t-[2rem] px-5 pt-7 pb-20 space-y-6">

        {error && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-4 py-3.5">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Specialty picker */}
        <div>
          <SLabel>Type of help</SLabel>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {SPECIALTIES.map(s => (
              <button key={s.key} type="button" onClick={() => setSpecialty(s.key)}
                className={`rounded-2xl border-2 p-2.5 text-center transition ${
                  specialty === s.key
                    ? 'border-violet-500 bg-violet-50'
                    : 'border-slate-100 bg-white'
                }`}>
                <span className="text-xl">{s.emoji}</span>
                <p className={`text-[10px] font-bold mt-1 ${
                  specialty === s.key ? 'text-violet-700' : 'text-slate-500'
                }`}>{s.label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <SLabel>Job title</SLabel>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Morning maid for 2BHK"
            className={inputCls} />
        </div>

        {/* Description */}
        <div>
          <SLabel>Description</SLabel>
          <textarea value={description} onChange={e => setDesc(e.target.value)}
            placeholder="Describe the tasks, flat size, any preferences…"
            rows={4} className={`${inputCls} resize-none`} />
        </div>

        {/* Schedule */}
        <div>
          <SLabel>Schedule <span className="text-slate-300 font-normal normal-case tracking-normal">(optional)</span></SLabel>
          <input value={schedule} onChange={e => setSchedule(e.target.value)}
            placeholder="e.g. Mon–Sat, 7am–9am"
            className={inputCls} />
        </div>

        {/* Salary */}
        <div>
          <SLabel>Offered monthly salary (₹) <span className="text-slate-300 font-normal normal-case tracking-normal">(optional)</span></SLabel>
          <input type="numeric" value={salary}
            onChange={e => setSalary(e.target.value.replace(/\D/g, ''))}
            placeholder="8000"
            className={inputCls} />
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-violet-50 border border-violet-100 px-4 py-3.5">
          <CheckCircle2 size={15} className="text-violet-500 mt-0.5 shrink-0" />
          <p className="text-xs text-violet-700 leading-relaxed">
            Your posting stays open for 7 days. Workers in your society will see it and can apply. You'll be notified when someone applies.
          </p>
        </div>

        <button type="submit" disabled={loading || !title || !description}
          className="w-full h-14 rounded-2xl bg-violet-600 text-white font-bold text-[15px] shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-40">
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Post job →'}
        </button>
      </form>
    </div>
  )
}

const inputCls = 'w-full rounded-2xl border-2 border-slate-300 bg-white px-4 py-4 text-[15px] text-slate-900 placeholder:text-slate-300 outline-none transition focus:border-violet-500 shadow-sm mt-2'

function SLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-black uppercase tracking-widest text-slate-500">{children}</p>
}
