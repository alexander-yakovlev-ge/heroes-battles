import {
  RACES,
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

export function isPlayerTurn(battle: BotBattle): boolean {
  const u = activeUnit(battle.state)
  return battle.state.status === 'active' && u?.owner === battle.playerUid
}

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
  shoots: Map<string, Action>
  abilities: Map<string, Action>
  /** Заклинание → клетка цели → действие */
  casts: Map<SpellId, Map<string, Action>>
  canWait: boolean
  defend: Action | null
  wait: Action | null
}

export function playerOptions(battle: BotBattle): PlayerOptions {
  const opts: PlayerOptions = {
    moves: new Map(),
    attacks: new Map(),
    shoots: new Map(),
    abilities: new Map(),
    casts: new Map(),
    canWait: false,
    defend: null,
    wait: null,
  }
  if (!isPlayerTurn(battle)) return opts
  const { unit, casts } = candidateActions(battle.state, battle.playerUid)
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
        opts.shoots.set(a.targetId, a)
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

export type TapResult =
  | { kind: 'action'; action: Action }
  /** У цели несколько клеток атаки — игрок выбирает, откуда бить */
  | { kind: 'chooseAttack'; targetId: string }
  | { kind: 'none' }

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

/** Клетки, с которых можно атаковать цель (для подсветки) */
export function attackCells(battle: BotBattle, opts: PlayerOptions, targetId: string): Set<string> {
  const size = getUnit(activeUnit(battle.state)!.templateId).size
  const cells = new Set<string>()
  for (const a of opts.attacks.get(targetId) ?? [])
    for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) cells.add(cellKey({ x: a.from.x + dx, y: a.from.y + dy }))
  return cells
}

/**
 * Разбор нажатия на поле (tap — в координатах клеток). Ближний бой: если подойти к цели можно
 * с нескольких клеток, первое нажатие выбирает цель, второе — клетку атаки (или цель ещё раз —
 * удар с клетки по умолчанию). Нажатие мимо отменяет выбор.
 */
export function resolveTap(
  battle: BotBattle,
  opts: PlayerOptions,
  tap: { x: number; y: number },
  mode: { spell: SpellId | null; attackTarget: string | null },
): TapResult {
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

  if (mode.attackTarget) {
    const list = opts.attacks.get(mode.attackTarget) ?? []
    if (target?.id === mode.attackTarget && list.length > 0) return action(defaultAttack(battle, list))
    const chosen = attackAtCell(battle, list, cell)
    if (chosen) return action(chosen)
    // Нажатие мимо клеток атаки — обычная обработка (выбор снимается)
  }

  if (target) {
    const shoot = opts.shoots.get(target.id)
    if (shoot) return action(shoot)
    const attacks = opts.attacks.get(target.id)
    if (attacks && attacks.length === 1) return action(attacks[0])
    if (attacks && attacks.length > 1) return { kind: 'chooseAttack', targetId: target.id }
    return action(opts.abilities.get(target.id))
  }

  return action(opts.moves.get(cellKey(cell)))
}

export function applyPlayerAction(battle: BotBattle, action: Action): Step {
  const uid = action.type === 'cast' || action.type === 'surrender' ? action.heroUid : battle.playerUid
  return applyAction(battle.state, action, uid, battle.rng)
}

/** Один ход бота; null — сейчас не ход бота */
export function botStep(battle: BotBattle): Step | null {
  const state = battle.state
  const u = activeUnit(state)
  if (state.status !== 'active' || !u || u.owner === battle.playerUid) return null
  const action = chooseBotAction(state, u.owner, battle.difficulty, battle.rng)
  if (!action) throw new Error('Bot returned no action')
  return applyAction(state, action, u.owner, battle.rng)
}
