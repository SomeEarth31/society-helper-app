'use client'
/**
 * ClosedJobsSection — collapsible wrapper for closed/filled job postings.
 * Closed by default so the page feels cleaner.
 */
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ReactNode } from 'react'

export default function ClosedJobsSection({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <section>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between mb-3 active:opacity-70"
        aria-expanded={open}
      >
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Closed / Filled ({count})
        </p>
        {open
          ? <ChevronUp size={15} className="text-slate-400" />
          : <ChevronDown size={15} className="text-slate-400" />
        }
      </button>
      {open && <ul className="space-y-3">{children}</ul>}
    </section>
  )
}
