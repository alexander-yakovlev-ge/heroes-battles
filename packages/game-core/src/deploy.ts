import { balanceArmy } from './army.js'
import { MODE_CONFIG } from './constants.js'
import { heroAtLevel } from './hero.js'
import type { ArmySlot, Hero, Mode } from './types.js'

/**
 * Подготовка к бою (§5.1): армии уже приведены к уровню боя и видны обеим сторонам;
 * игрок может разделить стаки (и объединить обратно) в пределах лимита стаков режима.
 * Численность каждого юнита не меняется — только её распределение по стакам.
 */

/** Уровень боя — по слабейшему герою (§8) */
export const battleLevelOf = (heroes: readonly Pick<Hero, 'level'>[]) => Math.min(...heroes.map((h) => h.level))

/** Армия, с которой герой выйдет в бой на уровне battleLevel (после балансировки §8) */
export function prepareArmy(hero: Hero, army: readonly ArmySlot[], battleLevel: number, mode: Mode): ArmySlot[] {
  return balanceArmy(army, battleLevel, heroAtLevel(hero, battleLevel).raceSkills, mode)
}

const stackKey = (s: ArmySlot) => `${s.unitId}|${s.skinId ?? ''}`

function totals(army: readonly ArmySlot[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const s of army) m.set(stackKey(s), (m.get(stackKey(s)) ?? 0) + s.count)
  return m
}

export type DeployError =
  | { code: 'too_many_stacks'; max: number }
  | { code: 'bad_count'; index: number }
  | { code: 'totals_changed' }

/** Проверка расстановки игрока: те же юниты в том же количестве, не больше стаков, чем позволяет режим */
export function validateDeployment(prepared: readonly ArmySlot[], deployed: readonly ArmySlot[], mode: Mode): DeployError[] {
  const errors: DeployError[] = []
  const max = MODE_CONFIG[mode].stacksPerHero
  if (deployed.length > max) errors.push({ code: 'too_many_stacks', max })
  deployed.forEach((s, index) => {
    if (!Number.isInteger(s.count) || s.count < 1) errors.push({ code: 'bad_count', index })
  })
  const a = totals(prepared)
  const b = totals(deployed)
  if (a.size !== b.size || [...a].some(([k, n]) => b.get(k) !== n)) errors.push({ code: 'totals_changed' })
  return errors
}

/** Можно ли отделить часть стака: в нём больше одного существа и есть свободный слот */
export const canSplit = (army: readonly ArmySlot[], index: number, mode: Mode) =>
  (army[index]?.count ?? 0) > 1 && army.length < MODE_CONFIG[mode].stacksPerHero

/** Отделить count существ из стака index в новый стак сразу после него */
export function splitStack(army: readonly ArmySlot[], index: number, count: number, mode: Mode): ArmySlot[] {
  const slot = army[index]
  if (!slot || !canSplit(army, index, mode)) throw new Error('Cannot split stack')
  const n = Math.floor(count)
  if (n < 1 || n >= slot.count) throw new Error('Bad split count')
  const next = [...army]
  next.splice(index, 1, { ...slot, count: slot.count - n }, { ...slot, count: n })
  return next
}

/** Вернуть стак index в другой стак того же юнита (ближайший выше, иначе ниже) */
export function mergeStack(army: readonly ArmySlot[], index: number): ArmySlot[] {
  const slot = army[index]
  if (!slot) throw new Error('No stack')
  const same = (i: number) => i !== index && stackKey(army[i]!) === stackKey(slot)
  let into = -1
  for (let i = index - 1; i >= 0 && into < 0; i--) if (same(i)) into = i
  for (let i = index + 1; i < army.length && into < 0; i++) if (same(i)) into = i
  if (into < 0) throw new Error('Nothing to merge with')
  return army
    .map((s, i) => (i === into ? { ...s, count: s.count + slot.count } : s))
    .filter((_, i) => i !== index)
}

/** Есть ли у стака «родственный» стак того же юнита, с которым его можно объединить */
export const canMerge = (army: readonly ArmySlot[], index: number) =>
  army.some((s, i) => i !== index && army[index] !== undefined && stackKey(s) === stackKey(army[index]!))
