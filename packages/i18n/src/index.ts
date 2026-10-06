import { entitiesEn } from './entities.en.js'
import { entitiesRu } from './entities.ru.js'
import { uiEn } from './ui.en.js'
import { uiRu } from './ui.ru.js'

export const LANGUAGES = ['en', 'ru'] as const
export type Language = (typeof LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'en'

export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', ru: 'Русский' }

/** Ресурсы для i18next: одно пространство имён translation на язык */
export const resources = {
  en: { translation: { ...entitiesEn, ...uiEn } },
  ru: { translation: { ...entitiesRu, ...uiRu } },
} as const

export type Translation = typeof resources.en.translation

/** Язык из списка поддерживаемых по коду локали системы (en-US → en); иначе язык по умолчанию */
export function pickLanguage(code: string | null | undefined): Language {
  const lang = (code ?? '').toLowerCase().split(/[-_]/)[0]
  return (LANGUAGES as readonly string[]).includes(lang!) ? (lang as Language) : DEFAULT_LANGUAGE
}
