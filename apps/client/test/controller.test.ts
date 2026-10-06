import { describe, expect, it } from 'vitest'
import { createHero, forecastAction, getUnit, maxWeight, splitStack, type Hero } from '@hb/game-core'
import {
  NO_MODE,
  activeUnit,
  aimedAction,
  applyPlayerAction,
  attackCells,
  botStep,
  defaultAttack,
  isPlayerHeroTurn,
  isPlayerTurn,
  playerOptions,
  prepareBotBattle,
  previewBattle,
  resolveTap,
  startBotBattle,
  unitAt,
  type BotBattle,
} from '../src/features/battle/controller'
import { addUnit, maxCountAt, validate, weightOf } from '../src/features/castle/army'
import { buildSteps, lastHitIndex, playheadAt, totalDuration, unitOpacity, visualPosition } from '../src/features/battle/animation'

const hero: Hero = createHero('player', 'necro', 5)
const noMode = NO_MODE
const army = [
  { unitId: 'necro_skeleton', count: 20 },
  { unitId: 'necro_ghost', count: 5 },
  { unitId: 'necro_zombie', count: 6 },
]

/** Довести бой до хода юнита игрока: ходит бот, герой игрока пропускает ход */
function untilPlayer(battle: BotBattle) {
  for (let i = 0; i < 400 && battle.state.status === 'active'; i++) {
    if (isPlayerHeroTurn(battle)) battle.state = applyPlayerAction(battle, playerOptions(battle).heroPass!).state
    else if (!isPlayerTurn(battle)) battle.state = botStep(battle)!.state
    else return
  }
}

/** Довести бой до хода героя игрока */
function untilPlayerHero(battle: BotBattle) {
  for (let i = 0; i < 400 && battle.state.status === 'active' && !isPlayerHeroTurn(battle); i++) {
    if (isPlayerTurn(battle)) battle.state = applyPlayerAction(battle, playerOptions(battle).defend!).state
    else battle.state = botStep(battle)!.state
  }
}

/** Бой без изменений расстановки */
function start(difficulty: 'easy' | 'normal', seed: number) {
  const prep = prepareBotBattle(hero, army, difficulty, seed)
  return startBotBattle(prep, prep.playerArmy)
}

describe('бой с ботом: контроллер', () => {
  it('создаёт бой 1v1: игрок — red, бот — blue, бой детерминирован по seed', () => {
    const a = start('normal', 42).battle
    const b = start('normal', 42).battle
    expect(a.state.teams).toEqual({ red: ['player'], blue: ['bot'] })
    expect(a.state.battleLevel).toBe(5)
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state))
    expect(a.state.units.filter((u) => u.team === 'red').map((u) => u.templateId).sort()).toEqual(army.map((s) => s.unitId).sort())
  })

  it('варианты хода: перемещения, защита; нажатие на подсвеченную клетку — перемещение', () => {
    const { battle } = start('easy', 7)
    untilPlayer(battle)
    const opts = playerOptions(battle)
    expect(opts.defend).not.toBeNull()
    expect(opts.moves.size).toBeGreaterThan(0)
    const [k, move] = [...opts.moves.entries()][0]!
    const [x, y] = k.split(',').map(Number) as [number, number]
    expect(resolveTap(battle, opts, { x: x + 0.5, y: y + 0.5 }, noMode)).toEqual({ kind: 'action', action: move })
    const unitId = activeUnit(battle.state)!.id
    const next = applyPlayerAction(battle, move).state
    const moved = next.units.find((u) => u.id === unitId)!
    expect([moved.x, moved.y]).toEqual([x, y])
  })

  it('атака в два нажатия: прицел, затем удар по цели или с выбранной клетки', () => {
    const { battle } = start('easy', 3)
    for (let guard = 0; guard < 300 && battle.state.status === 'active'; guard++) {
      untilPlayer(battle)
      const opts = playerOptions(battle)
      const entry = [...opts.attacks.entries()].find(([id, list]) => list.length >= 2 && !opts.shoots.has(id))
      if (entry) {
        const [targetId, list] = entry
        const target = battle.state.units.find((u) => u.id === targetId)!
        const onTarget = { x: target.x + 0.5, y: target.y + 0.5 }
        // Первое нажатие на цель — прицел
        expect(resolveTap(battle, opts, onTarget, noMode)).toEqual({ kind: 'aim', targetId })
        const mode = { ...NO_MODE, aim: targetId }
        // Каждая подсвеченная клетка ведёт к атаке именно с неё
        expect(attackCells(battle, opts, targetId).size).toBeGreaterThanOrEqual(list.length)
        for (const a of list) {
          expect(resolveTap(battle, opts, { x: a.from.x + 0.5, y: a.from.y + 0.5 }, mode)).toEqual({ kind: 'action', action: a })
        }
        // Повторное нажатие на цель — удар с клетки по умолчанию (ближайшей к юниту)
        expect(resolveTap(battle, opts, onTarget, mode)).toEqual({ kind: 'action', action: defaultAttack(battle, list) })
        expect(aimedAction(battle, opts, targetId, false)).toEqual(defaultAttack(battle, list))
        return
      }
      battle.state = applyPlayerAction(battle, opts.defend!).state
    }
    throw new Error('не нашлось атаки с несколькими клетками')
  })

  it('бой доигрывается до конца, если игрок только защищается', () => {
    const { battle } = start('normal', 11)
    for (let i = 0; i < 3000 && battle.state.status === 'active'; i++) {
      if (isPlayerHeroTurn(battle)) battle.state = applyPlayerAction(battle, playerOptions(battle).heroPass!).state
      else if (isPlayerTurn(battle)) battle.state = applyPlayerAction(battle, playerOptions(battle).defend!).state
      else battle.state = botStep(battle)!.state
    }
    expect(battle.state.status).toBe('finished')
    expect(battle.state.winner).not.toBeNull()
  })

  it('сдача завершает бой победой бота', () => {
    const { battle } = start('easy', 5)
    untilPlayer(battle)
    const next = applyPlayerAction(battle, { type: 'surrender', heroUid: 'player' }).state
    expect(next.status).toBe('finished')
    expect(next.winner).toBe('blue')
    expect(next.endReason).toBe('surrender')
  })

  it('unitAt учитывает крупных юнитов 2×2', () => {
    const { battle } = start('easy', 9)
    const big = battle.state.units.find((u) => getUnit(u.templateId).size === 2)
    if (big) expect(unitAt(battle.state, { x: big.x + 1, y: big.y + 1 })?.id).toBe(big.id)
    const small = battle.state.units.find((u) => getUnit(u.templateId).size === 1)!
    expect(unitAt(battle.state, { x: small.x, y: small.y })?.id).toBe(small.id)
  })
})

describe('ход героя', () => {
  it('герой в очереди; удар героя — в два нажатия по врагу, урон из прогноза', () => {
    const { battle } = start('easy', 31)
    expect(battle.state.queue.some((id) => id === 'hero:player') || battle.state.activeHeroUid === 'player').toBe(true)
    untilPlayerHero(battle)
    const opts = playerOptions(battle)
    expect(opts.defend).toBeNull()
    expect(opts.heroPass).not.toBeNull()
    const [targetId, strike] = [...opts.heroStrikes.entries()][0]!
    const target = battle.state.units.find((u) => u.id === targetId)!
    const tap = { x: target.x + 0.5, y: target.y + 0.5 }
    const mode = { ...NO_MODE, heroStrike: true }
    expect(resolveTap(battle, opts, tap, mode)).toEqual({ kind: 'aim', targetId })
    expect(resolveTap(battle, opts, tap, { ...mode, aim: targetId })).toEqual({ kind: 'action', action: strike })
    // Без выбора «удар» нажатие на врага в ход героя ничего не делает
    expect(resolveTap(battle, opts, tap, NO_MODE).kind).toBe('none')
    const forecast = forecastAction(battle.state, strike)!
    const { events } = applyPlayerAction(battle, strike)
    const dmg = events.find((e) => e.type === 'damage' && e.targetId === targetId)
    expect(dmg && 'damage' in dmg && dmg.damage).toBe(forecast.min)
  })

  it('заклинание — только в ход героя: выбор заклинания, затем цель', () => {
    const lvl10 = createHero('player', 'necro', 10)
    const prep = prepareBotBattle(lvl10, army, 'easy', 41)
    const { battle } = startBotBattle(prep, prep.playerArmy)
    untilPlayer(battle)
    expect(playerOptions(battle).casts.size).toBe(0)
    untilPlayerHero(battle)
    const opts = playerOptions(battle)
    const bolts = opts.casts.get('lightning_bolt')!
    const [cellKey, cast] = [...bolts.entries()][0]!
    const [x, y] = cellKey.split(',').map(Number) as [number, number]
    expect(resolveTap(battle, opts, { x: x + 0.5, y: y + 0.5 }, { ...NO_MODE, spell: 'lightning_bolt' })).toEqual({ kind: 'action', action: cast })
  })
})

describe('подготовка к бою', () => {
  it('армия бота известна заранее; превью поля совпадает с началом боя', () => {
    const prep = prepareBotBattle(hero, army, 'normal', 21)
    expect(prep.botArmy.length).toBeGreaterThan(0)
    const preview = previewBattle(prep, prep.playerArmy)
    const { battle } = startBotBattle(prep, prep.playerArmy)
    expect(preview.grid).toEqual(battle.state.grid)
    expect(preview.units.map((u) => [u.templateId, u.count, u.x, u.y])).toEqual(battle.state.units.map((u) => [u.templateId, u.count, u.x, u.y]))
  })

  it('разделённый стак выходит в бой двумя стаками; чужая численность не принимается', () => {
    const prep = prepareBotBattle(hero, army, 'normal', 22)
    const deployed = splitStack(prep.playerArmy, 0, 5, '1v1')
    const { battle } = startBotBattle(prep, deployed)
    const red = battle.state.units.filter((u) => u.team === 'red')
    expect(red).toHaveLength(prep.playerArmy.length + 1)
    expect(red.filter((u) => u.templateId === prep.playerArmy[0]!.unitId).map((u) => u.count).sort((a, b) => a - b)).toEqual(
      [5, prep.playerArmy[0]!.count - 5].sort((a, b) => a - b),
    )
    // Расстановка на превью — та же, что в бою
    expect(previewBattle(prep, deployed).units.map((u) => [u.x, u.y])).toEqual(battle.state.units.map((u) => [u.x, u.y]))
    expect(() => startBotBattle(prep, [{ ...prep.playerArmy[0]!, count: 999 }, ...prep.playerArmy.slice(1)])).toThrow()
  })
})

describe('анимации', () => {
  it('перемещение, удар, урон и гибель превращаются в шаги по порядку', () => {
    const steps = buildSteps([
      { type: 'move', unitId: 'a', from: { x: 0, y: 0 }, to: { x: 3, y: 0 } },
      { type: 'damage', sourceId: 'a', targetId: 'b', damage: 10, kills: 2, kind: 'melee' },
      { type: 'damage', sourceId: 'b', targetId: 'a', damage: 4, kills: 0, kind: 'retaliation' },
      { type: 'death', unitId: 'b' },
    ])
    expect(steps.map((s) => s.kind)).toEqual(['move', 'strike', 'hits', 'strike', 'hits', 'death'])
    expect(lastHitIndex('b', steps)).toBe(2)
    expect(lastHitIndex('a', steps)).toBe(4)
    expect(playheadAt(steps, totalDuration(steps) + 1).index).toBe(steps.length)
  })

  it('видимая позиция идёт от начала пути к концу, гибель — затухание', () => {
    const steps = buildSteps([
      { type: 'move', unitId: 'a', from: { x: 0, y: 0 }, to: { x: 4, y: 2 } },
      { type: 'death', unitId: 'a' },
    ])
    const u = { id: 'a', x: 4, y: 2, count: 0 } as never
    expect(visualPosition(u, steps, { index: 0, t: 0 })).toEqual({ x: 0, y: 0 })
    expect(visualPosition(u, steps, { index: 0, t: 1 })).toEqual({ x: 4, y: 2 })
    expect(visualPosition(u, steps, { index: 2, t: 0 })).toEqual({ x: 4, y: 2 })
    expect(unitOpacity(u, steps, { index: 0, t: 0.5 })).toBe(1)
    expect(unitOpacity(u, steps, { index: 1, t: 0.5 })).toBeCloseTo(0.5)
    expect(unitOpacity(u, steps, { index: 2, t: 0 })).toBe(0)
  })
})

describe('Замок: редактор армии', () => {
  it('добавленный стак заполняет оставшийся вес; армия проходит проверку', () => {
    let slots = addUnit([], 'necro_skeleton', hero)
    expect(weightOf(slots, hero)).toBeLessThanOrEqual(maxWeight(hero.level) + 1e-9)
    expect(validate(slots, hero)).toEqual([])
    // Вес занят первым стаком — он уступает половину, второй стак занимает освободившееся место
    const full = slots[0]!.count
    slots = addUnit(slots, 'necro_zombie', hero)
    expect(slots[0]!.count).toBeLessThan(full)
    expect(slots[1]!.count).toBeGreaterThan(1)
    expect(validate(slots, hero)).toEqual([])
    expect(maxCountAt(slots, 1, hero)).toBeGreaterThanOrEqual(slots[1]!.count)
    // Третий стак — снова равные доли
    slots = addUnit(slots, 'necro_ghost', hero)
    expect(slots).toHaveLength(3)
    expect(validate(slots, hero)).toEqual([])
  })

  it('закрытый юнит и пустая армия — ошибки', () => {
    expect(validate([], hero).map((e) => e.code)).toContain('empty')
    expect(validate([{ unitId: 'necro_bone_dragon', count: 1 }], hero).map((e) => e.code)).toContain('locked_unit')
  })
})
