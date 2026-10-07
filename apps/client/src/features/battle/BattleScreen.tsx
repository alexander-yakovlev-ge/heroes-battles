import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import {
  forecastAction,
  getSpell,
  shootMoveLimit,
  getUnit,
  type Action,
  type ArmySlot,
  type BattleEvent,
  type BattleState,
  type RaceId,
  type SpellId,
  type UnitState,
} from '@hb/game-core'
import { HeroIcon } from '../../components/HeroIcon'
import { UnitIcon } from '../../components/UnitIcon'
import { Button, Loading, Row } from '../../components/ui'
import { useBattleSetup } from '../../store/battleSetup'
import { useSession } from '../../store/session'
import { colors, radius, space } from '../../theme'
import { buildSteps, playheadAt, totalDuration, type AnimStep } from './animation'
import { BattleBoard, type Highlights } from './BattleBoard'
import {
  BOT_UID,
  activeUnit,
  aimedAction,
  applyPlayerAction,
  attackCells,
  botStep,
  shootCells,
  isPlayerHeroTurn,
  isPlayerTurn,
  movePath,
  playerOptions,
  prepareBotBattle,
  resolveTap,
  startBotBattle,
  unitAt,
  type BotBattle,
  type BotPreparation,
  type Step,
} from './controller'
import { forecastText } from './forecastText'
import { HelpModal } from './HelpModal'
import { formatEvent, type LogLine } from './log'
import { Preparation } from './Preparation'
import { fitCell, makeProjection, type Projection } from './projection'
import { TurnQueue } from './TurnQueue'

const BOT_DELAY_MS = 280
const MAX_LOG = 80

interface BattleView {
  state: BattleState
  prev: BattleState
  steps: AnimStep[]
  start: number
}

/**
 * Экран боя с ботом (§10): подготовка, поле на Skia, шкала очереди с героями, ход героя
 * (удар или заклинание), атака в два нажатия с прогнозом урона, журнал, справка.
 */
export default function BattleScreen() {
  const { t } = useTranslation()
  const hero = useSession((s) => s.hero)
  const preset = useSession((s) => s.preset)
  const playerName = useSession((s) => s.user?.displayName ?? '')
  const { difficulty, seed, battleId } = useBattleSetup()
  const insets = useSafeAreaInsets()
  const win = useWindowDimensions()

  const battleRef = useRef<BotBattle | null>(null)
  const [view, setView] = useState<BattleView | null>(null)
  const [now, setNow] = useState(0)
  /** Ход героя: выбранное заклинание или удар героя */
  const [spell, setSpell] = useState<SpellId | null>(null)
  const [spellMenu, setSpellMenu] = useState(false)
  const [heroStrike, setHeroStrike] = useState(false)
  /** Цель, на которую прицелились первым нажатием */
  const [aim, setAim] = useState<string | null>(null)
  const [inspect, setInspect] = useState<string | null>(null)
  /** Подготовка к бою: противник известен, игрок делит стаки (§5.1) */
  const [prep, setPrep] = useState<BotPreparation | null>(null)
  const [deployed, setDeployed] = useState<ArmySlot[]>([])
  const [heroRaces, setHeroRaces] = useState<Record<string, RaceId>>({})
  const [log, setLog] = useState<LogLine[]>([])
  const [showLog, setShowLog] = useState(Platform.OS === 'web')
  const [confirmSurrender, setConfirmSurrender] = useState(false)
  const [help, setHelp] = useState(false)
  const logId = useRef(0)
  const projRef = useRef<Projection | null>(null)

  const heroNames = useMemo(() => ({ [hero?.uid ?? '']: playerName || t('battle.you'), [BOT_UID]: t('battle.enemy') }), [hero?.uid, playerName, t])

  const pushLog = useCallback(
    (state: BattleState, events: readonly BattleEvent[]) => {
      const lines: LogLine[] = []
      for (const ev of events) {
        const line = formatEvent(t, state, ev, heroNames)
        if (line) lines.push({ ...line, id: logId.current++ })
      }
      if (lines.length) setLog((l) => [...lines.reverse(), ...l].slice(0, MAX_LOG))
    },
    [t, heroNames],
  )

  const show = useCallback(
    (prev: BattleState, step: Step) => {
      const battle = battleRef.current!
      battle.state = step.state
      pushLog(step.state, step.events)
      const start = performance.now()
      setNow(start)
      const positions = new Map(prev.units.map((u) => [u.id, { x: u.x, y: u.y }]))
      const template = (id: string) => getUnit(prev.units.find((u) => u.id === id)!.templateId)
      const steps = buildSteps(step.events, {
        positions,
        pathOf: (id, from, to) => movePath(prev, id, from, to),
        // Летающие и телепортирующиеся перемещаются по прямой
        isFlying: (id) => template(id).isFlying || template(id).abilities.includes('teleport'),
      })
      setView({ state: step.state, prev, steps, start })
    },
    [pushLog],
  )

  const resetModes = () => {
    setSpell(null)
    setSpellMenu(false)
    setHeroStrike(false)
    setAim(null)
    setInspect(null)
  }

  // Создание боя: при старте с экрана «Бой с ботом» или после загрузки данных (перезагрузка страницы)
  const createdFor = useRef<number | null>(null)
  const canStart = !!hero && !!preset && preset.slots.length > 0
  useEffect(() => {
    if (!hero || !preset || preset.slots.length === 0 || createdFor.current === battleId) return
    createdFor.current = battleId
    const p = prepareBotBattle(hero, preset.slots, difficulty, seed)
    battleRef.current = null
    setView(null)
    setPrep(p)
    setDeployed(p.playerArmy)
    setHeroRaces({ [hero.uid]: hero.startingRace, [BOT_UID]: p.botHero.startingRace })
    setLog([])
    resetModes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleId, canStart])

  const beginBattle = useCallback(() => {
    if (!prep) return
    const { battle, events } = startBotBattle(prep, deployed)
    battleRef.current = battle
    setPrep(null)
    show(battle.state, { state: battle.state, events })
  }, [prep, deployed, show])

  const animating = view !== null && now - view.start < totalDuration(view.steps)

  // Цикл анимации
  useEffect(() => {
    if (!view || !animating) return
    let raf = 0
    const tick = () => {
      setNow(performance.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [view, animating])

  // Ход бота (юнитом или героем) после окончания анимации
  useEffect(() => {
    const battle = battleRef.current
    if (!battle || !view || animating) return
    if (battle.state.status !== 'active' || isPlayerTurn(battle)) return
    const timer = setTimeout(() => {
      const prev = battle.state
      const step = botStep(battle)
      if (step) show(prev, step)
    }, BOT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [view, animating, show])

  const battle = battleRef.current
  const state = view?.state
  const playerTurn = !!battle && !animating && isPlayerTurn(battle)
  const heroTurn = playerTurn && !!battle && isPlayerHeroTurn(battle)
  const options = useMemo(() => (battle && playerTurn ? playerOptions(battle) : null), [battle, playerTurn, view])

  const highlights: Highlights = useMemo(() => {
    const h: Highlights = {
      moves: new Set(),
      targets: new Set(),
      spellCells: new Set(),
      attackCells: new Set(),
      shootCells: new Set(),
      activeId: state?.activeUnitId ?? null,
    }
    if (!options || !battle) return h
    if (spell) {
      const targets = options.casts.get(spell)
      if (targets) for (const k of targets.keys()) h.spellCells.add(k)
      return h
    }
    if (heroStrike) {
      if (aim) h.targets.add(aim)
      else for (const id of options.heroStrikes.keys()) h.targets.add(id)
      return h
    }
    if (aim) {
      h.targets.add(aim)
      h.attackCells = attackCells(battle, options, aim)
      h.shootCells = shootCells(battle, options, aim)
      return h
    }
    for (const k of options.moves.keys()) h.moves.add(k)
    for (const id of options.attacks.keys()) h.targets.add(id)
    for (const id of options.shoots.keys()) h.targets.add(id)
    return h
  }, [options, spell, heroStrike, aim, battle, state?.activeUnitId])

  /** Прогноз удара по цели прицела */
  const forecast = useMemo(() => {
    if (!battle || !options || !aim || !state) return null
    const action = aimedAction(battle, options, aim, heroStrike)
    return action ? forecastAction(state, action) : null
  }, [battle, options, aim, heroStrike, state])

  const act = useCallback(
    (action: Action | null) => {
      const b = battleRef.current
      if (!b || !action) return
      const prev = b.state
      resetModes()
      show(prev, applyPlayerAction(b, action))
    },
    [show],
  )

  const onTap = useCallback(
    (x: number, y: number) => {
      const b = battleRef.current
      if (!b) return
      const tapped = unitAt(b.state, { x: Math.floor(x), y: Math.floor(y) })?.id ?? null
      if (!options) {
        setInspect(tapped)
        return
      }
      const result = resolveTap(b, options, { x, y }, { spell, heroStrike, aim })
      if (result.kind === 'action') act(result.action)
      else if (result.kind === 'aim') {
        setAim(result.targetId)
        setInspect(result.targetId)
      } else {
        setAim(null)
        setInspect(tapped)
      }
    },
    [options, spell, heroStrike, aim, act],
  )

  // Тестовый хук для e2e на web: Playwright кликает по холсту по координатам клеток
  useEffect(() => {
    if (Platform.OS !== 'web') return
    if (!state) {
      ;(globalThis as { __hbBattle?: unknown }).__hbBattle = { phase: prep ? 'prep' : 'loading', stacks: deployed.length }
      return
    }
    ;(globalThis as { __hbBattle?: unknown }).__hbBattle = {
      phase: 'battle',
      status: state.status,
      round: state.round,
      playerTurn,
      heroTurn,
      aim,
      forecast,
      attackCells: battle && options && aim && !heroStrike ? [...attackCells(battle, options, aim)] : [],
      shootCells: battle && options && aim && !heroStrike ? [...shootCells(battle, options, aim)] : [],
      shootMoves: options ? Object.fromEntries([...options.shootMoves].map(([id, list]) => [id, list.map((a) => `${a.from!.x},${a.from!.y}`)])) : {},
      attacks: options ? Object.fromEntries([...options.attacks].map(([id, list]) => [id, list.map((a) => `${a.from.x},${a.from.y}`)])) : {},
      shoots: options ? [...options.shoots.keys()] : [],
      heroStrikes: options ? [...options.heroStrikes.keys()] : [],
      /** Центр клетки на экране относительно поля — для кликов в e2e */
      screenOf: (x: number, y: number) => projRef.current?.project(x + 0.5, y + 0.5),
      moves: options ? [...options.moves.keys()] : [],
      units: state.units.map((u) => ({ id: u.id, team: u.team, x: u.x, y: u.y, count: u.count })),
      activeId: state.activeUnitId,
      queue: state.queue,
    }
  })

  // Поле во всю ширину, но не выше ~62% экрана
  const projFor = (w: number, h: number) => {
    const availW = Math.min(win.width - space.md * 2, 1100)
    const availH = (win.height - insets.top - insets.bottom) * 0.62
    return makeProjection(w, h, fitCell(w, h, availW, availH))
  }

  if (!hero || !preset) return <Loading />
  if (prep) {
    return (
      <View style={[s.screen, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.sm }]}>
        <Preparation prep={prep} deployed={deployed} onChange={setDeployed} onStart={beginBattle} projFor={projFor} enemyName={t('battle.enemy')} />
      </View>
    )
  }
  if (!view || !state || !battle) return <Loading />

  const playhead = animating ? playheadAt(view.steps, now - view.start) : { index: view.steps.length, t: 0 }
  const myHero = state.heroes[hero.uid]!
  const active = activeUnit(state)
  const proj = projFor(state.grid.width, state.grid.height)
  projRef.current = proj
  const inspected = inspect ? state.units.find((u) => u.id === inspect && u.count > 0) : undefined
  const finished = state.status === 'finished' && !animating
  const won = state.winner === 'red'

  let hint: ReactNode = null
  if (aim) {
    hint = (
      <Row style={s.hintRow}>
        <View style={{ flex: 1 }}>
          {forecast ? (
            <Text style={s.forecast} testID="forecast">
              {forecastText(t, forecast)}
            </Text>
          ) : null}
          <Text style={s.dim}>
            {t('battle.aimHint')}
            {!heroStrike && options?.attacks.has(aim) && !options.shoots.has(aim) ? ` ${t('battle.aimHintCells')}` : ''}
            {!heroStrike && options?.shootMoves.has(aim) ? ` ${t('battle.aimHintShootCells', { cells: activeUnit(state) ? shootMoveLimit(activeUnit(state)!) : 1 })}` : ''}.
          </Text>
        </View>
        <Button small variant="ghost" title={t('common.cancel')} onPress={() => setAim(null)} testID="cancel-aim" />
      </Row>
    )
  } else if (spell) {
    hint = (
      <Row style={s.hintRow}>
        <Text style={s.hint}>
          {t(`spell.${spell}`)}: {t('battle.chooseTarget')}
        </Text>
        <Button small variant="ghost" title={t('common.cancel')} onPress={() => setSpell(null)} testID="cancel-spell" />
      </Row>
    )
  } else if (heroTurn) {
    hint = (
      <Row>
        <HeroIcon race={hero.startingRace} size={32} />
        <Text style={s.hint}>{heroStrike ? t('battle.heroStrikeChoose') : t('battle.heroChoose')}</Text>
      </Row>
    )
  } else if (inspected) {
    hint = <UnitInfo unit={inspected} state={state} />
  } else if (active) {
    hint = (
      <Row>
        <UnitIcon unitId={active.templateId} size={28} />
        <Text style={s.hint} numberOfLines={2}>
          {t(getUnit(active.templateId).nameKey)} · {active.count}
          {active.shotsLeft !== undefined ? ` · ${t('battle.shots', { count: active.shotsLeft })}` : ''}
          {playerTurn ? ` — ${t('battle.hint')}` : ''}
        </Text>
      </Row>
    )
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.sm }]}>
      <Row style={s.top}>
        <Text style={s.round}>{t('battle.round', { round: state.round })}</Text>
        <Text style={s.dim}>{t('battle.battleLevel', { level: state.battleLevel })}</Text>
        <Text style={[s.turn, { color: playerTurn ? colors.gold : colors.textDim }]} testID="turn-indicator">
          {state.status !== 'active'
            ? ''
            : state.activeHeroUid
              ? `${t('battle.heroTurn')}${state.activeHeroUid === hero.uid ? '' : ` (${t('battle.enemy')})`}`
              : isPlayerTurn(battle)
                ? t('battle.yourTurn')
                : t('battle.enemyTurn')}
        </Text>
        <Text style={s.mana} testID="mana">
          {t('battle.mana', { mana: myHero.mana, max: myHero.maxMana })}
        </Text>
      </Row>

      <TurnQueue state={state} heroRaces={heroRaces} />

      <View style={s.boardWrap}>
        <BattleBoard state={state} prevState={view.prev} steps={view.steps} playhead={playhead} proj={proj} highlights={highlights} onTap={onTap} />
      </View>

      <View style={s.info}>{hint}</View>

      <Row style={s.actions}>
        {heroTurn ? (
          <>
            <Button
              small
              variant={heroStrike ? 'primary' : 'secondary'}
              title={t('battle.heroStrike', { damage: myHero.strike })}
              onPress={() => {
                setSpell(null)
                setSpellMenu(false)
                setAim(null)
                setHeroStrike(!heroStrike)
              }}
              testID="action-hero-strike"
            />
            <Button
              small
              variant={spellMenu || spell ? 'primary' : 'secondary'}
              title={t('battle.spells')}
              disabled={myHero.spells.length === 0}
              onPress={() => {
                setHeroStrike(false)
                setAim(null)
                setSpell(null)
                setSpellMenu(!spellMenu)
              }}
              testID="action-spells"
            />
            <Button small variant="secondary" title={t('battle.heroPass')} onPress={() => act(options?.heroPass ?? null)} testID="action-hero-pass" />
          </>
        ) : (
          <>
            <Button small variant="secondary" title={t('battle.wait')} disabled={!playerTurn || !options?.wait} onPress={() => act(options?.wait ?? null)} testID="action-wait" />
            <Button
              small
              variant="secondary"
              title={t('battle.defend')}
              disabled={!playerTurn || !options?.defend}
              onPress={() => act(options?.defend ?? null)}
              testID="action-defend"
            />
          </>
        )}
        <Button small variant="ghost" title="?" onPress={() => setHelp(true)} testID="action-help" />
        <Button small variant="ghost" title={t('battle.log')} onPress={() => setShowLog(!showLog)} testID="action-log" />
        <Button small variant="danger" title={t('battle.surrender')} disabled={state.status !== 'active'} onPress={() => setConfirmSurrender(true)} testID="action-surrender" />
      </Row>

      {spellMenu && heroTurn ? (
        <View style={s.spellMenu} testID="spell-menu">
          {myHero.spells.map((id) => {
            const sp = getSpell(id)
            const available = !!options?.casts.get(id)?.size
            return (
              <Pressable
                key={id}
                disabled={!available}
                onPress={() => {
                  setSpellMenu(false)
                  if (sp.targeting === 'global') act(options!.casts.get(id)!.values().next().value ?? null)
                  else setSpell(id)
                }}
                style={[s.spell, !available && s.spellOff]}
                testID={`spell-${id}`}
              >
                <Text style={s.spellName}>
                  {t(`spell.${id}`)} · {sp.mana}
                </Text>
                <Text style={s.spellDesc}>{myHero.mana < sp.mana ? t('battle.noMana') : t(`spellDesc.${id}`)}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      {showLog ? (
        <ScrollView style={s.log} testID="battle-log">
          {log.map((l) => (
            <Text key={l.id} style={[s.logLine, l.team === 'red' && { color: '#f0a99f' }, l.team === 'blue' && { color: '#a9c8f0' }]}>
              {l.text}
            </Text>
          ))}
        </ScrollView>
      ) : null}

      <HelpModal visible={help} onClose={() => setHelp(false)} />

      <Modal transparent visible={confirmSurrender} animationType="fade" onRequestClose={() => setConfirmSurrender(false)}>
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>{t('battle.surrenderConfirm')}</Text>
            <Row style={s.modalRow}>
              <Button variant="secondary" title={t('common.cancel')} onPress={() => setConfirmSurrender(false)} />
              <Button
                variant="danger"
                title={t('battle.surrender')}
                onPress={() => {
                  setConfirmSurrender(false)
                  act({ type: 'surrender', heroUid: hero.uid })
                }}
                testID="confirm-surrender"
              />
            </Row>
          </View>
        </View>
      </Modal>

      <Modal transparent visible={finished} animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modal} testID="battle-result">
            <Text style={[s.resultTitle, { color: state.winner === 'draw' ? colors.text : won ? colors.gold : colors.red }]} testID="result-title">
              {state.winner === 'draw' ? t('battle.draw') : won ? t('battle.victory') : t('battle.defeat')}
            </Text>
            <Text style={s.dim}>
              {state.endReason === 'elimination' && !won ? t('battle.reason_elimination_lost') : t(`battle.reason_${state.endReason ?? 'elimination'}`)}
            </Text>
            <Row style={s.modalRow}>
              <Button
                variant="secondary"
                title={t('battle.toMenu')}
                onPress={() => (router.canDismiss() ? router.dismissTo('/menu') : router.replace('/menu'))}
                testID="result-menu"
              />
              <Button title={t('battle.again')} onPress={() => useBattleSetup.getState().start(difficulty)} testID="result-again" />
            </Row>
          </View>
        </View>
      </Modal>
    </View>
  )
}

/** Карточка юнита по нажатию: характеристики с учётом героя, роль, эффекты */
function UnitInfo({ unit, state }: { unit: UnitState; state: BattleState }) {
  const { t } = useTranslation()
  const u = getUnit(unit.templateId)
  const heroStats = state.heroes[unit.owner]?.stats
  const withHero = (base: number, bonus: number) => (bonus ? t('unitInfo.withHero', { value: base + bonus, hero: bonus }) : String(base))
  const extra = [t(`unitInfo.roleHint_${u.role}`)]
  if (unit.defending) extra.push(t('battle.defending'))
  extra.push(...unit.effects.map((e) => t(`effect.${e.id}`)))
  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <UnitIcon unitId={unit.templateId} size={40} />
      <View style={{ flex: 1 }} testID="unit-info">
        <Text style={[s.hint, { color: unit.team === 'red' ? '#f0a99f' : '#a9c8f0' }]}>
          {t(u.nameKey)} · {unit.count}
        </Text>
        <Text style={s.dim}>
          {t('unitInfo.attack')} {withHero(u.attack, heroStats?.attack ?? 0)} · {t('unitInfo.defense')} {withHero(u.defense, heroStats?.defense ?? 0)} ·{' '}
          {t('unitInfo.damage')} {u.damageMin}–{u.damageMax} · {t('unitInfo.health')} {u.health} · {t('unitInfo.speed')} {u.speed} ·{' '}
          {t('unitInfo.initiative')} {u.initiative}
          {u.ranged ? ` · ${t('unitInfo.range')} ${u.ranged.range}` : ''}
          {unit.shotsLeft !== undefined ? ` · ${t('battle.shots', { count: unit.shotsLeft })}` : ''}
        </Text>
        <Text style={s.dim}>{extra.join(' · ')}</Text>
      </View>
    </Row>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: space.md, gap: space.sm },
  top: { flexWrap: 'wrap', columnGap: space.md },
  round: { color: colors.text, fontWeight: '700', fontSize: 16 },
  dim: { color: colors.textDim, fontSize: 13 },
  turn: { fontWeight: '700', fontSize: 15 },
  mana: { color: '#9ec3ff', marginLeft: 'auto', fontWeight: '600' },
  boardWrap: { alignItems: 'center' },
  info: { minHeight: 48, justifyContent: 'center' },
  hintRow: { alignItems: 'center' },
  hint: { color: colors.text, fontSize: 14, flexShrink: 1 },
  forecast: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  actions: { flexWrap: 'wrap', justifyContent: 'center' },
  spellMenu: { backgroundColor: colors.panel, borderRadius: radius, borderWidth: 1, borderColor: colors.border, padding: space.sm, gap: space.xs },
  spell: { padding: space.sm, borderRadius: radius, backgroundColor: colors.panelAlt },
  spellOff: { opacity: 0.45 },
  spellName: { color: colors.text, fontWeight: '700' },
  spellDesc: { color: colors.textDim, fontSize: 12 },
  log: { flex: 1, minHeight: 80, backgroundColor: colors.panel, borderRadius: radius, padding: space.sm },
  logLine: { color: colors.textDim, fontSize: 12, marginBottom: 2 },
  modalBg: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: space.lg },
  modal: { backgroundColor: colors.panel, borderRadius: radius * 2, borderWidth: 1, borderColor: colors.border, padding: space.xl, gap: space.md, minWidth: 280, alignItems: 'center' },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  modalRow: { marginTop: space.sm },
  resultTitle: { fontSize: 30, fontWeight: '900' },
})
