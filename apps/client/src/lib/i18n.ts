import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, pickLanguage, resources, type Language } from '@hb/i18n'

const STORAGE_KEY = 'hb.language'

/** Язык: выбранный вручную (сохранён на устройстве) или системный (§10.2) */
export async function initI18n(): Promise<void> {
  if (i18n.isInitialized) return
  let saved: string | null = null
  try {
    saved = await AsyncStorage.getItem(STORAGE_KEY)
  } catch {
    // хранилище недоступно — берём системный язык
  }
  const lng = saved ? pickLanguage(saved) : pickLanguage(getLocales()[0]?.languageCode)
  await i18n.use(initReactI18next).init({
    resources,
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    interpolation: { escapeValue: false },
  })
}

export async function setLanguage(lang: Language): Promise<void> {
  await i18n.changeLanguage(lang)
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // не критично: язык останется до перезапуска
  }
}

export const currentLanguage = (): Language => pickLanguage(i18n.language)

export { i18n }
