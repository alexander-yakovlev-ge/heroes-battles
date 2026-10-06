import type { ArmySlot, Hero, RaceId, StatId } from '@hb/game-core'
import { LANGUAGES, type Language } from '@hb/i18n'

/** Общие типы документов Firestore и callable-функций (§3 ТЗ) */

export { LANGUAGES, type Language }

/** Гостевой герой: фиксированный уровень (§7.6) */
export const GUEST_LEVEL = 5
/** Бесплатных слотов пресетов армии (§6.2); дополнительные — покупка на этапе 5 */
export const FREE_PRESET_SLOTS = 1
export const DEFAULT_PRESET_ID = 'main'
export const MAX_PRESET_SLOTS = 7
export const DISPLAY_NAME_MIN = 3
export const DISPLAY_NAME_MAX = 20
export const PRESET_NAME_MAX = 24

export const paths = {
  user: (uid: string) => `users/${uid}`,
  hero: (uid: string) => `heroes/${uid}`,
  presets: (uid: string) => `armies/${uid}/presets`,
  preset: (uid: string, presetId: string) => `armies/${uid}/presets/${presetId}`,
} as const

export interface UserSettings {
  language: Language
  showOpponentSkins: boolean
}

/** /users/{uid}; createdAt/lastSeen — Timestamp Firestore (тип зависит от SDK) */
export interface UserDoc {
  displayName: string
  createdAt: unknown
  lastSeen: unknown
  isGuest: boolean
  cosmetics: { avatarId: string | null; frameId: string | null }
  settings: UserSettings
  banned: boolean
}

/** /heroes/{uid} — пишет только CF */
export type HeroDoc = Omit<Hero, 'uid'>

/** /armies/{uid}/presets/{presetId} — пишет владелец */
export interface PresetDoc {
  name: string
  slots: ArmySlot[]
}

// --- callable-функции -------------------------------------------------------

export interface CreateHeroRequest {
  startingRace: RaceId
  displayName: string
  language?: Language
}

export type AllocatePointRequest = { kind: 'stat'; stat: StatId } | { kind: 'race'; race: RaceId }

/** Привязка гостя к аккаунту: гостевой герой заменяется обычным героем уровня 1 (§7.6) */
export interface UpgradeGuestRequest {
  startingRace: RaceId
}

export interface HeroResponse {
  hero: HeroDoc
}

export const CALLABLES = {
  createHero: 'createHero',
  allocatePoint: 'allocatePoint',
  upgradeGuest: 'upgradeGuest',
} as const

/** Коды ошибок callable-функций, которые клиент переводит в сообщения */
export type ErrorCode =
  | 'unauthenticated'
  | 'invalid_argument'
  | 'hero_exists'
  | 'no_hero'
  | 'no_points'
  | 'skill_max'
  | 'not_guest'

export function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function isValidDisplayName(name: string): boolean {
  const n = normalizeDisplayName(name)
  return n.length >= DISPLAY_NAME_MIN && n.length <= DISPLAY_NAME_MAX && !/[<>\p{Cc}]/u.test(n)
}

export function defaultSettings(language: Language = 'en'): UserSettings {
  return { language, showOpponentSkins: true }
}
