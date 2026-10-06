import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, type Transaction } from 'firebase-admin/firestore'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { RACES, STATS, allocateRaceSkill, allocateStat, createHero as newHero, type Hero, type RaceId } from '@hb/game-core'
import {
  GUEST_LEVEL,
  LANGUAGES,
  defaultSettings,
  isValidDisplayName,
  normalizeDisplayName,
  paths,
  type AllocatePointRequest,
  type CreateHeroRequest,
  type ErrorCode,
  type HeroDoc,
  type HeroResponse,
  type Language,
  type UpgradeGuestRequest,
  type UserDoc,
} from '@hb/shared'

initializeApp()
const db = getFirestore()

const HTTPS_CODE: Record<ErrorCode, ConstructorParameters<typeof HttpsError>[0]> = {
  unauthenticated: 'unauthenticated',
  invalid_argument: 'invalid-argument',
  hero_exists: 'already-exists',
  no_hero: 'failed-precondition',
  no_points: 'failed-precondition',
  skill_max: 'failed-precondition',
  not_guest: 'failed-precondition',
}

/** Ошибка с кодом из @hb/shared в details — клиент переводит её в сообщение */
function fail(code: ErrorCode, message: string = code): never {
  throw new HttpsError(HTTPS_CODE[code], message, { code })
}

function requireAuth(req: CallableRequest): { uid: string; isGuest: boolean } {
  if (!req.auth) fail('unauthenticated')
  return { uid: req.auth.uid, isGuest: req.auth.token.firebase.sign_in_provider === 'anonymous' }
}

const isRace = (x: unknown): x is RaceId => typeof x === 'string' && (RACES as readonly string[]).includes(x)

function toDoc(hero: Hero): HeroDoc {
  const { uid: _uid, ...doc } = hero
  return doc
}

async function readHero(tx: Transaction, uid: string): Promise<Hero> {
  const snap = await tx.get(db.doc(paths.hero(uid)))
  if (!snap.exists) fail('no_hero')
  return { uid, ...(snap.data() as HeroDoc) }
}

/** Создание героя (и профиля игрока) после первого входа. Гость получает героя уровня 5 (§7.6). */
export const createHero = onCall<CreateHeroRequest>(async (req): Promise<HeroResponse> => {
  const { uid, isGuest } = requireAuth(req)
  const { startingRace, displayName, language } = req.data ?? ({} as CreateHeroRequest)
  if (!isRace(startingRace) || typeof displayName !== 'string' || !isValidDisplayName(displayName)) fail('invalid_argument')
  const lang: Language = LANGUAGES.includes(language as Language) ? (language as Language) : 'en'

  const hero = newHero(uid, startingRace, isGuest ? GUEST_LEVEL : 1)
  await db.runTransaction(async (tx) => {
    const heroRef = db.doc(paths.hero(uid))
    const userRef = db.doc(paths.user(uid))
    const [heroSnap, userSnap] = await Promise.all([tx.get(heroRef), tx.get(userRef)])
    if (heroSnap.exists) fail('hero_exists')
    tx.set(heroRef, toDoc(hero))
    const user: UserDoc = {
      displayName: normalizeDisplayName(displayName),
      createdAt: FieldValue.serverTimestamp(),
      lastSeen: FieldValue.serverTimestamp(),
      isGuest,
      cosmetics: { avatarId: null, frameId: null },
      settings: defaultSettings(lang),
      banned: false,
    }
    if (userSnap.exists) tx.update(userRef, { displayName: user.displayName, isGuest })
    else tx.set(userRef, user)
  })
  return { hero: toDoc(hero) }
})

/** Распределение очка стата или навыка расы (§11.1) */
export const allocatePoint = onCall<AllocatePointRequest>(async (req): Promise<HeroResponse> => {
  const { uid } = requireAuth(req)
  const data = req.data
  const valid =
    (data?.kind === 'stat' && (STATS as readonly string[]).includes(data.stat)) || (data?.kind === 'race' && isRace(data.race))
  if (!valid) fail('invalid_argument')

  const updated = await db.runTransaction(async (tx) => {
    const hero = await readHero(tx, uid)
    let next: Hero
    if (data.kind === 'stat') {
      if (hero.pendingStatPoints <= 0) fail('no_points')
      next = allocateStat(hero, data.stat)
    } else {
      if (hero.pendingRaceSkillPoints <= 0) fail('no_points')
      if (hero.raceSkills[data.race] >= 9) fail('skill_max')
      next = allocateRaceSkill(hero, data.race)
    }
    tx.set(db.doc(paths.hero(uid)), toDoc(next))
    return next
  })
  return { hero: toDoc(updated) }
})

/**
 * Гость привязал аккаунт (linkWithCredential на клиенте): гостевой герой заменяется
 * обычным героем уровня 1 с выбранной стартовой расой (§7.6).
 */
export const upgradeGuest = onCall<UpgradeGuestRequest>(async (req): Promise<HeroResponse> => {
  const { uid, isGuest } = requireAuth(req)
  if (isGuest) fail('not_guest', 'Link an account before upgrading')
  if (!isRace(req.data?.startingRace)) fail('invalid_argument')
  const hero = newHero(uid, req.data.startingRace, 1)
  await db.runTransaction(async (tx) => {
    const userRef = db.doc(paths.user(uid))
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists || (userSnap.data() as UserDoc).isGuest !== true) fail('not_guest')
    tx.set(db.doc(paths.hero(uid)), toDoc(hero))
    tx.update(userRef, { isGuest: false })
  })
  return { hero: toDoc(hero) }
})
