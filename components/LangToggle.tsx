'use client'
/**
 * LangToggle — floats in top-right to toggle EN ↔ हिं.
 * Saves to cookie (server) + localStorage (client).
 */
import { useLanguage } from '@/contexts/LanguageContext'

export default function LangToggle() {
  const { lang, setLang } = useLanguage()
  const isHindi = lang === 'hi'

  return (
    <button
      onClick={() => { setLang(isHindi ? 'en' : 'hi'); setTimeout(() => window.location.reload(), 50) }}
      className="h-8 px-3 rounded-full border-2 border-slate-200 bg-white text-xs font-black text-slate-600 flex items-center gap-1.5 shadow-sm active:scale-95 transition select-none"
      aria-label="Toggle language"
    >
      <span className={isHindi ? 'text-slate-400' : 'text-violet-600'}>EN</span>
      <span className="text-slate-300">|</span>
      <span className={isHindi ? 'text-violet-600' : 'text-slate-400'}>हिं</span>
    </button>
  )
}
