import { useEffect, useState } from 'react'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Loading } from '../components/ui'
import { initI18n } from '../lib/i18n'
import { startSession, useSession, type SessionStatus } from '../store/session'
import { colors } from '../theme'

/** Куда направить игрока в зависимости от состояния сессии; null — оставить на текущем экране */
function targetRoute(status: SessionStatus, segment: string | undefined): string | null {
  if (status === 'signedOut') return segment === 'login' ? null : '/login'
  if (status === 'needsHero') return segment === 'create-hero' ? null : '/create-hero'
  if (status === 'ready' && (segment === 'login' || segment === 'create-hero' || segment === undefined)) return '/menu'
  return null
}

export default function RootLayout() {
  const [i18nReady, setI18nReady] = useState(false)
  const status = useSession((s) => s.status)
  const segments = useSegments()
  const segment = segments[0] as string | undefined

  useEffect(() => {
    initI18n().finally(() => setI18nReady(true))
    startSession()
  }, [])

  useEffect(() => {
    if (!i18nReady || status === 'loading') return
    const target = targetRoute(status, segment)
    if (!target) return
    // Вход/выход меняет «корень» приложения — старые экраны из стека не нужны
    if (router.canDismiss()) router.dismissAll()
    router.replace(target)
  }, [i18nReady, status, segment])

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {i18nReady ? (
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }} />
      ) : (
        <Loading />
      )}
    </SafeAreaProvider>
  )
}
