import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  EmailAuthProvider,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  linkWithCredential,
  signInAnonymously,
  signOut,
  type Auth,
} from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getFirestore, type Firestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, httpsCallable, type Functions } from 'firebase/functions'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { AllocatePointRequest, CreateHeroRequest, HeroResponse, UpgradeGuestRequest, UserDoc } from '@hb/shared'

/**
 * Интеграционные тесты callable-функций в Firebase Emulator Suite (§15.1).
 * Вызовы идут клиентским SDK — так же, как из приложения.
 */
const PROJECT = 'demo-heroes-battles'
const hostPort = (env: string | undefined, fallback: string) => {
  const [h, p] = (env ?? fallback).split(':')
  return { host: h!, port: Number(p) }
}
const authHost = hostPort(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9099')
const fsHost = hostPort(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8080')
const fnHost = hostPort(process.env.FUNCTIONS_EMULATOR_HOST, '127.0.0.1:5001')

let app: FirebaseApp
let auth: Auth
let db: Firestore
let fns: Functions

beforeAll(() => {
  app = initializeApp({ apiKey: 'demo-api-key', projectId: PROJECT })
  auth = getAuth(app)
  connectAuthEmulator(auth, `http://${authHost.host}:${authHost.port}`, { disableWarnings: true })
  db = getFirestore(app)
  connectFirestoreEmulator(db, fsHost.host, fsHost.port)
  fns = getFunctions(app)
  connectFunctionsEmulator(fns, fnHost.host, fnHost.port)
})

afterAll(async () => {
  await deleteApp(app)
})

beforeEach(async () => {
  await signOut(auth)
})

const call = <Req, Res = HeroResponse>(name: string) => (req: Req) => httpsCallable<Req, Res>(fns, name)(req).then((r) => r.data)
const createHero = call<CreateHeroRequest>('createHero')
const allocatePoint = call<AllocatePointRequest>('allocatePoint')
const upgradeGuest = call<UpgradeGuestRequest>('upgradeGuest')

/** Код ошибки из details (см. @hb/shared ErrorCode) */
async function errorCode(p: Promise<unknown>): Promise<string> {
  try {
    await p
  } catch (e) {
    return (e as { details?: { code?: string } }).details?.code ?? `no-code:${(e as Error).message}`
  }
  return 'no-error'
}

const uniqueEmail = () => `u${Date.now()}${Math.floor(Math.random() * 1e6)}@test.dev`

describe('createHero', () => {
  it('без входа — unauthenticated', async () => {
    expect(await errorCode(createHero({ startingRace: 'necro', displayName: 'Nobody' }))).toBe('unauthenticated')
  })

  it('гость получает героя уровня 5 с навыком стартовой расы 3 и очками к распределению (§7.6)', async () => {
    const { user } = await signInAnonymously(auth)
    const { hero } = await createHero({ startingRace: 'necro', displayName: '  Guest   Hero ', language: 'ru' })
    expect(hero.level).toBe(5)
    expect(hero.raceSkills.necro).toBe(3)
    expect(hero.pendingStatPoints).toBe(4)
    expect(hero.pendingRaceSkillPoints).toBe(1)

    const stored = (await getDoc(doc(db, `heroes/${user.uid}`))).data()
    expect(stored?.level).toBe(5)
    const profile = (await getDoc(doc(db, `users/${user.uid}`))).data() as UserDoc
    expect(profile.isGuest).toBe(true)
    expect(profile.displayName).toBe('Guest Hero')
    expect(profile.settings.language).toBe('ru')
    expect(profile.banned).toBe(false)
  })

  it('обычный игрок получает героя уровня 1 без очков (§11.1)', async () => {
    await createUserWithEmailAndPassword(auth, uniqueEmail(), 'secret123')
    const { hero } = await createHero({ startingRace: 'knight', displayName: 'Arthur' })
    expect(hero.level).toBe(1)
    expect(hero.pendingStatPoints).toBe(0)
    expect(hero.stats).toEqual({ attack: 1, defense: 1, power: 1, knowledge: 1 })
  })

  it('второй герой — hero_exists; неверные данные — invalid_argument', async () => {
    await signInAnonymously(auth)
    expect(await errorCode(createHero({ startingRace: 'orc' as never, displayName: 'Valid' }))).toBe('invalid_argument')
    expect(await errorCode(createHero({ startingRace: 'elf', displayName: 'ab' }))).toBe('invalid_argument')
    await createHero({ startingRace: 'elf', displayName: 'Legolas' })
    expect(await errorCode(createHero({ startingRace: 'elf', displayName: 'Legolas' }))).toBe('hero_exists')
  })
})

describe('allocatePoint', () => {
  it('распределяет очки статов и навыков рас, пока они есть', async () => {
    await signInAnonymously(auth)
    await createHero({ startingRace: 'wizard', displayName: 'Merlin' })
    let r = await allocatePoint({ kind: 'stat', stat: 'attack' })
    expect(r.hero.stats.attack).toBe(2)
    expect(r.hero.statHistory).toEqual(['attack'])
    expect(r.hero.pendingStatPoints).toBe(3)
    r = await allocatePoint({ kind: 'race', race: 'necro' })
    expect(r.hero.raceSkills.necro).toBe(1)
    expect(r.hero.pendingRaceSkillPoints).toBe(0)
    expect(await errorCode(allocatePoint({ kind: 'race', race: 'elf' }))).toBe('no_points')
    expect(await errorCode(allocatePoint({ kind: 'stat', stat: 'luck' as never }))).toBe('invalid_argument')
  })

  it('без героя — no_hero', async () => {
    await signInAnonymously(auth)
    expect(await errorCode(allocatePoint({ kind: 'stat', stat: 'defense' }))).toBe('no_hero')
  })
})

describe('upgradeGuest', () => {
  it('гость, ещё не привязавший аккаунт, — not_guest', async () => {
    await signInAnonymously(auth)
    await createHero({ startingRace: 'elf', displayName: 'Guest' })
    expect(await errorCode(upgradeGuest({ startingRace: 'elf' }))).toBe('not_guest')
  })

  it('после привязки email гостевой герой заменяется героем уровня 1', async () => {
    const { user } = await signInAnonymously(auth)
    await createHero({ startingRace: 'elf', displayName: 'Guest' })
    await linkWithCredential(user, EmailAuthProvider.credential(uniqueEmail(), 'secret123'))
    await user.getIdToken(true)
    const { hero } = await upgradeGuest({ startingRace: 'dungeon' })
    expect(hero.level).toBe(1)
    expect(hero.startingRace).toBe('dungeon')
    const profile = (await getDoc(doc(db, `users/${user.uid}`))).data() as UserDoc
    expect(profile.isGuest).toBe(false)
    // Повторно — уже не гость
    expect(await errorCode(upgradeGuest({ startingRace: 'dungeon' }))).toBe('not_guest')
  })
})
