import { StyleSheet, Text, View } from 'react-native'
import { router, type Href } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { RACE_PALETTES } from '@hb/assets'
import { Button, Card, Loading, P, Row, Screen } from '../components/ui'
import { useSession } from '../store/session'
import { colors, space } from '../theme'

const ITEMS: { key: string; href?: Href }[] = [
  { key: 'bot', href: '/bot' },
  { key: 'castle', href: '/castle' },
  { key: 'profile', href: '/profile' },
  { key: 'pvp' },
  { key: 'private' },
  { key: 'leaderboard' },
  { key: 'shop' },
  { key: 'battlePass' },
  { key: 'settings', href: '/settings' },
]

export default function Menu() {
  const { t } = useTranslation()
  const hero = useSession((s) => s.hero)
  const user = useSession((s) => s.user)
  const isGuest = useSession((s) => s.isGuest)
  if (!hero) return <Loading />
  const points = hero.pendingStatPoints + hero.pendingRaceSkillPoints

  return (
    <Screen>
      <Card style={[s.heroCard, { borderColor: RACE_PALETTES[hero.startingRace].primary }]}>
        <Row>
          <Text style={s.name} testID="hero-display-name">
            {user?.displayName ?? '…'}
          </Text>
          {isGuest ? <Text style={s.badge}>{t('menu.guestBadge')}</Text> : null}
        </Row>
        <P dim testID="hero-level">
          {t('common.level', { level: hero.level })} · {t(`race.${hero.startingRace}`)}
        </P>
        {points > 0 ? <P style={{ color: colors.gold }}>{t('menu.pointsAvailable', { count: points })}</P> : null}
      </Card>
      <View style={s.items}>
        {ITEMS.map((item) => (
          <Button
            key={item.key}
            variant={item.key === 'bot' ? 'primary' : 'secondary'}
            title={item.href ? t(`menu.${item.key}`) : `${t(`menu.${item.key}`)} · ${t('common.comingSoon')}`}
            disabled={!item.href}
            onPress={() => item.href && router.push(item.href)}
            testID={`menu-${item.key}`}
          />
        ))}
      </View>
    </Screen>
  )
}

const s = StyleSheet.create({
  heroCard: { borderWidth: 2 },
  name: { color: colors.text, fontSize: 22, fontWeight: '700' },
  badge: {
    color: colors.bg,
    backgroundColor: colors.textDim,
    paddingHorizontal: space.sm,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
  },
  items: { gap: space.sm },
})
