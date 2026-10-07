import { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { RACES, getUnit, isUnitUnlocked, maxWeight, unitCost, unitsOfRace, type ArmySlot, type RaceId } from '@hb/game-core'
import { RACE_PALETTES } from '@hb/assets'
import { UnitIcon } from '../components/UnitIcon'
import { Button, Card, ErrorText, H2, Loading, P, Row, Screen, Segmented } from '../components/ui'
import { MAX_STACKS, addUnit, armyErrorMessage, maxCountAt, pairSlotOf, removeAt, setCount, swapVariant, validate, weightOf } from '../features/castle/army'
import { UnitCard, lockReason } from '../features/castle/UnitCard'
import { errorKey } from '../lib/errors'
import { fmtWeight } from '../lib/format'
import { useSession } from '../store/session'
import { colors, radius, space } from '../theme'

/** Замок: сборка пресета армии (§6.3) */
export default function Castle() {
  const { t } = useTranslation()
  const hero = useSession((s) => s.hero)
  const preset = useSession((s) => s.preset)
  const presetLoaded = useSession((s) => s.presetLoaded)
  const savePreset = useSession((s) => s.savePreset)
  const [slots, setSlots] = useState<ArmySlot[] | null>(null)
  const [race, setRace] = useState<RaceId | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Черновик инициализируется сохранённым пресетом один раз
  useEffect(() => {
    if (slots === null && hero && presetLoaded) setSlots(preset?.slots ?? [])
  }, [hero, preset, presetLoaded, slots])
  useEffect(() => {
    if (race === null && hero) setRace(hero.startingRace)
  }, [hero, race])

  const dirty = useMemo(() => JSON.stringify(slots) !== JSON.stringify(preset?.slots ?? []), [slots, preset])
  if (!hero || slots === null || race === null) return <Loading />

  const weight = weightOf(slots, hero)
  const limit = maxWeight(hero.level)
  const errors = validate(slots, hero)
  const update = (next: ArmySlot[]) => {
    setSlots(next)
    setMessage(null)
  }

  async function save(thenBattle: boolean) {
    if (!slots) return
    setBusy(true)
    setError(null)
    try {
      if (dirty) await savePreset({ name: t('castle.preset'), slots })
      if (thenBattle) router.push('/bot')
      else setMessage(t('castle.saved'))
    } catch (e) {
      setError(t(errorKey(e)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title={t('castle.title')} back>
      <Card>
        <Row style={s.between}>
          <H2>{t('castle.army')}</H2>
          <Text style={[s.weight, weight > limit + 1e-9 && { color: colors.red }]} testID="army-weight">
            {t('castle.weight', { weight: fmtWeight(weight), max: limit })}
          </Text>
        </Row>
        <View style={s.bar}>
          <View style={[s.barFill, { width: `${Math.min(100, (weight / limit) * 100)}%` }, weight > limit && { backgroundColor: colors.red }]} />
        </View>
        <P dim>{t('castle.stacks', { count: slots.length, max: MAX_STACKS })}</P>
        {slots.length === 0 ? <P dim>{t('castle.emptyArmy')}</P> : null}
        {slots.map((slot, i) => {
          const unit = getUnit(slot.unitId)
          const max = maxCountAt(slots, i, hero)
          return (
            <Row key={slot.unitId} style={s.slot} testID={`slot-${slot.unitId}`}>
              <UnitIcon unitId={slot.unitId} size={44} locked={!isUnitUnlocked(unit, hero.level, hero.raceSkills)} />
              <View style={s.slotBody}>
                <Text style={s.slotName} numberOfLines={1}>
                  {t(unit.nameKey)}
                </Text>
                <Row style={s.slotControls}>
                  <Button small variant="secondary" title="−" onPress={() => update(setCount(slots, i, slot.count - 1))} disabled={slot.count <= 1} />
                  <TextInput
                    style={s.count}
                    value={String(slot.count)}
                    keyboardType="number-pad"
                    onChangeText={(v) => update(setCount(slots, i, parseInt(v, 10)))}
                    accessibilityLabel={t(unit.nameKey)}
                    testID={`count-${slot.unitId}`}
                  />
                  <Button small variant="secondary" title="+" onPress={() => update(setCount(slots, i, slot.count + 1))} disabled={slot.count >= max} />
                  <Button small variant="ghost" title={t('castle.max')} onPress={() => update(setCount(slots, i, max))} disabled={max < 1} />
                  <Button small variant="ghost" title="✕" onPress={() => update(removeAt(slots, i))} testID={`remove-${slot.unitId}`} />
                </Row>
              </View>
            </Row>
          )
        })}
        {errors.length > 0 && slots.length > 0
          ? errors.map((e, i) => {
              const [key, opts] = armyErrorMessage(e)
              const raceKey = opts?.raceKey as string | undefined
              return <ErrorText key={i}>{t(key, raceKey ? { ...opts, race: t(raceKey) } : opts)}</ErrorText>
            })
          : null}
        <ErrorText>{error}</ErrorText>
        {message ? <P style={{ color: colors.green }}>{message}</P> : dirty ? <P dim>{t('castle.unsaved')}</P> : null}
        <Row style={s.actions}>
          <Button variant="secondary" title={t('common.save')} onPress={() => save(false)} disabled={!dirty || errors.length > 0} loading={busy} testID="save-army" />
          <Button title={t('castle.toBattle')} onPress={() => save(true)} disabled={errors.length > 0} loading={busy} testID="to-battle" />
        </Row>
      </Card>

      <Segmented
        scroll
        options={RACES.map((r) => ({ value: r, label: t(`race.${r}`) }))}
        value={race}
        onChange={setRace}
        testID="race-tab"
      />
      <View style={[s.raceLine, { backgroundColor: RACE_PALETTES[race].primary }]} />
      <P dim>
        {t(`race.${race}`)}: {hero.raceSkills[race]}
      </P>
      <P dim testID="hero-bonus">{t('castle.heroBonus', { attack: hero.stats.attack, defense: hero.stats.defense })}</P>
      {unitsOfRace(race).map((unit) => {
        const locked = !isUnitUnlocked(unit, hero.level, hero.raceSkills)
        const pair = pairSlotOf(slots, unit.id)
        return (
          <UnitCard
            key={unit.id}
            unit={unit}
            cost={unitCost(unit, hero.raceSkills)}
            heroAttack={hero.stats.attack}
            heroDefense={hero.stats.defense}
            locked={locked}
            lockText={locked ? lockReason(t, unit, hero.level) : ''}
            inArmy={slots.some((x) => x.unitId === unit.id)}
            pairName={pair ? t(getUnit(pair.unitId).nameKey) : null}
            canAdd={slots.length < MAX_STACKS}
            onAdd={() => update(addUnit(slots, unit.id, hero))}
            onSwap={() => update(swapVariant(slots, unit.id, hero))}
          />
        )
      })}
    </Screen>
  )
}

const s = StyleSheet.create({
  between: { justifyContent: 'space-between' },
  weight: { color: colors.gold, fontWeight: '700' },
  bar: { height: 8, borderRadius: 4, backgroundColor: colors.panelAlt, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.gold },
  slot: { alignItems: 'flex-start' },
  slotBody: { flex: 1, gap: 2 },
  slotControls: { gap: space.xs },
  slotName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  count: {
    width: 56,
    textAlign: 'center',
    color: colors.text,
    backgroundColor: colors.panelAlt,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
  },
  actions: { justifyContent: 'flex-end', marginTop: space.sm },
  raceLine: { height: 3, borderRadius: 2 },
})
