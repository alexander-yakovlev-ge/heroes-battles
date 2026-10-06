import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { createUserWithEmailAndPassword, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth'
import { Button, ErrorText, Field, P, Screen } from '../components/ui'
import { errorKey } from '../lib/errors'
import { auth } from '../lib/firebase'
import { colors, space } from '../theme'

/** Вход: email/пароль или гостем (§7.6, §10). Google и Apple подключаются с реальным проектом Firebase. */
export default function Login() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'signIn' | 'register'>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'email' | 'guest' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: 'email' | 'guest', fn: () => Promise<unknown>) {
    setBusy(kind)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(t(errorKey(e)))
      setBusy(null)
    }
  }

  const submitEmail = () =>
    run('email', () =>
      mode === 'signIn'
        ? signInWithEmailAndPassword(auth, email.trim(), password)
        : createUserWithEmailAndPassword(auth, email.trim(), password),
    )

  return (
    <Screen>
      <View style={s.hero}>
        <Text style={s.logo}>{t('common.appName')}</Text>
        <P dim>{t('auth.tagline')}</P>
      </View>
      <View style={s.form}>
        <Field
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          testID="email"
        />
        <Field
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          onSubmitEditing={submitEmail}
          testID="password"
        />
        <ErrorText>{error}</ErrorText>
        <Button
          title={mode === 'signIn' ? t('auth.signIn') : t('auth.register')}
          onPress={submitEmail}
          loading={busy === 'email'}
          disabled={busy !== null}
          testID="submit-email"
        />
        <Button
          variant="ghost"
          small
          title={mode === 'signIn' ? t('auth.switchToRegister') : t('auth.switchToSignIn')}
          onPress={() => setMode(mode === 'signIn' ? 'register' : 'signIn')}
          testID="toggle-mode"
        />
        <Text style={s.or}>— {t('auth.or')} —</Text>
        <Button
          variant="secondary"
          title={t('auth.guest')}
          onPress={() => run('guest', () => signInAnonymously(auth))}
          loading={busy === 'guest'}
          disabled={busy !== null}
          testID="guest"
        />
        <P dim style={s.hint}>
          {t('auth.guestHint')}
        </P>
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: space.xl * 2, marginBottom: space.xl, gap: space.sm },
  logo: { color: colors.gold, fontSize: 34, fontWeight: '800', letterSpacing: 1 },
  form: { width: '100%', maxWidth: 380, alignSelf: 'center', gap: space.md },
  or: { color: colors.textDim, textAlign: 'center' },
  hint: { textAlign: 'center', fontSize: 13 },
})
