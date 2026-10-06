import AsyncStorage from '@react-native-async-storage/async-storage'
import type { FirebaseApp } from 'firebase/app'
// В react-native-сборке @firebase/auth есть getReactNativePersistence, но в общих типах его нет
// @ts-expect-error — экспорт есть только в react-native условии пакета
import { getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth'

/** iOS/Android: сессия хранится в AsyncStorage */
export function createAuth(app: FirebaseApp): Auth {
  return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
}
