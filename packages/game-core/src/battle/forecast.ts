import type { Action, BattleState, UnitState } from '../types.js'
import { rectDistance } from '../grid.js'
import { canRetaliate, computeDamage, roleMultiplier } from './combat.js'
import { clone, findUnitState, hasAbility, isAdjacentToEnemy, rectOf, tmpl, totalHp } from './helpers.js'
import { movePositions } from './movement.js'

/**
 * Прогноз удара для подсказок (§10): диапазон урона, сколько существ погибнет,
 * действующие штрафы и бонусы, ожидаемый ответный удар. Случайные способности
 * (смертельный удар, уклонение бесплотных) учитываются только в границах диапазона.
 */
export interface DamageForecast {
  min: number
  max: number
  killsMin: number
  killsMax: number
  /** Штрафы стрельбы: дальше дальности, вплотную к врагу */
  penalties: ('range' | 'adjacent')[]
  /** Роль атакующего бьёт роль цели (треугольник ролей §5.6) */
  roleBonus: boolean
  /** Ответный удар цели (ближний бой): диапазон урона по атакующему */
  retaliation: { min: number; max: number } | null
}

/** Сколько существ стака погибнет от урона */
export function killsFrom(u: UnitState, damage: number): number {
  const left = totalHp(u) - damage
  if (left <= 0) return u.count
  return u.count - Math.ceil(left / tmpl(u).health)
}

/** Стак после урона (для оценки ответного удара) */
function afterDamage(u: UnitState, damage: number): UnitState {
  const left = Math.max(0, totalHp(u) - damage)
  const health = tmpl(u).health
  const count = Math.ceil(left / health)
  return { ...u, count, topHp: count > 0 ? left - (count - 1) * health : 0 }
}

export function forecastAction(state: BattleState, action: Action): DamageForecast | null {
  if (action.type === 'hero_strike') {
    const hero = state.heroes[action.heroUid]
    const target = findUnitState(state, action.targetId)
    if (!hero) return null
    const k = killsFrom(target, hero.strike)
    return { min: hero.strike, max: hero.strike, killsMin: k, killsMax: k, penalties: [], roleBonus: false, retaliation: null }
  }
  if (action.type !== 'attack' && action.type !== 'shoot') return null

  const s = clone(state)
  const attacker = findUnitState(s, action.unitId)
  const target = findUnitState(s, action.targetId)
  let chargeCells = 0
  if (action.type === 'attack') {
    chargeCells = movePositions(s, attacker).get(action.from.y * 1000 + action.from.x)?.steps ?? 0
    attacker.x = action.from.x
    attacker.y = action.from.y
  }
  const kind = action.type === 'shoot' ? 'ranged' : 'melee'
  const opts = { kind, chargeCells } as const
  const min = computeDamage(s, attacker, target, opts, null, 'min')
  const max = computeDamage(s, attacker, target, opts, null, 'max')

  const penalties: DamageForecast['penalties'] = []
  if (kind === 'ranged') {
    if (rectDistance(rectOf(attacker), rectOf(target)) > (tmpl(attacker).ranged?.range ?? 0) && !hasAbility(attacker, 'ignore_range_penalty'))
      penalties.push('range')
    if (isAdjacentToEnemy(s, attacker) && !hasAbility(attacker, 'no_melee_penalty')) penalties.push('adjacent')
  }

  let retaliation: DamageForecast['retaliation'] = null
  if (kind === 'melee' && canRetaliate(target) && !hasAbility(attacker, 'no_retaliation')) {
    // Меньше всего ответит стак после максимального урона, больше всего — после минимального
    const weakest = afterDamage(target, max)
    const strongest = afterDamage(target, min)
    if (strongest.count > 0)
      retaliation = {
        min: weakest.count > 0 ? computeDamage(s, weakest, attacker, { kind: 'retaliation' }, null, 'min') : 0,
        max: computeDamage(s, strongest, attacker, { kind: 'retaliation' }, null, 'max'),
      }
  }

  return {
    min,
    max,
    killsMin: killsFrom(target, min),
    killsMax: killsFrom(target, max),
    penalties,
    roleBonus: roleMultiplier(attacker, target) > 1,
    retaliation,
  }
}
