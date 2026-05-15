/**
 * Server-side translation helper — reads lang cookie set by LangToggle.
 * Use in Server Components / Server Actions.
 */
import { cookies } from 'next/headers'
import { translations, Lang } from './translations'

export function getServerTranslations() {
  const lang = (cookies().get('lang')?.value ?? 'en') as Lang
  return translations[lang in translations ? lang : 'en']
}

export function getServerLang(): Lang {
  const lang = cookies().get('lang')?.value
  return (lang === 'hi' ? 'hi' : 'en') as Lang
}
