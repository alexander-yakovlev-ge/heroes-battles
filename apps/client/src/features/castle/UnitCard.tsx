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

/** Карточка юнита в списке Замка: характеристики, способности, кнопка добавления */
export const UnitCard = memo(function UnitCard({
  unit,
  cost,
  locked,
  lockText,
  inArmy,
  canAdd,
  onAdd,
}: {
  unit: UnitTemplate
  cost: number
  locked: boolean
  lockText: string
  inArmy: boolean
  canAdd: boolean
  onAdd: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const stats: [string, string][] = [
    [t('unitInfo.attack'), String(unit.attack)],
    [t('unitInfo.defense'), String(unit.defense)],
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
        </View>
        {!locked ? (
          <Button
            small
            variant={inArmy ? 'ghost' : 'secondary'}
            title={inArmy ? '✓' : t('castle.addStack')}
            disabled={inArmy || !canAdd}
            onPress={onAdd}
            testID={`add-${unit.id}`}
          />
        ) : null}
      </Pressable>
      {open ? (
        <View style={s.details}>
          <View style={s.stats}>
            {stats.map(([k, v]) => (
              <Text key={k} style={s.stat}>
                {k}: <Text style={s.statValue}>{v}</Text>
              </Text>
            ))}
          </View>
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
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  stat: { color: colors.textDim, fontSize: 13 },
  statValue: { color: colors.text, fontWeight: '600' },
  ability: { color: colors.textDim, fontSize: 13 },
  abilityName: { color: colors.text, fontWeight: '600' },
})
