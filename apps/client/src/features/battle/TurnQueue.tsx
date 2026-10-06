import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { heroUidOf, isHeroQueueId, type BattleState, type RaceId } from '@hb/game-core'
import { HeroIcon } from '../../components/HeroIcon'
import { UnitIcon } from '../../components/UnitIcon'
import { colors, radius } from '../../theme'

/** Шкала очереди хода (§5.3): юниты и герои по инициативе; первый — тот, кто ходит */
export function TurnQueue({ state, heroRaces }: { state: BattleState; heroRaces: Record<string, RaceId> }) {
  const { t } = useTranslation()
  const items = state.queue
    .map((id) => {
      if (isHeroQueueId(id)) {
        const uid = heroUidOf(id)
        const hero = state.heroes[uid]
        return hero ? { key: id, team: hero.team, hero: uid } : null
      }
      const u = state.units.find((x) => x.id === id)
      return u && u.count > 0 ? { key: id, team: u.team, templateId: u.templateId } : null
    })
    .filter((x) => x !== null)
    .slice(0, 16)

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scroller} contentContainerStyle={s.queue} testID="queue">
      {items.map((item, i) => {
        const size = i === 0 ? 40 : 32
        return (
          <View
            key={item.key}
            style={[s.item, { borderColor: item.team === 'red' ? colors.redTeam : colors.blueTeam }, i === 0 && s.active]}
            testID={item.hero ? `queue-hero-${item.hero}` : undefined}
          >
            {item.hero ? <HeroIcon race={heroRaces[item.hero] ?? 'knight'} size={size} /> : <UnitIcon unitId={item.templateId!} size={size} />}
            {item.hero ? <Text style={s.heroLabel}>{t('battle.hero')}</Text> : null}
          </View>
        )
      })}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroller: { flexGrow: 0 },
  queue: { gap: 4, alignItems: 'center' },
  item: { borderWidth: 2, borderRadius: radius, padding: 1, alignItems: 'center' },
  active: { borderWidth: 3 },
  heroLabel: { color: colors.gold, fontSize: 9, fontWeight: '700' },
})
