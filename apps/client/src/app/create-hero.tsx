import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { RACES, baseUnitOf, type RaceId } from '@hb/game-core'
import { RACE_PALETTES } from '@hb/assets'
import { DISPLAY_NAME_MAX, DISPLAY_NAME_MIN, GUEST_LEVEL, isValidDisplayName } from '@hb/shared'
import { UnitIcon } from '../components/UnitIcon'
import { Button, ErrorText, Field, H2, P, Screen } from '../components/ui'
import { api } from '../lib/api'
import { errorKey } from '../lib/errors'
import { currentLanguage } from '../lib/i18n'
import { useSession } from '../store/session'
import { colors, radius, space } from '../theme'

export default function CreateHero() {
  const { t } = useTranslation()
  const isGuest = useSession((s) => s.isGuest)
  const setHero = useSession((s) => s.setHero)
  const [name, setName] = useState('')
  const [race, setRace] = useState<RaceId | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const valid = race !== null && isValidDisplayName(name)

  async function create() {
    if (!race) return
    setBusy(true)
    setError(null)
    try {
      const { hero } = await api.createHero({ startingRace: race, displayName: name, language: currentLanguage() })
      setHero(hero)
    } catch (e) {
      setError(t(errorKey(e)))
      setBusy(false)
    }
  }

  return (
    <Screen title={t('createHero.title')}>
      <Field
        label={t('createHero.name')}
        placeholder={t('createHero.nameHint', { min: DISPLAY_NAME_MIN, max: DISPLAY_NAME_MAX })}
        value={name}
        onChangeText={setName}
        maxLength={DISPLAY_NAME_MAX}
        testID="hero-name"
      />
      <H2>{t('createHero.chooseRace')}</H2>
      <P dim>{t('createHero.raceHint')}</P>
      <View style={s.grid}>
        {RACES.map((r) => {
          const selected = r === race
          return (
            <Pressable
              key={r}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setRace(r)}
              style={[s.race, selected && { borderColor: RACE_PALETTES[r].accent, backgroundColor: colors.panelAlt }]}
              testID={`race-${r}`}
            >
              <UnitIcon unitId={baseUnitOf(r, 7).id} size={56} />
              <Text style={[s.raceName, { color: selected ? colors.text : colors.textDim }]}>{t(`race.${r}`)}</Text>
            </Pressable>
          )
        })}
      </View>
      {isGuest ? <P dim>{t('createHero.guestNote', { level: GUEST_LEVEL })}</P> : null}
      <ErrorText>{error}</ErrorText>
      <Button title={t('createHero.create')} onPress={create} disabled={!valid} loading={busy} testID="create-hero" />
    </Screen>
  )
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  race: {
    width: 112,
    alignItems: 'center',
    gap: space.xs,
    padding: space.sm,
    borderRadius: radius,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  raceName: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
})
