'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Lang, Translations } from '@/lib/i18n/translations'

type LanguageContextType = {
  lang: Lang
  setLang: (l: Lang) => void
  T: Translations
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  setLang: () => {},
  T: translations['en'],
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    // Read from cookie first, then localStorage
    const cookieLang = document.cookie
      .split('; ')
      .find(r => r.startsWith('lang='))
      ?.split('=')[1] as Lang | undefined
    const saved = cookieLang ?? (localStorage.getItem('lang') as Lang | null) ?? 'en'
    if (saved === 'hi' || saved === 'en') setLangState(saved)
  }, [])

  function setLang(l: Lang) {
    setLangState(l)
    localStorage.setItem('lang', l)
    // Set cookie so server components can read it on next request
    document.cookie = `lang=${l};path=/;max-age=31536000;SameSite=Lax`
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, T: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
