import {
  MODE_CONFIG,
  armyWeight,
  getUnit,
  maxWeight,
  unitCost,
  validateArmy,
  type ArmyError,
  type ArmySlot,
  type Hero,
} from '@hb/game-core'

/** Редактор пресета армии (§6): чистые функции поверх правил game-core */

const EPS = 1e-9
/** Бой с ботом и PvP 1v1 используют все 7 слотов пресета; в 2v2/3v3 — первые 5/4 (§6.2) */
export const MAX_STACKS = MODE_CONFIG['1v1'].stacksPerHero

type HeroLike = Pick<Hero, 'level' | 'raceSkills'>

export const weightOf = (slots: readonly ArmySlot[], hero: HeroLike) => armyWeight(slots, hero.raceSkills)

export const remainingWeight = (slots: readonly ArmySlot[], hero: HeroLike) => maxWeight(hero.level) - weightOf(slots, hero)

/** Наибольшее количество юнитов в слоте index, которое помещается в лимит веса */
export function maxCountAt(slots: readonly ArmySlot[], index: number, hero: HeroLike): number {
  const slot = slots[index]
  if (!slot) return 0
  const others = slots.filter((_, i) => i !== index)
  const cost = unitCost(getUnit(slot.unitId), hero.raceSkills)
  return Math.max(0, Math.floor((maxWeight(hero.level) - weightOf(others, hero) + EPS) / cost))
}

/**
 * Добавить стак юнита. Если свободного веса не хватает на равную долю, стаки, которые больше
 * доли, уменьшаются до неё — новый стак получает место, армия остаётся в лимите, если это возможно.
 */
export function addUnit(slots: readonly ArmySlot[], unitId: string, hero: HeroLike): ArmySlot[] {
  if (slots.some((s) => s.unitId === unitId) || slots.length >= MAX_STACKS) return [...slots]
  const cost = unitCost(getUnit(unitId), hero.raceSkills)
  const share = maxWeight(hero.level) / (slots.length + 1)
  let next = [...slots]
  if (remainingWeight(next, hero) + EPS < Math.min(share, cost)) {
    next = next.map((s) => {
      const c = unitCost(getUnit(s.unitId), hero.raceSkills)
      return c * s.count > share ? { ...s, count: Math.max(1, Math.floor((share + EPS) / c)) } : s
    })
  }
  const count = Math.max(1, Math.floor((remainingWeight(next, hero) + EPS) / cost))
  return [...next, { unitId, count }]
}

export function setCount(slots: readonly ArmySlot[], index: number, count: number): ArmySlot[] {
  const n = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1))
  return slots.map((s, i) => (i === index ? { ...s, count: n } : s))
}

export const removeAt = (slots: readonly ArmySlot[], index: number): ArmySlot[] => slots.filter((_, i) => i !== index)

export const validate = (slots: readonly ArmySlot[], hero: HeroLike): ArmyError[] =>
  validateArmy(slots, hero.level, hero.raceSkills, '1v1')

/** Ключ локализации и параметры для ошибки армии */
export function armyErrorMessage(e: ArmyError): [string, Record<string, unknown>?] {
  switch (e.code) {
    case 'empty':
      return ['castle.errEmpty']
    case 'overweight':
      return ['castle.errOverweight']
    case 'too_many_stacks':
      return ['castle.errTooManyStacks', { max: e.max }]
    case 'locked_unit':
    case 'unknown_unit':
      return ['castle.errLocked']
    case 'bad_count':
      return ['common.errorGeneric']
  }
}
