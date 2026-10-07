import { memo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { ALT_UNLOCK_SKILL, TIER_UNLOCK_LEVEL, type UnitTemplate } from '@hb/game-core'
import { UnitIcon } from '../../components/UnitIcon'
import { Button } from '../../components/ui'
import { fmtWeight } from '../../lib/format'
import { colors, radius, space } from '../../theme'

export function lockReason(
  t: (k: string, o?: Record<string, unknown>) => string,
  unit: UnitTemplate,
  level: number,
): string {
  if (level < TIER_UNLOCK_LEVEL[unit.tier]) return t('castle.locked', { level: TIER_UNLOCK_LEVEL[unit.tier] })
  return t('castle.lockedAlt', { race: t(`race.${unit.raceId}`), skill: ALT_UNLOCK_SKILL[unit.tier] })
}

/**
 * Карточка юнита в списке Замка: характеристики с учётом героя (его атака и защита прибавляются
 * к юнитам в бою), вес за единицу с учётом навыка расы, способности; добавление или замена варианта уровня.
 */
export const UnitCard = memo(function UnitCard({
  unit,
  cost,
  heroAttack,
  heroDefense,
  locked,
  lockText,
  inArmy,
  pairName,
  canAdd,
  onAdd,
  onSwap,
}: {
  unit: UnitTemplate
  cost: number
  heroAttack: number
  heroDefense: number
  locked: boolean
  lockText: string
  inArmy: boolean
  /** Другой вариант этого уровня уже в армии — его название; добавить можно только заменой */
  pairName: string | null
  canAdd: boolean
  onAdd: () => void
  onSwap: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const withHero = (base: number, bonus: number) => (bonus ? t('unitInfo.withHero', { value: base + bonus, hero: bonus }) : String(base))
  const stats: [string, string][] = [
    [t('unitInfo.attack'), withHero(unit.attack, heroAttack)],
    [t('unitInfo.defense'), withHero(unit.defense, heroDefense)],
    [t('unitInfo.damage'), `${unit.damageMin}–${unit.damageMax}`],
    [t('unitInfo.health'), String(unit.health)],
    [t('unitInfo.speed'), String(unit.speed)],
    [t('unitInfo.initiative'), String(unit.initiative)],
  ]
  if (unit.ranged) stats.push([t('unitInfo.shots'), String(unit.ranged.shots)], [t('unitInfo.range'), String(unit.ranged.range)])
  const tags = [t(`role.${unit.role}`)]
  if (unit.isFlying) tags.push(t('unitInfo.flying'))
  if (unit.size === 2) tags.push(t('unitInfo.large'))
  if (unit.variant === 'alt') tags.push(t('unitInfo.alt'))

  return (
    <View style={[s.card, locked && s.locked]} testID={`unit-${unit.id}`}>
      <Pressable style={s.head} onPress={() => setOpen(!open)} accessibilityRole="button">
        <UnitIcon unitId={unit.id} size={52} locked={locked} />
        <View style={s.info}>
          <Text style={s.name}>{t(unit.nameKey)}</Text>
          <Text style={s.meta}>
            {t('unitInfo.tier', { tier: unit.tier })} · {tags.join(' · ')}
          </Text>
          <Text style={locked ? s.lockText : s.meta}>{locked ? lockText : t('castle.costPerUnit', { cost: fmtWeight(cost) })}</Text>
          {!locked && pairName ? <Text style={s.lockText}>{t('castle.pairInArmy', { name: pairName })}</Text> : null}
        </View>
        {!locked ? (
          pairName ? (
            <Button small variant="secondary" title={t('castle.swap')} onPress={onSwap} testID={`swap-${unit.id}`} />
          ) : (
            <Button
              small
              variant={inArmy ? 'ghost' : 'secondary'}
              title={inArmy ? '✓' : t('castle.addStack')}
              disabled={inArmy || !canAdd}
              onPress={onAdd}
              testID={`add-${unit.id}`}
            />
          )
        ) : null}
      </Pressable>
      {/* Характеристики видны сразу — с учётом героя */}
      <View style={s.stats} testID={`stats-${unit.id}`}>
        {stats.map(([k, v]) => (
          <Text key={k} style={s.stat}>
            {k}: <Text style={s.statValue}>{v}</Text>
          </Text>
        ))}
      </View>
      <Text style={s.more} onPress={() => setOpen(!open)}>
        {open ? t('castle.hideAbilities') : t('castle.showAbilities')}
      </Text>
      {open ? (
        <View style={s.details}>
          <Text style={s.ability} testID={`role-hint-${unit.id}`}>
            {t(`unitInfo.roleHint_${unit.role}`)}
          </Text>
          {unit.abilities.map((a) => (
            <Text key={a} style={s.ability}>
              <Text style={s.abilityName}>{t(`ability.${a}`)}</Text> — {t(`abilityDesc.${a}`)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  )
})

const s = StyleSheet.create({
  card: { backgroundColor: colors.panel, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: space.sm },
  locked: { opacity: 0.75 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  info: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: colors.textDim, fontSize: 12 },
  lockText: { color: colors.gold, fontSize: 12 },
  details: { marginTop: space.sm, gap: space.xs },
  stats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 2, marginTop: space.sm },
  more: { color: colors.gold, fontSize: 12, marginTop: space.xs },
  stat: { color: colors.textDim, fontSize: 13 },
  statValue: { color: colors.text, fontWeight: '600' },
  ability: { color: colors.textDim, fontSize: 13 },
  abilityName: { color: colors.text, fontWeight: '600' },
})
