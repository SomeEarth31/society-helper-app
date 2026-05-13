'use client'
/**
 * WorkerList — interactive island under /directory.
 *
 * Receives the full set of workers up front from the server
 * component, then filters in memory. For an MVP this is plenty
 * fast (a society rarely has more than a few hundred helpers)
 * and saves us a round-trip on every keystroke.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, IndianRupee, Star, UserPlus } from 'lucide-react'
import type { WorkerRow } from './page'

const SPECIALTIES = [
  { key: 'all',       label: 'All' },
  { key: 'maid',      label: 'Maid' },
  { key: 'cook',      label: 'Cook' },
  { key: 'driver',    label: 'Driver' },
  { key: 'nanny',     label: 'Nanny' },
  { key: 'gardener',  label: 'Gardener' },
] as const

type Filter = typeof SPECIALTIES[number]['key']

export default function WorkerList({ workers }: { workers: WorkerRow[] }) {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return workers.filter(w => {
      const matchesSpecialty =
        filter === 'all' || (w.specialty ?? '').toLowerCase() === filter
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
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name or specialty"
          className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm placeholder:text-neutral-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {/* Specialty chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {SPECIALTIES.map(s => {
          const active = filter === s.key
          return (
            <button
              key={s.key}
              onClick={() => setFilter(s.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white border border-dashed border-neutral-300 p-8 text-center">
          <p className="text-sm text-neutral-600">No helpers match your search.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map(w => (
            <li
              key={w.id}
              className="rounded-2xl bg-white border border-neutral-200 shadow-sm p-4"
            >
              <div className="flex items-center gap-3">
                <Avatar name={w.full_name} url={w.photo_url} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-900 truncate">{w.full_name}</p>
                  <p className="text-xs text-neutral-500 capitalize">
                    {(w.specialty ?? '').replace('_', ' ')}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-neutral-600">
                    <span className="flex items-center gap-0.5">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <span className="font-semibold">{w.trust_score?.toFixed(1) ?? '—'}</span>
                    </span>
                    {w.daily_rate != null && (
                      <span className="flex items-center">
                        <IndianRupee size={12} />
                        <span className="font-semibold">
                          {w.daily_rate.toLocaleString('en-IN')}
                        </span>
                        <span className="ml-1 text-neutral-400">/day</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2 border-t border-neutral-100 pt-3">
                <Link
                  href={`/engagement/new?worker_id=${w.id}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition active:scale-[0.98]"
                >
                  <UserPlus size={14} />
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
    return <img src={url} alt={name} className="h-12 w-12 rounded-full object-cover" />
  }
  const initials = name
    .split(' ')
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div className="h-12 w-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
      {initials}
    </div>
  )
}
