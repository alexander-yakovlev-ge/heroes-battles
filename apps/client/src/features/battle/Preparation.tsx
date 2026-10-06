import { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useTranslation } from 'react-i18next'
import { MODE_CONFIG, canMerge, canSplit, getUnit, mergeStack, splitStack, type ArmySlot } from '@hb/game-core'
import { UnitIcon } from '../../components/UnitIcon'
import { Button, Row } from '../../components/ui'
import { colors, radius, space } from '../../theme'
import { BattleBoard, type Highlights } from './BattleBoard'
import { previewBattle, unitAt, type BotPreparation } from './controller'
import type { Projection } from './projection'

const MAX_STACKS = MODE_CONFIG['1v1'].stacksPerHero
const NO_STEPS: never[] = []
const PLAYHEAD = { index: 0, t: 0 }

/**
 * Подготовка к бою (§5.1): противник и расстановка видны; игрок делит стаки или объединяет их обратно.
 * Поле пересчитывается при каждом изменении — так игрок видит, где встанут новые стаки.
 */
export function Preparation({
  prep,
  deployed,
  onChange,
  onStart,
  projFor,
  enemyName,
}: {
  prep: BotPreparation
  deployed: ArmySlot[]
  onChange: (army: ArmySlot[]) => void
  onStart: () => void
  projFor: (width: number, height: number) => Projection
  enemyName: string
}) {
  const { t } = useTranslation()
  const preview = useMemo(() => previewBattle(prep, deployed), [prep, deployed])
  const [splitting, setSplitting] = useState<{ index: number; count: number } | null>(null)
  const [inspect, setInspect] = useState<string | null>(null)
  const proj = projFor(preview.grid.width, preview.grid.height)

  const highlights: Highlights = useMemo(
    () => ({ moves: new Set(), targets: new Set(), spellCells: new Set(), attackCells: new Set(), activeId: inspect }),
    [inspect],
  )

  function confirmSplit() {
    if (!splitting) return
    onChange(splitStack(deployed, splitting.index, splitting.count, '1v1'))
    setSplitting(null)
  }

  return (
    <ScrollView contentContainerStyle={s.wrap} testID="preparation">
      <Text style={s.title}>{t('prep.title')}</Text>
      <Text style={s.dim}>{t('prep.hint')}</Text>
      <View style={s.board}>
        <BattleBoard
          state={preview}
          prevState={preview}
          steps={NO_STEPS}
          playhead={PLAYHEAD}
          proj={proj}
          highlights={highlights}
          onTap={(x, y) => setInspect(unitAt(preview, { x: Math.floor(x), y: Math.floor(y) })?.id ?? null)}
        />
      </View>

      <View style={s.card}>
        <Text style={s.h}>{t('prep.enemyArmy', { name: enemyName, level: prep.battleLevel })}</Text>
        <Row style={s.wrapRow}>
          {prep.botArmy.map((slot, i) => (
            <View key={`${slot.unitId}-${i}`} style={s.enemyStack}>
              <UnitIcon unitId={slot.unitId} size={40} />
              <Text style={s.enemyCount}>
                {t(getUnit(slot.unitId).nameKey)} · {slot.count}
              </Text>
            </View>
          ))}
        </Row>
      </View>

      <View style={s.card}>
        <Text style={s.h} testID="prep-stacks">
          {t('prep.yourArmy', { count: deployed.length, max: MAX_STACKS })}
        </Text>
        {deployed.map((slot, i) => {
          const editing = splitting?.index === i
          return (
            <View key={i} style={s.stack} testID={`prep-stack-${i}`}>
              <Row>
                <UnitIcon unitId={slot.unitId} size={40} />
                <Text style={s.name} numberOfLines={1}>
                  {t(getUnit(slot.unitId).nameKey)}
                </Text>
                <Text style={s.count} testID={`prep-count-${i}`}>
                  {editing ? `${slot.count - splitting.count} + ${splitting.count}` : slot.count}
                </Text>
              </Row>
              {editing ? (
                <Row style={s.actions}>
                  <Button small variant="secondary" title="−" disabled={splitting.count <= 1} onPress={() => setSplitting({ index: i, count: splitting.count - 1 })} />
                  <Text style={s.splitCount}>{splitting.count}</Text>
                  <Button
                    small
                    variant="secondary"
                    title="+"
                    disabled={splitting.count >= slot.count - 1}
                    onPress={() => setSplitting({ index: i, count: splitting.count + 1 })}
                    testID={`prep-split-more-${i}`}
                  />
                  <Button small title={t('prep.splitOff')} onPress={confirmSplit} testID={`prep-split-confirm-${i}`} />
                  <Button small variant="ghost" title={t('common.cancel')} onPress={() => setSplitting(null)} />
                </Row>
              ) : (
                <Row style={s.actions}>
                  <Button
                    small
                    variant="secondary"
                    title={t('prep.split')}
                    disabled={!canSplit(deployed, i, '1v1')}
                    onPress={() => setSplitting({ index: i, count: Math.floor(slot.count / 2) })}
                    testID={`prep-split-${i}`}
                  />
                  {canMerge(deployed, i) ? (
                    <Button small variant="ghost" title={t('prep.merge')} onPress={() => onChange(mergeStack(deployed, i))} testID={`prep-merge-${i}`} />
                  ) : null}
                </Row>
              )}
            </View>
          )
        })}
      </View>

      <Button title={t('prep.start')} onPress={onStart} testID="prep-start" />
    </ScrollView>
  )
}

const s = StyleSheet.create({
  wrap: { gap: space.md, paddingBottom: space.xl },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  dim: { color: colors.textDim, fontSize: 13 },
  board: { alignItems: 'center' },
  card: { backgroundColor: colors.panel, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: space.md, gap: space.sm },
  h: { color: colors.text, fontSize: 15, fontWeight: '700' },
  wrapRow: { flexWrap: 'wrap' },
  enemyStack: { alignItems: 'center', gap: 2, maxWidth: 90 },
  enemyCount: { color: colors.textDim, fontSize: 11, textAlign: 'center' },
  stack: { gap: space.xs, paddingVertical: space.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { color: colors.text, fontSize: 14, flex: 1 },
  count: { color: colors.gold, fontSize: 15, fontWeight: '700' },
  actions: { flexWrap: 'wrap', marginLeft: 48 },
  splitCount: { color: colors.text, minWidth: 32, textAlign: 'center', fontWeight: '700' },
})
