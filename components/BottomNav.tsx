'use client'
/**
 * Bottom Navigation — adapts to the user's role.
 *   • residents see: Home · Directory · Payments · Profile
 *   • workers  see: Home · Jobs · Earnings · Account
 *
 * Sticks to the bottom on all (app) routes via app/(app)/layout.tsx.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, Wallet, User, Briefcase, BadgeIndianRupee } from 'lucide-react'

type Role = 'resident' | 'worker' | 'admin'

const RESIDENT_TABS = [
  { href: '/',          label: 'Home',      icon: Home },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/payments',  label: 'Payments',  icon: Wallet },
  { href: '/profile',   label: 'Profile',   icon: User },
] as const

const WORKER_TABS = [
  { href: '/',                label: 'Home',     icon: Home },
  { href: '/directory',       label: 'Jobs',     icon: Briefcase },
  { href: '/payments',        label: 'Earnings', icon: BadgeIndianRupee },
  { href: '/worker-profile',  label: 'Account',  icon: User },
] as const

export default function BottomNav({ role = 'resident' }: { role?: Role }) {
  const pathname = usePathname()
  const tabs = role === 'worker' ? WORKER_TABS : RESIDENT_TABS

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-neutral-200 bg-white/95 backdrop-blur pb-safe">
      <ul className="grid grid-cols-4">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href}>
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors ${
                  active ? 'text-indigo-600' : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
                <span className={active ? 'font-semibold' : ''}>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
