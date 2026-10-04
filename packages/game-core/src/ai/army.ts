import { isUnitUnlocked, unitCost } from '../army.js'
import { MODE_CONFIG, maxWeight } from '../constants.js'
import { UNITS } from '../data/units.js'
import { allocateRaceSkill, allocateStat, createHero } from '../hero.js'
import type { Rng } from '../rng.js'
import { RACES, STATS, type ArmySlot, type Hero, type Mode, type RaceId } from '../types.js'

/** Герой бота заданного уровня: очки распределяются случайно, навыки рас — в основную расу */
export function createBotHero(uid: string, level: number, rng: Rng, race?: RaceId): Hero {
  const mainRace = race ?? rng.pick(RACES)
  let hero = createHero(uid, mainRace, level)
  while (hero.pendingStatPoints > 0) hero = allocateStat(hero, rng.pick(STATS))
  while (hero.pendingRaceSkillPoints > 0) {
    const target = hero.raceSkills[mainRace] < 9 ? mainRace : rng.pick(RACES.filter((r) => hero.raceSkills[r] < 9))
    hero = allocateRaceSkill(hero, target)
  }
  return hero
}

/** Армия бота максимального веса для уровня героя: случайные открытые юниты, вес делится поровну */
export function createBotArmy(hero: Hero, mode: Mode, rng: Rng): ArmySlot[] {
  const limit = maxWeight(hero.level)
  const stacks = MODE_CONFIG[mode].stacksPerHero
  const available = UNITS.filter(
    (u) => isUnitUnlocked(u, hero.level, hero.raceSkills) && hero.raceSkills[u.raceId] >= 1,
  )
  const pool = available.length > 0 ? available : UNITS.filter((u) => u.tier === 1 && u.raceId === hero.startingRace)
  const chosen = new Set<string>()
  const picks = []
  while (picks.length < stacks && chosen.size < pool.length) {
    const u = rng.pick(pool)
    if (chosen.has(u.id)) continue
    chosen.add(u.id)
    picks.push(u)
  }
  const share = limit / picks.length
  const army: ArmySlot[] = []
  for (const u of picks) {
    const count = Math.floor(share / unitCost(u, hero.raceSkills))
    if (count >= 1) army.push({ unitId: u.id, count })
  }
  if (army.length === 0) {
    const cheapest = [...pool].sort((a, b) => unitCost(a, hero.raceSkills) - unitCost(b, hero.raceSkills))[0]!
    army.push({ unitId: cheapest.id, count: Math.max(1, Math.floor(limit / unitCost(cheapest, hero.raceSkills))) })
  }
  // Остаток веса после округления раздаём по одному существу, пока что-то помещается
  const costOf = (s: ArmySlot) => unitCost(UNITS.find((u) => u.id === s.unitId)!, hero.raceSkills)
  let left = limit - army.reduce((sum, s) => sum + costOf(s) * s.count, 0)
  for (let changed = true; changed; ) {
    changed = false
    for (const s of army) {
      if (costOf(s) <= left + 1e-9) {
        s.count++
        left -= costOf(s)
        changed = true
      }
    }
  }
  return army
}
