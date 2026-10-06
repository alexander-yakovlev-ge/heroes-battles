import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import {
  MANA_PER_KNOWLEDGE,
  MAX_LEVEL,
  MAX_RACE_SKILL,
  RACES,
  STATS,
  HERO_INITIATIVE,
  expNeeded,
  getAvailableSpells,
  heroStrikeDamage,
  lightningBoltDamage,
  maxWeight,
} from '@hb/game-core'
import { RACE_PALETTES } from '@hb/assets'
import type { AllocatePointRequest } from '@hb/shared'
import { Button, Card, ErrorText, H2, Loading, P, Row, Screen } from '../components/ui'
import { api } from '../lib/api'
import { errorKey } from '../lib/errors'
import { useSession } from '../store/session'
import { colors, space } from '../theme'

/** Профиль героя и распределение очков (§11) */
export default function Profile() {
  const { t } = useTranslation()
  const hero = useSession((s) => s.hero)
  const setHero = useSession((s) => s.setHero)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!hero) return <Loading />

  async function allocate(req: AllocatePointRequest) {
    const key = req.kind === 'stat' ? req.stat : req.race
    setBusy(key)
    setError(null)
    try {
      setHero((await api.allocatePoint(req)).hero)
    } catch (e) {
      setError(t(errorKey(e)))
    } finally {
      setBusy(null)
    }
  }

  const spells = getAvailableSpells(hero.level, hero.raceSkills)

  /** Что даёт стат при текущих значениях героя */
  const statHint = (stat: (typeof STATS)[number]) => {
    const value = hero.stats[stat]
    switch (stat) {
      case 'attack':
        return t('profile.hint_attack', { value, strike: heroStrikeDamage(hero.level, value) })
      case 'defense':
        return t('profile.hint_defense', { value })
      case 'power':
        return t('profile.hint_power', { bolt: lightningBoltDamage(value) })
      case 'knowledge':
        return t('profile.hint_knowledge', { mana: value * MANA_PER_KNOWLEDGE })
    }
  }

  return (
    <Screen title={t('profile.title')} back>
      <Card>
        <H2 testID="profile-level">{t('common.level', { level: hero.level })}</H2>
        <P dim>
          {hero.level >= MAX_LEVEL
            ? t('profile.maxLevel')
            : t('profile.experience', { xp: hero.experience, needed: expNeeded(hero.level) })}
        </P>
        <P dim>{t('profile.xpOnlyPvp')}</P>
        <P>{t('profile.startingRace', { race: t(`race.${hero.startingRace}`) })}</P>
        <P>{t('profile.maxWeight', { weight: maxWeight(hero.level) })}</P>
        <P>{t('profile.mana', { mana: hero.stats.knowledge * MANA_PER_KNOWLEDGE })}</P>
      </Card>

      <ErrorText>{error}</ErrorText>

      <Card>
        <Row style={s.between}>
          <H2>{t('profile.stats')}</H2>
          <P style={hero.pendingStatPoints > 0 ? s.points : s.dim} testID="stat-points">
            {t('profile.statPoints', { count: hero.pendingStatPoints })}
          </P>
        </Row>
        {STATS.map((stat) => (
          <View key={stat}>
            <Row style={s.line}>
              <Text style={s.label}>{t(`stat.${stat}`)}</Text>
              <Text style={s.value} testID={`stat-${stat}`}>
                {hero.stats[stat]}
              </Text>
              <Button
                small
                title="+"
                disabled={hero.pendingStatPoints <= 0}
                loading={busy === stat}
                onPress={() => allocate({ kind: 'stat', stat })}
                testID={`add-stat-${stat}`}
              />
            </Row>
            <P dim style={s.small} testID={`hint-${stat}`}>
              {statHint(stat)}
            </P>
          </View>
        ))}
        <P dim style={[s.small, s.heroLine]} testID="hero-in-battle">
          {t('profile.heroInBattle', { init: HERO_INITIATIVE, strike: heroStrikeDamage(hero.level, hero.stats.attack), level: hero.level })}
        </P>
      </Card>

      <Card>
        <Row style={s.between}>
          <H2>{t('profile.raceSkills')}</H2>
          <P style={hero.pendingRaceSkillPoints > 0 ? s.points : s.dim} testID="race-points">
            {t('profile.racePoints', { count: hero.pendingRaceSkillPoints })}
          </P>
        </Row>
        {RACES.map((race) => (
          <Row key={race} style={s.line}>
            <View style={[s.dot, { backgroundColor: RACE_PALETTES[race].primary }]} />
            <Text style={s.label}>{t(`race.${race}`)}</Text>
            <Text style={s.value} testID={`skill-${race}`}>
              {hero.raceSkills[race]}
            </Text>
            <Button
              small
              title="+"
              disabled={hero.pendingRaceSkillPoints <= 0 || hero.raceSkills[race] >= MAX_RACE_SKILL}
              loading={busy === race}
              onPress={() => allocate({ kind: 'race', race })}
              testID={`add-skill-${race}`}
            />
          </Row>
        ))}
      </Card>

      <Card>
        <H2>{t('profile.spells')}</H2>
        {spells.length === 0 ? <P dim>{t('profile.noSpells')}</P> : null}
        {spells.map((id) => (
          <View key={id}>
            <P>{t(`spell.${id}`)}</P>
            <P dim style={s.small}>
              {t(`spellDesc.${id}`)}
            </P>
          </View>
        ))}
      </Card>
    </Screen>
  )
}

const s = StyleSheet.create({
  between: { justifyContent: 'space-between', flexWrap: 'wrap' },
  line: { minHeight: 36 },
  label: { color: colors.text, fontSize: 15, flex: 1 },
  value: { color: colors.gold, fontSize: 17, fontWeight: '700', minWidth: 32, textAlign: 'right', marginRight: space.sm },
  points: { color: colors.gold },
  dim: { color: colors.textDim },
  dot: { width: 10, height: 10, borderRadius: 5 },
  small: { fontSize: 13 },
  heroLine: { marginTop: space.sm, color: colors.gold },
})
