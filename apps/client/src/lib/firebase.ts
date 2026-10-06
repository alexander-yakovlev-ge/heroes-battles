import { Platform } from 'react-native'
import { getApp, getApps, initializeApp, type FirebaseOptions } from 'firebase/app'
import { connectAuthEmulator, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions'
import { createAuth } from './authInit'

/**
 * Конфигурация Firebase из EXPO_PUBLIC_* переменных. Без них клиент работает
 * с эмуляторами в demo-проекте (реальный проект Firebase не нужен).
 */
const env = process.env
const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-heroes-battles'
const useEmulators = env.EXPO_PUBLIC_USE_EMULATORS !== '0' && projectId.startsWith('demo-')

const options: FirebaseOptions = {
  apiKey: env.EXPO_PUBLIC_FIREBASE_API_KEY ?? 'demo-api-key',
  authDomain: env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? `${projectId}.firebaseapp.com`,
  projectId,
  appId: env.EXPO_PUBLIC_FIREBASE_APP_ID ?? 'demo-app',
}

/**
 * Хост эмуляторов: на web — тот же хост, с которого открыт клиент (localhost у разработчика,
 * имя контейнера в Docker); на устройстве — из EXPO_PUBLIC_EMULATOR_HOST.
 */
function emulatorHost(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.location.hostname
  return env.EXPO_PUBLIC_EMULATOR_HOST ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost')
}

const firstInit = getApps().length === 0
export const app = firstInit ? initializeApp(options) : getApp()
export const auth: Auth = createAuth(app)
export const db = getFirestore(app)
export const functions = getFunctions(app)

if (firstInit && useEmulators) {
  const host = emulatorHost()
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
  connectFunctionsEmulator(functions, host, 5001)
}

export const usingEmulators = useEmulators
