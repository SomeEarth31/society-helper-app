/**
 * Root layout. Sets up fonts, PWA meta, viewport for mobile-native feel.
 */
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Society Helper',
  description: 'Find, hire, and pay verified domestic help in your society.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Society Helper' },
}

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,            // prevents iOS zoom on input focus
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased text-neutral-900 bg-neutral-50">
        {children}
      </body>
    </html>
  )
}
