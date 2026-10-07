import {
  RACES,
  activeActor,
  applyAction,
  battleLevelOf,
  prepareArmy,
  validateDeployment,
  candidateActions,
  chooseBotAction,
  createBattle,
  createBotArmy,
  createBotHero,
  createRng,
  getSpell,
  getUnit,
  movePositions,
  type Action,
  type ArmySlot,
  type BattleEvent,
  type BattleState,
  type BotDifficulty,
  type Cell,
  type Hero,
  type Rng,
  type RngState,
  type SpellId,
  type UnitState,
} from '@hb/game-core'

/**
 * Локальный бой с ботом (§9): весь бой идёт на клиенте через game-core, Firebase не используется.
 * Здесь — чистая логика без UI: создание боя, варианты хода игрока, разбор нажатий, ход бота.
 */

export const BOT_UID = 'bot'

export interface BotBattle {
  state: BattleState
  rng: Rng
  playerUid: string
  difficulty: BotDifficulty
}

export interface Step {
  state: BattleState
  events: BattleEvent[]
}

/**
 * Подготовка к бою (§5.1): бот выбран, обе армии приведены к уровню боя и видны игроку.
 * rngState — состояние генератора на момент создания боя: превью поля и сам бой совпадают.
 */
export interface BotPreparation {
  hero: Hero
  botHero: Hero
  battleLevel: number
  /** Армия игрока после балансировки — от неё считается допустимое разделение стаков */
  playerArmy: ArmySlot[]
  botArmy: ArmySlot[]
  rngState: RngState
  difficulty: BotDifficulty
}

export function prepareBotBattle(hero: Hero, army: ArmySlot[], difficulty: BotDifficulty, seed: number): BotPreparation {
  const rng = createRng(seed)
  // Бот: герой того же уровня, армия того же веса со случайной основной расой (§9)
  const botHero = createBotHero(BOT_UID, hero.level, rng, rng.pick(RACES))
  const battleLevel = battleLevelOf([hero, botHero])
  return {
    hero,
    botHero,
    battleLevel,
    playerArmy: prepareArmy(hero, army, battleLevel, '1v1'),
    botArmy: prepareArmy(botHero, createBotArmy(botHero, '1v1', rng), battleLevel, '1v1'),
    rngState: rng.state(),
    difficulty,
  }
}

function battleInput(prep: BotPreparation, deployed: ArmySlot[]) {
  return {
    mode: '1v1' as const,
    participants: [
      { hero: prep.hero, team: 'red' as const, army: deployed },
      { hero: prep.botHero, team: 'blue' as const, army: prep.botArmy },
    ],
  }
}

/** Поле с расстановкой для экрана подготовки — то же, что будет в бою с этой армией */
export function previewBattle(prep: BotPreparation, deployed: ArmySlot[]): BattleState {
  return createBattle(battleInput(prep, deployed), createRng(prep.rngState)).state
}

export function startBotBattle(prep: BotPreparation, deployed: ArmySlot[]): { battle: BotBattle; events: BattleEvent[] } {
  if (validateDeployment(prep.playerArmy, deployed, '1v1').length > 0) throw new Error('Invalid deployment')
  const rng = createRng(prep.rngState)
  const { state, events } = createBattle(battleInput(prep, deployed), rng)
  return { battle: { state, rng, playerUid: prep.hero.uid, difficulty: prep.difficulty }, events }
}

export const isAlive = (u: UnitState) => u.count > 0

export function activeUnit(state: BattleState): UnitState | undefined {
  return state.activeUnitId ? state.units.find((u) => u.id === state.activeUnitId) : undefined
}

/** Сейчас ход игрока: его юнита или его героя (§5.3) */
export function isPlayerTurn(battle: BotBattle): boolean {
  return battle.state.status === 'active' && activeActor(battle.state) === battle.playerUid
}

/** Сейчас ход героя игрока */
export const isPlayerHeroTurn = (battle: BotBattle) => battle.state.status === 'active' && battle.state.activeHeroUid === battle.playerUid

/** Живой юнит, занимающий клетку (крупные — 2×2) */
export function unitAt(state: BattleState, cell: Cell): UnitState | undefined {
  return state.units.find((u) => {
    if (!isAlive(u)) return false
    const size = getUnit(u.templateId).size
    return cell.x >= u.x && cell.x < u.x + size && cell.y >= u.y && cell.y < u.y + size
  })
}

const cellKey = (c: Cell) => `${c.x},${c.y}`

/** Что игрок может сделать активным юнитом — сгруппировано для подсветки и разбора нажатий */
export interface PlayerOptions {
  /** Клетка назначения (левая верхняя для крупных) → действие перемещения */
  moves: Map<string, Action>
  /** id вражеского юнита → варианты атаки ближнего боя (с разных клеток) */
  attacks: Map<string, Extract<Action, { type: 'attack' }>[]>
  /** id цели → выстрел с места */
  shoots: Map<string, Action>
  /** id цели → выстрелы с перемещением на часть хода (§5.6) */
  shootMoves: Map<string, ShootOption[]>
  abilities: Map<string, Action>
  /** Заклинание → клетка цели → действие */
  casts: Map<SpellId, Map<string, Action>>
  canWait: boolean
  defend: Action | null
  wait: Action | null
  /** Ход героя: id вражеского юнита → удар героя */
  heroStrikes: Map<string, Action>
  heroPass: Action | null
}

export function playerOptions(battle: BotBattle): PlayerOptions {
  const opts: PlayerOptions = {
    moves: new Map(),
    attacks: new Map(),
    shoots: new Map(),
    shootMoves: new Map(),
    abilities: new Map(),
    casts: new Map(),
    canWait: false,
    defend: null,
    wait: null,
    heroStrikes: new Map(),
    heroPass: null,
  }
  if (!isPlayerTurn(battle)) return opts
  const { unit, casts, hero } = candidateActions(battle.state, battle.playerUid)
  for (const a of hero) {
    if (a.type === 'hero_strike') opts.heroStrikes.set(a.targetId, a)
    else if (a.type === 'hero_pass') opts.heroPass = a
  }
  for (const a of unit) {
    switch (a.type) {
      case 'move':
        opts.moves.set(cellKey(a.to), a)
        break
      case 'attack': {
        const list = opts.attacks.get(a.targetId) ?? []
        list.push(a)
        opts.attacks.set(a.targetId, list)
        break
      }
      case 'shoot':
        if (a.from) {
          const list = opts.shootMoves.get(a.targetId) ?? []
          list.push(a)
          opts.shootMoves.set(a.targetId, list)
        } else opts.shoots.set(a.targetId, a)
        break
      case 'ability':
        opts.abilities.set(a.targetId, a)
        break
      case 'defend':
        opts.defend = a
        break
      case 'wait':
        opts.wait = a
        opts.canWait = true
        break
    }
  }
  for (const a of casts) {
    if (a.type !== 'cast') continue
    const bySpell = opts.casts.get(a.spellId) ?? new Map<string, Action>()
    bySpell.set(cellKey(a.target), a)
    opts.casts.set(a.spellId, bySpell)
  }
  return opts
}

export type AttackOption = Extract<Action, { type: 'attack' }>
export type ShootOption = Extract<Action, { type: 'shoot' }>

export type TapResult =
  | { kind: 'action'; action: Action }
  /** Нажатие на врага — прицел: показать прогноз и клетки атаки, действие — следующим нажатием */
  | { kind: 'aim'; targetId: string }
  | { kind: 'none' }

export interface TapMode {
  /** Выбранное героем заклинание */
  spell: SpellId | null
  /** Герой выбрал удар */
  heroStrike: boolean
  /** Цель, на которую уже прицелились */
  aim: string | null
}

export const NO_MODE: TapMode = { spell: null, heroStrike: false, aim: null }

/** Клетка атаки по умолчанию: текущая позиция, если с неё можно бить, иначе ближайшая к юниту */
export function defaultAttack(battle: BotBattle, list: readonly AttackOption[]): AttackOption {
  const u = activeUnit(battle.state)!
  const dist = (a: AttackOption) => Math.max(Math.abs(a.from.x - u.x), Math.abs(a.from.y - u.y))
  return list.reduce((best, a) => (dist(a) < dist(best) ? a : best))
}

/** Вариант атаки, клетку которого (с учётом размера атакующего) накрывает нажатие */
function attackAtCell(battle: BotBattle, list: readonly AttackOption[], cell: Cell): AttackOption | undefined {
  const size = getUnit(activeUnit(battle.state)!.templateId).size
  const covering = list.filter((a) => cell.x >= a.from.x && cell.x < a.from.x + size && cell.y >= a.from.y && cell.y < a.from.y + size)
  if (covering.length <= 1) return covering[0]
  // Крупный атакующий: несколько вариантов накрывают клетку — берём тот, чей центр ближе
  const d = (a: AttackOption) => (a.from.x + size / 2 - (cell.x + 0.5)) ** 2 + (a.from.y + size / 2 - (cell.y + 0.5)) ** 2
  return covering.reduce((best, a) => (d(a) < d(best) ? a : best))
}

/** Выстрел с перемещением, клетку которого накрывает нажатие */
function shootAtCell(battle: BotBattle, list: readonly ShootOption[], cell: Cell): ShootOption | undefined {
  const size = getUnit(activeUnit(battle.state)!.templateId).size
  return list.find((a) => a.from && cell.x >= a.from.x && cell.x < a.from.x + size && cell.y >= a.from.y && cell.y < a.from.y + size)
}

/** Клетки, с которых стрелок может подойти и выстрелить в цель (для подсветки) */
export function shootCells(battle: BotBattle, opts: PlayerOptions, targetId: string): Set<string> {
  const size = getUnit(activeUnit(battle.state)!.templateId).size
  const cells = new Set<string>()
  for (const a of opts.shootMoves.get(targetId) ?? [])
    if (a.from) for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) cells.add(cellKey({ x: a.from.x + dx, y: a.from.y + dy }))
  return cells
}

/** Клетки, с которых можно атаковать цель (для подсветки) */
export function attackCells(battle: BotBattle, opts: PlayerOptions, targetId: string): Set<string> {
  const size = getUnit(activeUnit(battle.state)!.templateId).size
  const cells = new Set<string>()
  for (const a of opts.attacks.get(targetId) ?? [])
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) cells.add(cellKey({ x: a.from.x + dx, y: a.from.y + dy }))
  return cells
}

/** Действие по уже выбранной цели: удар героя, выстрел или удар с клетки по умолчанию */
export function aimedAction(battle: BotBattle, opts: PlayerOptions, targetId: string, heroStrike: boolean): Action | null {
  if (heroStrike) return opts.heroStrikes.get(targetId) ?? null
  const shoot = opts.shoots.get(targetId)
  if (shoot) return shoot
  const attacks = opts.attacks.get(targetId)
  return attacks && attacks.length > 0 ? defaultAttack(battle, attacks) : null
}

/**
 * Разбор нажатия на поле (tap — в координатах клеток). Атака — в два нажатия: первое на врага
 * прицеливается (прогноз урона, клетки атаки), второе — по той же цели (выстрел, удар героя или
 * удар с ближайшей клетки) или по подсвеченной клетке (удар с неё). Нажатие мимо снимает прицел.
 */
export function resolveTap(battle: BotBattle, opts: PlayerOptions, tap: { x: number; y: number }, mode: TapMode): TapResult {
  const cell = { x: Math.floor(tap.x), y: Math.floor(tap.y) }
  const target = unitAt(battle.state, cell)
  const action = (a: Action | null | undefined): TapResult => (a ? { kind: 'action', action: a } : { kind: 'none' })

  if (mode.spell) {
    const targets = opts.casts.get(mode.spell)
    if (!targets) return { kind: 'none' }
    if (getSpell(mode.spell).targeting === 'global') return action(targets.values().next().value)
    // Цель заклинания — клетка юнита (левая верхняя для крупных)
    const anchor = target ? { x: target.x, y: target.y } : cell
    return action(targets.get(cellKey(anchor)))
  }

  if (mode.heroStrike) {
    if (!target || !opts.heroStrikes.has(target.id)) return { kind: 'none' }
    return mode.aim === target.id ? action(opts.heroStrikes.get(target.id)) : { kind: 'aim', targetId: target.id }
  }

  if (mode.aim) {
    if (target?.id === mode.aim) return action(aimedAction(battle, opts, mode.aim, false))
    const shot = shootAtCell(battle, opts.shootMoves.get(mode.aim) ?? [], cell)
    if (shot) return action(shot)
    const chosen = attackAtCell(battle, opts.attacks.get(mode.aim) ?? [], cell)
    if (chosen) return action(chosen)
    // Нажатие мимо — обычная обработка (прицел снимается)
  }

  if (target) {
    if (opts.shoots.has(target.id) || opts.attacks.has(target.id)) return { kind: 'aim', targetId: target.id }
    return action(opts.abilities.get(target.id))
  }

  return action(opts.moves.get(cellKey(cell)))
}

export function applyPlayerAction(battle: BotBattle, action: Action): Step {
  return applyAction(battle.state, action, battle.playerUid, battle.rng)
}

/**
 * Путь перемещения по клеткам для анимации: восстанавливается по карте достижимости
 * (шаги от старта, как ищет движок), из конца к началу по соседям с шагом на 1 меньше.
 * Летающие и телепортирующиеся двигаются по прямой — для них путь из двух точек.
 */
export function movePath(state: BattleState, unitId: string, from: Cell, to: Cell): Cell[] {
  const u = state.units.find((x) => x.id === unitId)
  if (!u) return [from, to]
  const reach = movePositions(state, { ...u, x: from.x, y: from.y })
  const steps = (c: Cell) => reach.get(c.y * 1000 + c.x)?.steps
  const path: Cell[] = [to]
  let cur = to
  for (let guard = 0; guard < 64; guard++) {
    const n = steps(cur)
    if (n === undefined || n === 0) break
    let next: Cell | null = null
    let best = Infinity
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue
        const c = { x: cur.x + dx, y: cur.y + dy }
        if (steps(c) !== n - 1) continue
        const d = Math.hypot(c.x - from.x, c.y - from.y)
        if (d < best) {
          best = d
          next = c
        }
      }
    if (!next) break
    path.push(next)
    cur = next
  }
  if (cur.x !== from.x || cur.y !== from.y) return [from, to]
  return path.reverse()
}

/** Один ход бота (юнитом или героем); null — сейчас не ход бота */
export function botStep(battle: BotBattle): Step | null {
  const state = battle.state
  const actor = activeActor(state)
  if (state.status !== 'active' || !actor || actor === battle.playerUid) return null
  const action = chooseBotAction(state, actor, battle.difficulty, battle.rng)
  if (!action) throw new Error('Bot returned no action')
  return applyAction(state, action, actor, battle.rng)
}
