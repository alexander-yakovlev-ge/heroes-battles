import { useState } from 'react'
import { Platform, StyleSheet, Switch } from 'react-native'
import { useTranslation } from 'react-i18next'
import Constants from 'expo-constants'
import { EmailAuthProvider, linkWithCredential, signOut } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { RACES, type RaceId } from '@hb/game-core'
import { LANGUAGES, LANGUAGE_NAMES, type Language } from '@hb/i18n'
import { paths } from '@hb/shared'
import { Button, Card, ErrorText, Field, H2, P, Row, Screen, Segmented } from '../components/ui'
import { api } from '../lib/api'
import { errorKey } from '../lib/errors'
import { auth, db } from '../lib/firebase'
import { currentLanguage, setLanguage } from '../lib/i18n'
import { useSession } from '../store/session'
import { colors, space } from '../theme'

/** Подтверждение: на web — window.confirm, на устройствах действие выполняется сразу после второго нажатия */
function confirmAction(message: string): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return window.confirm(message)
  return true
}

export default function Settings() {
  const { t } = useTranslation()
  const uid = useSession((s) => s.uid)
  const email = useSession((s) => s.email)
  const isGuest = useSession((s) => s.isGuest)
  const user = useSession((s) => s.user)
  const hero = useSession((s) => s.hero)
  const setHero = useSession((s) => s.setHero)
  const refreshAuth = useSession((s) => s.refreshAuth)
  const [lang, setLang] = useState<Language>(currentLanguage())
  const [linkEmail, setLinkEmail] = useState('')
  const [linkPassword, setLinkPassword] = useState('')
  const [linkRace, setLinkRace] = useState<RaceId>(hero?.startingRace ?? 'knight')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function changeLanguage(next: Language) {
    setLang(next)
    await setLanguage(next)
    if (uid && user) updateDoc(doc(db, paths.user(uid)), { 'settings.language': next }).catch(() => {})
  }

  async function toggleSkins(value: boolean) {
    if (uid && user) await updateDoc(doc(db, paths.user(uid)), { 'settings.showOpponentSkins': value }).catch(() => {})
  }

  async function linkAccount() {
    const current = auth.currentUser
    if (!current) return
    setBusy(true)
    setError(null)
    try {
      await linkWithCredential(current, EmailAuthProvider.credential(linkEmail.trim(), linkPassword))
      // Новый токен с провайдером password — иначе функция увидит гостя
      await current.getIdToken(true)
      setHero((await api.upgradeGuest({ startingRace: linkRace })).hero)
      refreshAuth()
      setDone(true)
    } catch (e) {
      setError(t(errorKey(e)))
    } finally {
      setBusy(false)
    }
  }

  function logout() {
    if (isGuest && !confirmAction(t('settings.signOutGuest'))) return
    signOut(auth)
  }

  return (
    <Screen title={t('settings.title')} back>
      <Card>
        <H2>{t('settings.language')}</H2>
        <Segmented
          options={LANGUAGES.map((l) => ({ value: l, label: LANGUAGE_NAMES[l] }))}
          value={lang}
          onChange={changeLanguage}
          testID="language"
        />
      </Card>

      {user ? (
        <Card>
          <Row style={s.between}>
            <P>{t('settings.showOpponentSkins')}</P>
            <Switch value={user.settings.showOpponentSkins} onValueChange={toggleSkins} trackColor={{ true: colors.goldDark }} />
          </Row>
        </Card>
      ) : null}

      <Card>
        <H2>{t('settings.account')}</H2>
        <P dim testID="account-info">
          {isGuest ? t('settings.guestAccount') : t('settings.signedInAs', { email: email ?? '' })}
        </P>
        {isGuest && !done ? (
          <>
            <H2 style={s.sub}>{t('settings.linkTitle')}</H2>
            <P dim>{t('settings.linkHint')}</P>
            <Field label={t('auth.email')} value={linkEmail} onChangeText={setLinkEmail} autoCapitalize="none" keyboardType="email-address" testID="link-email" />
            <Field label={t('auth.password')} value={linkPassword} onChangeText={setLinkPassword} secureTextEntry testID="link-password" />
            <P dim>{t('createHero.chooseRace')}</P>
            <Segmented scroll options={RACES.map((r) => ({ value: r, label: t(`race.${r}`) }))} value={linkRace} onChange={setLinkRace} />
            <ErrorText>{error}</ErrorText>
            <Button title={t('settings.link')} onPress={linkAccount} loading={busy} testID="link-account" />
          </>
        ) : null}
        {done ? <P style={{ color: colors.green }}>{t('settings.linkDone')}</P> : null}
        <Button variant="danger" title={t('settings.signOut')} onPress={logout} testID="sign-out" />
        <Button variant="ghost" small title={`${t('settings.deleteAccount')} · ${t('common.comingSoon')}`} disabled />
      </Card>

      <P dim style={s.version}>
        {t('settings.version', { version: Constants.expoConfig?.version ?? '0' })}
      </P>
    </Screen>
  )
}

const s = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  sub: { marginTop: space.sm },
  version: { textAlign: 'center', fontSize: 12 },
})
