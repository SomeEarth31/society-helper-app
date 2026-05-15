'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, Star, IndianRupee, UserPlus, SlidersHorizontal, Loader2, CheckCircle2 } from 'lucide-react'
import type { WorkerRow } from './page'

const SPECIALTIES = [
  { key: 'all',        label: 'All' },
  { key: 'maid',       label: 'Maid' },
  { key: 'cook',       label: 'Cook' },
  { key: 'cleaner',    label: 'Cleaner' },
  { key: 'car_washer', label: 'Car Wash' },
  { key: 'gardener',   label: 'Gardener' },
  { key: 'caretaker',  label: 'Caretaker' },
] as const
type Filter = typeof SPECIALTIES[number]['key']

export default function WorkerList({ workers }: { workers: WorkerRow[] }) {
  const supabase = createClient()
  const router   = useRouter()
  const [q, setQ]           = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [hiring, setHiring] = useState<string | null>(null)
  const [hired, setHired]   = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return workers.filter(w => {
      if (filter !== 'all' && (w.specialty ?? '').toLowerCase() !== filter) return false
      if (!needle) return true
      return w.full_name.toLowerCase().includes(needle) ||
             (w.specialty ?? '').toLowerCase().includes(needle)
    })
  }, [workers, q, filter])

  async function handleHire(workerId: string) {
    setHiring(workerId)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setHiring(null); return }
    await supabase.from('hire_requests').insert({
      resident_id: user.id, worker_id: workerId, status: 'pending',
    })
    setHired(prev => new Set([...prev, workerId]))
    setHiring(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search helpers…"
          className="w-full rounded-2xl border-2 border-slate-200 bg-white py-3.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-300 shadow-sm focus:border-violet-500 focus:outline-none" />
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {SPECIALTIES.map(s => {
          const active = filter === s.key
          return (
            <button key={s.key} onClick={() => setFilter(s.key)}
              className={`shrink-0 rounded-2xl border-2 px-3.5 py-2 text-xs font-bold transition min-h-[36px] ${
                active ? 'bg-violet-600 border-violet-600 text-white' : 'bg-white border-slate-200 text-slate-500'
              }`}>
              {s.label}
            </button>
          )
        })}
      </div>

      <p className="text-xs font-bold text-slate-400">
        {filtered.length} {filtered.length === 1 ? 'helper' : 'helpers'} found
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
          <SlidersHorizontal size={24} className="text-slate-300 mx-auto mb-3" />
          <p className="font-black text-slate-500">No helpers match</p>
          <p className="text-xs text-slate-400 mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(w => {
            const isHired   = hired.has(w.id)
            const isHiring  = hiring === w.id
            return (
              <li key={w.id} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="flex items-center gap-3.5">
                  <WorkerAvatar name={w.full_name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-900 text-[15px] truncate">{w.full_name}</p>
                      {!w.is_available && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">Unavailable</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">{(w.specialty ?? '').replace(/_/g, ' ')}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs">
                        <Star size={11} className="text-amber-400 fill-amber-400" />
                        <span className="font-black text-slate-700">{w.trust_score?.toFixed(1) ?? '—'}</span>
                      </span>
                      {w.daily_rate != null && (
                        <span className="flex items-center gap-0.5 text-xs text-slate-500">
                          <IndianRupee size={11} />
                          <span className="font-bold">{w.daily_rate.toLocaleString('en-IN')}</span>
                          <span className="text-slate-300">/day</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 pt-3.5 border-t border-slate-100">
                  {isHired ? (
                    <div className="flex items-center justify-center gap-2 text-sm font-bold text-emerald-600 h-10">
                      <CheckCircle2 size={16} /> Request sent!
                    </div>
                  ) : (
                    <button onClick={() => handleHire(w.id)}
                      disabled={!w.is_available || isHiring}
                      className="w-full h-11 inline-flex items-center justify-center gap-1.5 rounded-2xl bg-violet-600 text-sm font-bold text-white shadow-md shadow-violet-200 active:scale-[0.97] transition disabled:opacity-40">
                      {isHiring ? <Loader2 size={14} className="animate-spin" /> : <><UserPlus size={14} /> Hire</>}
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function WorkerAvatar({ name }: { name: string }) {
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-14 w-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-base font-black shrink-0">
      {initials}
    </div>
  )
}
