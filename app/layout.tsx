/**
 * Root layout. Sets up fonts, PWA meta, viewport for mobile-native feel.
 * Noto Sans Devanagari loaded for Hindi support.
 */
import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_Devanagari } from 'next/font/google'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const noto  = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-devanagari',
  weight: ['400', '700', '900'],
})

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
  maximumScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${noto.variable}`}>
      <body className="font-sans antialiased text-neutral-900 bg-neutral-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
