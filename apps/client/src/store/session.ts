import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore'
import { create } from 'zustand'
import type { Hero } from '@hb/game-core'
import { DEFAULT_PRESET_ID, paths, type HeroDoc, type PresetDoc, type UserDoc } from '@hb/shared'
import { auth, db } from '../lib/firebase'

export type SessionStatus = 'loading' | 'signedOut' | 'needsHero' | 'ready'

interface SessionState {
  status: SessionStatus
  uid: string | null
  email: string | null
  isGuest: boolean
  user: UserDoc | null
  hero: Hero | null
  /** Пресет армии; null — ещё не сохранён */
  preset: PresetDoc | null
  /** Пришёл ли первый снапшот пресета (до этого preset === null ничего не значит) */
  presetLoaded: boolean
  error: string | null
  /** Оптимистичное обновление героя ответом callable-функции (снапшот придёт следом) */
  setHero: (doc: HeroDoc) => void
  savePreset: (preset: PresetDoc) => Promise<void>
  /** Обновить данные аккаунта после привязки гостя */
  refreshAuth: () => void
}

export const useSession = create<SessionState>((set, get) => ({
  status: 'loading',
  uid: null,
  email: null,
  isGuest: false,
  user: null,
  hero: null,
  preset: null,
  presetLoaded: false,
  error: null,
  setHero: (heroDoc) => {
    const uid = get().uid
    if (uid) set({ hero: { uid, ...heroDoc }, status: 'ready' })
  },
  savePreset: async (preset) => {
    const uid = get().uid
    if (!uid) return
    await setDoc(doc(db, paths.preset(uid, DEFAULT_PRESET_ID)), preset)
    set({ preset })
  },
  refreshAuth: () => {
    const u = auth.currentUser
    if (u) set({ email: u.email, isGuest: u.isAnonymous })
  },
}))

let subscriptions: Unsubscribe[] = []

function unsubscribeAll() {
  for (const u of subscriptions) u()
  subscriptions = []
}

function watchUser(user: User) {
  const uid = user.uid
  useSession.setState({ uid, email: user.email, isGuest: user.isAnonymous, status: 'loading', error: null, presetLoaded: false })
  const onError = (e: Error) => useSession.setState({ error: e.message })
  subscriptions.push(
    onSnapshot(
      doc(db, paths.hero(uid)),
      (snap) => {
        if (snap.exists()) useSession.setState({ hero: { uid, ...(snap.data() as HeroDoc) }, status: 'ready' })
        else useSession.setState({ hero: null, status: 'needsHero' })
      },
      onError,
    ),
    onSnapshot(doc(db, paths.user(uid)), (snap) => useSession.setState({ user: snap.exists() ? (snap.data() as UserDoc) : null }), onError),
    onSnapshot(
      doc(db, paths.preset(uid, DEFAULT_PRESET_ID)),
      (snap) => useSession.setState({ preset: snap.exists() ? (snap.data() as PresetDoc) : null, presetLoaded: true }),
      onError,
    ),
  )
}

let started = false

/** Подписка на вход/выход и документы игрока; вызывается один раз из корневого layout */
export function startSession(): void {
  if (started) return
  started = true
  onAuthStateChanged(auth, (user) => {
    unsubscribeAll()
    if (!user) {
      useSession.setState({
        status: 'signedOut',
        uid: null,
        email: null,
        isGuest: false,
        user: null,
        hero: null,
        preset: null,
        presetLoaded: false,
      })
      return
    }
    watchUser(user)
  })
}
