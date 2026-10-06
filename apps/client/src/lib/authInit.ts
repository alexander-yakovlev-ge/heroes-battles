import type { FirebaseApp } from 'firebase/app'
import { browserLocalPersistence, initializeAuth, type Auth } from 'firebase/auth'

/** Web: сессия хранится в localStorage браузера */
export function createAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, { persistence: browserLocalPersistence })
}
