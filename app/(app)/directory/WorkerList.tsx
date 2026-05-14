'use client'
/**
 * WorkerList — interactive filter + search island for /directory.
 * Modern Urban Company style cards.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Star, IndianRupee, UserPlus } from 'lucide-react'
import type { WorkerRow } from './page'

const SPECIALTIES = [
  { key: 'all',       label: 'All' },
  { key: 'maid',      label: 'Maid' },
  { key: 'cook',      label: 'Cook' },
  { key: 'cleaner',   label: 'Cleaner' },
  { key: 'car_washer',label: 'Car Wash' },
  { key: 'gardener',  label: 'Gardener' },
  { key: 'caretaker', label: 'Caretaker' },
  { key: 'driver',    label: 'Driver' },
] as const

type Filter = typeof SPECIALTIES[number]['key']

export default function WorkerList({ workers }: { workers: WorkerRow[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return workers.filter(w => {
      const matchesSpecialty = filter === 'all' || (w.specialty ?? '').toLowerCase() === filter
      if (!matchesSpecialty) return false
      if (!needle) return true
      return (
        w.full_name.toLowerCase().includes(needle) ||
        (w.specialty ?? '').toLowerCase().includes(needle)
      )
    })
  }, [workers, q, filter])

  return (
    <div className="flex flex-col gap-4">

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or specialty…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
        />
      </div>

      {/* Specialty chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
        {SPECIALTIES.map(s => {
          const active = filter === s.key
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
          <Search size={24} className="text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">No helpers found</p>
          <p className="text-xs text-slate-400 mt-1">Try a different name or category</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(w => (
            <li key={w.id} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4">
              <div className="flex items-center gap-3.5">
                <Avatar name={w.full_name} url={w.photo_url} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{w.full_name}</p>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">
                    {(w.specialty ?? '').replace('_', ' ')}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1">
                      <Star size={12} className="text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-slate-700">
                        {w.trust_score?.toFixed(1) ?? '—'}
                      </span>
                    </span>
                    {w.daily_rate != null && (
                      <span className="flex items-center gap-0.5 text-slate-600">
                        <IndianRupee size={11} />
                        <span className="font-semibold">{w.daily_rate.toLocaleString('en-IN')}</span>
                        <span className="text-slate-400">/day</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex justify-end">
                <Link
                  href={`/engagement/new?worker_id=${w.id}`}
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm active:scale-[0.98] transition"
                >
                  <UserPlus size={13} />
                  Hire
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return <img src={url} alt={name} className="h-12 w-12 rounded-2xl object-cover" />
  }
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="h-12 w-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0">
      {initials}
    </div>
  )
}
