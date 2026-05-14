'use client'
/**
 * JobList — shown to WORKERS on the /directory route.
 * Displays open job postings in their society, prioritising their specialty.
 */
import { useState, useMemo } from 'react'
import { Briefcase, IndianRupee, MapPin, Star, Filter } from 'lucide-react'

export type JobRow = {
  id: string
  specialty: string
  description: string | null
  offered_salary: number | null
  created_at: string
  employer: { full_name: string | null; flat_number: string | null } | null
}

const SPECIALTY_LABEL: Record<string, string> = {
  maid: 'Maid', cook: 'Cook', cleaner: 'Cleaner',
  car_washer: 'Car Wash', caretaker: 'Caretaker',
  gardener: 'Gardener', other: 'Other',
}

export default function JobList({
  jobs,
  workerSpecialty,
}: {
  jobs: JobRow[]
  workerSpecialty: string | null
}) {
  const [filterMine, setFilterMine] = useState(false)

  const filtered = useMemo(
    () => filterMine && workerSpecialty
      ? jobs.filter(j => j.specialty === workerSpecialty)
      : jobs,
    [jobs, filterMine, workerSpecialty],
  )

  // Sort: matching specialty first
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => {
      if (a.specialty === workerSpecialty && b.specialty !== workerSpecialty) return -1
      if (b.specialty === workerSpecialty && a.specialty !== workerSpecialty) return 1
      return 0
    }),
    [filtered, workerSpecialty],
  )

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      {workerSpecialty && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMine(f => !f)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              filterMine
                ? 'bg-violet-600 border-violet-600 text-white'
                : 'bg-white border-slate-200 text-slate-600'
            }`}
          >
            <Filter size={11} />
            My specialty only
          </button>
          <span className="text-xs text-slate-400">
            {sorted.length} {sorted.length === 1 ? 'opening' : 'openings'}
          </span>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center">
          <Briefcase size={28} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-500">No openings right now</p>
          <p className="text-xs text-slate-400 mt-1">
            New postings appear the moment a resident creates one.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map(j => {
            const isMatch = j.specialty === workerSpecialty
            return (
              <li
                key={j.id}
                className={`rounded-3xl bg-white border shadow-sm p-4 ${
                  isMatch ? 'border-violet-200 ring-1 ring-violet-100' : 'border-slate-100'
                }`}
              >
                {/* Specialty badge */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                      isMatch ? 'bg-violet-600' : 'bg-slate-100'
                    }`}>
                      <Briefcase size={16} className={isMatch ? 'text-white' : 'text-slate-500'} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm capitalize">
                        {SPECIALTY_LABEL[j.specialty] ?? j.specialty.replace('_', ' ')} needed
                      </p>
                      {isMatch && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                          Matches your specialty
                        </span>
                      )}
                    </div>
                  </div>
                  {j.offered_salary != null && (
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Salary</p>
                      <p className="font-bold text-slate-900 flex items-center justify-end gap-0.5 mt-0.5">
                        <IndianRupee size={13} className="text-emerald-600" />
                        {j.offered_salary.toLocaleString('en-IN')}
                        <span className="text-xs font-normal text-slate-400">/mo</span>
                      </p>
                    </div>
                  )}
                </div>

                {/* Employer info */}
                {j.employer && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2.5">
                    <MapPin size={11} className="text-slate-400" />
                    <span className="font-medium text-slate-700">
                      {j.employer.full_name ?? 'Resident'}
                    </span>
                    {j.employer.flat_number && (
                      <span className="text-slate-400">· Flat {j.employer.flat_number}</span>
                    )}
                  </div>
                )}

                {/* Description */}
                {j.description && (
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {j.description}
                  </p>
                )}

                {/* Posted */}
                <p className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                  Posted {formatDate(j.created_at)}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  })
}
