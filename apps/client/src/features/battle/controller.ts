import {
  RACES,
  applyAction,
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

export function startBotBattle(hero: Hero, army: ArmySlot[], difficulty: BotDifficulty, seed: number): { battle: BotBattle; events: BattleEvent[] } {
  const rng = createRng(seed)
  // Бот: герой того же уровня, армия того же веса со случайной основной расой (§9)
  const botHero = createBotHero(BOT_UID, hero.level, rng, rng.pick(RACES))
  const botArmy = createBotArmy(botHero, '1v1', rng)
  const { state, events } = createBattle(
    {
      mode: '1v1',
      participants: [
        { hero, team: 'red', army },
        { hero: botHero, team: 'blue', army: botArmy },
      ],
    },
    rng,
  )
  return { battle: { state, rng, playerUid: hero.uid, difficulty }, events }
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

/**
 * Действие по нажатию на поле. tap — точка нажатия в координатах клеток (дробная):
 * при атаке ближнего боя выбирается клетка, с которой бить, ближайшая к точке нажатия —
 * игрок указывает сторону, нажимая ближе к нужному краю цели.
 */
export function resolveTap(battle: BotBattle, opts: PlayerOptions, tap: { x: number; y: number }, spell: SpellId | null): Action | null {
  const cell = { x: Math.floor(tap.x), y: Math.floor(tap.y) }
  const target = unitAt(battle.state, cell)

  if (spell) {
    const targets = opts.casts.get(spell)
    if (!targets) return null
    if (getSpell(spell).targeting === 'global') return targets.values().next().value ?? null
    // Цель заклинания — клетка юнита (левая верхняя для крупных)
    const anchor = target ? { x: target.x, y: target.y } : cell
    return targets.get(cellKey(anchor)) ?? null
  }

  if (target) {
    const shoot = opts.shoots.get(target.id)
    if (shoot) return shoot
    const attacks = opts.attacks.get(target.id)
    if (attacks && attacks.length > 0) {
      const size = getUnit(activeUnit(battle.state)!.templateId).size
      let best = attacks[0]!
      let bestDist = Infinity
      for (const a of attacks) {
        const cx = a.from.x + size / 2
        const cy = a.from.y + size / 2
        const d = (cx - tap.x) ** 2 + (cy - tap.y) ** 2
        if (d < bestDist) {
          bestDist = d
          best = a
        }
      }
      return best
    }
    const ability = opts.abilities.get(target.id)
    if (ability) return ability
    return null
  }

  return opts.moves.get(cellKey(cell)) ?? null
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
