import { AURA_DEFENSE_BONUS, DEFEND_BONUS, SHOOT_MOVE_FRACTION } from '../constants.js'
import { getUnit } from '../data/units.js'
import { key, obstacleSet, rectCells, rectsAdjacent, type Rect } from '../grid.js'
import type { AbilityId, BattleHero, BattleState, Cell, EffectId, Team, UnitState, UnitTemplate } from '../types.js'

export class IllegalActionError extends Error {
  constructor(public readonly code: string) {
    super(code)
    this.name = 'IllegalActionError'
  }
}

export const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

export const tmpl = (u: UnitState): UnitTemplate => getUnit(u.templateId)
export const alive = (u: UnitState) => u.count > 0
export const rectOf = (u: UnitState, at?: Cell): Rect => ({ x: at?.x ?? u.x, y: at?.y ?? u.y, size: tmpl(u).size })
export const hasAbility = (u: UnitState, a: AbilityId) => tmpl(u).abilities.includes(a)
export const hasEffect = (u: UnitState, id: EffectId) => u.effects.some((e) => e.id === id && e.roundsLeft > 0)
export const effectValue = (u: UnitState, id: EffectId) =>
  u.effects.filter((e) => e.id === id && e.roundsLeft > 0).reduce((s, e) => s + (e.value ?? 0), 0)

export const otherTeam = (t: Team): Team => (t === 'red' ? 'blue' : 'red')

export function findUnitState(state: BattleState, id: string): UnitState {
  const u = state.units.find((x) => x.id === id)
  if (!u) throw new IllegalActionError('unknown_unit')
  return u
}

export const heroOf = (state: BattleState, u: UnitState): BattleHero | undefined => state.heroes[u.owner]

export const totalHp = (u: UnitState) => (u.count > 0 ? (u.count - 1) * tmpl(u).health + u.topHp : 0)

export const aliveUnits = (state: BattleState) => state.units.filter(alive)
export const enemiesOf = (state: BattleState, u: UnitState) => state.units.filter((x) => alive(x) && x.team !== u.team)
export const alliesOf = (state: BattleState, u: UnitState) =>
  state.units.filter((x) => alive(x) && x.team === u.team && x.id !== u.id)

/** Препятствия + клетки живых юнитов (кроме exceptId) */
export function blockedCells(state: BattleState, exceptId?: string): Set<number> {
  const set = obstacleSet(state.grid)
  for (const u of state.units) {
    if (!alive(u) || u.id === exceptId) continue
    for (const c of rectCells(rectOf(u))) set.add(key(c.x, c.y))
  }
  return set
}

export function unitAtCell(state: BattleState, cell: Cell): UnitState | undefined {
  return state.units.find((u) => {
    if (!alive(u)) return false
    const s = tmpl(u).size
    return cell.x >= u.x && cell.x < u.x + s && cell.y >= u.y && cell.y < u.y + s
  })
}

export const isAdjacentToEnemy = (state: BattleState, u: UnitState, at?: Cell) =>
  enemiesOf(state, u).some((e) => rectsAdjacent(rectOf(u, at), rectOf(e)))

/** Сколько клеток стрелок может пройти перед выстрелом в тот же ход (§5.6) */
export const shootMoveLimit = (u: UnitState) => Math.max(1, Math.floor(effectiveSpeed(u) * SHOOT_MOVE_FRACTION))

const adjacentAllyWith = (state: BattleState, u: UnitState, a: AbilityId) =>
  alliesOf(state, u).some((x) => hasAbility(x, a) && rectsAdjacent(rectOf(u), rectOf(x)))

export function effectiveAttack(state: BattleState, u: UnitState, melee: boolean): number {
  const t = tmpl(u)
  const hero = heroOf(state, u)
  let atk = t.attack + (hero?.stats.attack ?? 0) + effectValue(u, 'divine_strength') - effectValue(u, 'curse')
  if (melee) atk += effectValue(u, 'bloodlust')
  return Math.max(0, atk)
}

export function effectiveDefense(state: BattleState, u: UnitState): number {
  const t = tmpl(u)
  const hero = heroOf(state, u)
  let def = t.defense + (hero?.stats.defense ?? 0) + effectValue(u, 'stone_skin')
  if (u.defending) def *= DEFEND_BONUS
  if (adjacentAllyWith(state, u, 'aura_defense')) def *= AURA_DEFENSE_BONUS
  return Math.max(0, def)
}

export function effectiveInitiative(state: BattleState, u: UnitState): number {
  let init =
    tmpl(u).initiative +
    (hasEffect(u, 'haste') ? 3 : 0) -
    (hasEffect(u, 'slow') ? 3 : 0) +
    (hasEffect(u, 'war_cry') ? 2 : 0) -
    effectValue(u, 'initiative_drain')
  const dread = enemiesOf(state, u).some((e) => hasAbility(e, 'aura_dread') && rectsAdjacent(rectOf(u), rectOf(e)))
  if (dread) init -= 1
  if (hasEffect(u, 'stunned')) init *= 0.5
  return Math.max(1, init)
}

export function effectiveSpeed(u: UnitState): number {
  return Math.max(1, tmpl(u).speed - (hasEffect(u, 'slow') ? 1 : 0) - (hasEffect(u, 'earthquake') ? 1 : 0))
}

export const hasMagicResist = (state: BattleState, u: UnitState) =>
  hasAbility(u, 'magic_resist') || hasAbility(u, 'aura_magic_resist') || adjacentAllyWith(state, u, 'aura_magic_resist')

/** Вес стака в бою — используется для доли армии, силы `caster`, сжигания маны */
export const stackWeight = (u: UnitState) => u.count * tmpl(u).weight
