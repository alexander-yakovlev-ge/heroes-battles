import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':')

let env: RulesTestEnvironment

const userDoc = {
  displayName: 'Alice',
  isGuest: false,
  cosmetics: { avatarId: null, frameId: null },
  settings: { language: 'en', showOpponentSkins: true },
  banned: false,
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-heroes-battles',
    firestore: {
      host: host!,
      port: Number(port),
      rules: readFileSync(resolve(import.meta.dirname, '../../firestore.rules'), 'utf8'),
    },
  })
})

beforeEach(async () => {
  await env.clearFirestore()
  // Документы, которые в игре создают Cloud Functions (Admin SDK обходит правила)
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users/alice'), userDoc)
    await setDoc(doc(db, 'heroes/alice'), { level: 1 })
    await setDoc(doc(db, 'ratings/alice'), { mode1v1: { rating: 1000 } })
    await setDoc(doc(db, 'battles/b1'), { status: 'active', teams: { red: ['alice'], blue: ['bob'] } })
    await setDoc(doc(db, 'battles/b1/events/1'), { type: 'move' })
    await setDoc(doc(db, 'battles/b1/private/server'), { rngState: [1, 2, 3, 4] })
  })
})

afterAll(async () => {
  await env?.cleanup()
})

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore()

describe('users (§14)', () => {
  it('читать может любой вошедший, аноним — нет', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'users/alice')))
    await assertFails(getDoc(doc(as(null), 'users/alice')))
  })

  it('владелец меняет имя и настройки', async () => {
    const db = as('alice')
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { displayName: 'Alicia', 'settings.language': 'ru' }))
    await assertSucceeds(updateDoc(doc(db, 'users/alice'), { 'settings.showOpponentSkins': false }))
  })

  it('нельзя менять служебные поля, чужой профиль, создавать профиль и ставить неверные настройки', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { banned: true }))
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { isGuest: true }))
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { 'settings.language': 'de' }))
    await assertFails(updateDoc(doc(as('alice'), 'users/alice'), { displayName: 'A' }))
    await assertFails(updateDoc(doc(as('bob'), 'users/alice'), { displayName: 'Hacked' }))
    await assertFails(setDoc(doc(as('bob'), 'users/bob'), userDoc))
  })
})

describe('heroes, ratings, config', () => {
  it('героя читают вошедшие, пишет только CF', async () => {
    await assertSucceeds(getDoc(doc(as('bob'), 'heroes/alice')))
    await assertFails(getDoc(doc(as(null), 'heroes/alice')))
    await assertFails(setDoc(doc(as('alice'), 'heroes/alice'), { level: 30 }))
    await assertFails(updateDoc(doc(as('alice'), 'heroes/alice'), { pendingStatPoints: 99 }))
  })

  it('рейтинги и конфиг публичны на чтение, запись закрыта', async () => {
    await assertSucceeds(getDoc(doc(as(null), 'ratings/alice')))
    await assertSucceeds(getDoc(doc(as(null), 'config/season')))
    await assertFails(setDoc(doc(as('alice'), 'ratings/alice'), { mode1v1: { rating: 3000 } }))
    await assertFails(setDoc(doc(as('alice'), 'config/season'), { current: 2 }))
  })
})

describe('пресеты армии (§6)', () => {
  const preset = { name: 'Army', slots: [{ unitId: 'necro_skeleton', count: 10 }] }

  it('владелец сохраняет, читает и удаляет пресет main', async () => {
    const db = as('alice')
    await assertSucceeds(setDoc(doc(db, 'armies/alice/presets/main'), preset))
    await assertSucceeds(getDoc(doc(db, 'armies/alice/presets/main')))
    await assertSucceeds(deleteDoc(doc(db, 'armies/alice/presets/main')))
  })

  it('чужие пресеты, лишние слоты пресетов, больше 7 стаков и лишние поля — запрещены', async () => {
    await assertFails(setDoc(doc(as('bob'), 'armies/alice/presets/main'), preset))
    await assertFails(getDoc(doc(as('bob'), 'armies/alice/presets/main')))
    await assertFails(setDoc(doc(as('alice'), 'armies/alice/presets/second'), preset))
    const slots = Array.from({ length: 8 }, (_, i) => ({ unitId: `u${i}`, count: 1 }))
    await assertFails(setDoc(doc(as('alice'), 'armies/alice/presets/main'), { name: 'Big', slots }))
    await assertFails(setDoc(doc(as('alice'), 'armies/alice/presets/main'), { ...preset, weight: 0 }))
  })
})

describe('бои', () => {
  it('бой и события читают только участники', async () => {
    await assertSucceeds(getDoc(doc(as('alice'), 'battles/b1')))
    await assertSucceeds(getDoc(doc(as('bob'), 'battles/b1/events/1')))
    await assertFails(getDoc(doc(as('carol'), 'battles/b1')))
    await assertFails(getDoc(doc(as('carol'), 'battles/b1/events/1')))
  })

  it('писать в бой не может никто; состояние ГСЧ скрыто даже от участников', async () => {
    await assertFails(updateDoc(doc(as('alice'), 'battles/b1'), { status: 'finished' }))
    await assertFails(setDoc(doc(as('alice'), 'battles/b1/events/2'), { type: 'move' }))
    await assertFails(getDoc(doc(as('alice'), 'battles/b1/private/server')))
  })

  it('прочие коллекции закрыты', async () => {
    await assertFails(getDoc(doc(as('alice'), 'battleStats/b1')))
    await assertFails(setDoc(doc(as('alice'), 'reports/r1'), { target: 'bob' }))
    await assertFails(setDoc(doc(as('alice'), 'anything/x'), { a: 1 }))
  })
})
