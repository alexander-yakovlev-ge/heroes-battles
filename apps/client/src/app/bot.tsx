import { useState } from 'react'
import { router } from 'expo-router'
import { useTranslation } from 'react-i18next'
import type { BotDifficulty } from '@hb/game-core'
import { UnitIcon } from '../components/UnitIcon'
import { Button, Card, H2, Loading, P, Row, Screen, Segmented } from '../components/ui'
import { validate, weightOf } from '../features/castle/army'
import { fmtWeight } from '../lib/format'
import { useBattleSetup } from '../store/battleSetup'
import { useSession } from '../store/session'

/** Бой с ботом: выбор сложности и немедленный старт (§9, §10) */
export default function Bot() {
  const { t } = useTranslation()
  const hero = useSession((s) => s.hero)
  const preset = useSession((s) => s.preset)
  const [difficulty, setDifficulty] = useState<BotDifficulty>(useBattleSetup.getState().difficulty)
  if (!hero) return <Loading />

  const slots = preset?.slots ?? []
  const ready = slots.length > 0 && validate(slots, hero).length === 0

  function start() {
    useBattleSetup.getState().start(difficulty)
    router.push('/battle')
  }

  return (
    <Screen title={t('bot.title')} back>
      <Card>
        <H2>{t('bot.difficulty')}</H2>
        <Segmented
          options={[
            { value: 'easy', label: t('bot.easy') },
            { value: 'normal', label: t('bot.normal') },
          ]}
          value={difficulty}
          onChange={setDifficulty}
          testID="difficulty"
        />
        <P dim>{difficulty === 'easy' ? t('bot.easyHint') : t('bot.normalHint')}</P>
      </Card>
      <Card>
        {ready ? (
          <>
            <P>{t('bot.yourArmy', { stacks: slots.length, weight: fmtWeight(weightOf(slots, hero)) })}</P>
            <Row style={{ flexWrap: 'wrap' }}>
              {slots.map((s) => (
                <UnitIcon key={s.unitId} unitId={s.unitId} size={40} />
              ))}
            </Row>
          </>
        ) : (
          <P>{t('bot.needArmy')}</P>
        )}
        <Button variant="secondary" small title={t('menu.castle')} onPress={() => router.push('/castle')} testID="open-castle" />
      </Card>
      <P dim>{t('bot.noProgress')}</P>
      <Button title={t('bot.start')} onPress={start} disabled={!ready} testID="start-battle" />
    </Screen>
  )
}
