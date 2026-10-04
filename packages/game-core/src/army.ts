import { ALT_UNLOCK_SKILL, MODE_CONFIG, TIER_UNLOCK_LEVEL, WEIGHT_MULTIPLIER, maxWeight } from './constants.js'
import { baseUnitOf, findUnit, getUnit } from './data/units.js'
import type { ArmySlot, Mode, RaceId, Tier, UnitTemplate } from './types.js'

const EPS = 1e-9

export function unitCost(unit: UnitTemplate, raceSkills: Record<RaceId, number>): number {
  return unit.weight * WEIGHT_MULTIPLIER[raceSkills[unit.raceId]]!
}

export function armyWeight(slots: readonly ArmySlot[], raceSkills: Record<RaceId, number>): number {
  return slots.reduce((sum, s) => sum + unitCost(getUnit(s.unitId), raceSkills) * s.count, 0)
}

/** Открыт ли юнит при данном уровне героя и навыках рас (§4.2) */
export function isUnitUnlocked(unit: UnitTemplate, level: number, raceSkills: Record<RaceId, number>): boolean {
  if (level < TIER_UNLOCK_LEVEL[unit.tier]) return false
  return unit.variant === 'base' || raceSkills[unit.raceId] >= ALT_UNLOCK_SKILL[unit.tier]
}

export type ArmyError =
  | { code: 'empty' }
  | { code: 'too_many_stacks'; max: number }
  | { code: 'unknown_unit'; unitId: string }
  | { code: 'locked_unit'; unitId: string }
  | { code: 'bad_count'; unitId: string }
  | { code: 'overweight'; weight: number; max: number }

export function validateArmy(
  slots: readonly ArmySlot[],
  level: number,
  raceSkills: Record<RaceId, number>,
  mode: Mode,
): ArmyError[] {
  const errors: ArmyError[] = []
  const max = MODE_CONFIG[mode].stacksPerHero
  if (slots.length === 0) errors.push({ code: 'empty' })
  if (slots.length > max) errors.push({ code: 'too_many_stacks', max })
  let weight = 0
  for (const s of slots) {
    const unit = findUnit(s.unitId)
    if (!unit) {
      errors.push({ code: 'unknown_unit', unitId: s.unitId })
      continue
    }
    if (!Number.isInteger(s.count) || s.count < 1) errors.push({ code: 'bad_count', unitId: s.unitId })
    if (!isUnitUnlocked(unit, level, raceSkills)) errors.push({ code: 'locked_unit', unitId: s.unitId })
    weight += unitCost(unit, raceSkills) * Math.max(0, s.count)
  }
  if (weight > maxWeight(level) + EPS) errors.push({ code: 'overweight', weight, max: maxWeight(level) })
  return errors
}

/** Доступная замена для закрытого юнита (§8, п. 5) */
function substitute(unit: UnitTemplate, level: number, raceSkills: Record<RaceId, number>): UnitTemplate {
  if (isUnitUnlocked(unit, level, raceSkills)) return unit
  const sameTierBase = baseUnitOf(unit.raceId, unit.tier)
  if (isUnitUnlocked(sameTierBase, level, raceSkills)) return sameTierBase
  for (let t = unit.tier - 1; t >= 1; t--) {
    const base = baseUnitOf(unit.raceId, t as Tier)
    if (isUnitUnlocked(base, level, raceSkills)) return base
  }
  return baseUnitOf(unit.raceId, 1)
}

/**
 * Приведение армии к уровню боя (§8, п. 4–5):
 * лишние стаки отбрасываются, закрытые юниты заменяются с сохранением веса, затем армия урезается до лимита.
 */
export function balanceArmy(
  slots: readonly ArmySlot[],
  level: number,
  raceSkills: Record<RaceId, number>,
  mode: Mode,
): ArmySlot[] {
  const limit = maxWeight(level)
  let army: ArmySlot[] = slots
    .slice(0, MODE_CONFIG[mode].stacksPerHero)
    .filter((s) => findUnit(s.unitId) && s.count >= 1)
    .map((s) => {
      const unit = getUnit(s.unitId)
      const replacement = substitute(unit, level, raceSkills)
      if (replacement === unit) return { ...s }
      const count = Math.max(1, Math.floor((s.count * unit.weight) / replacement.weight))
      const { skinId: _skin, ...rest } = s
      return { ...rest, unitId: replacement.id, count }
    })

  const cost = (s: ArmySlot) => unitCost(getUnit(s.unitId), raceSkills)
  const total = () => army.reduce((sum, s) => sum + cost(s) * s.count, 0)

  if (total() > limit + EPS) {
    const k = limit / total()
    army = army.map((s) => ({ ...s, count: Math.max(1, Math.floor(s.count * k)) }))
  }
  while (total() > limit + EPS) {
    const reducible = army.filter((s) => s.count > 1)
    if (reducible.length > 0) {
      const top = reducible.reduce((a, b) => (cost(b) > cost(a) ? b : a))
      top.count--
    } else if (army.length > 1) {
      const top = army.reduce((a, b) => (cost(b) > cost(a) ? b : a))
      army = army.filter((s) => s !== top)
    } else {
      break
    }
  }
  return army
}
