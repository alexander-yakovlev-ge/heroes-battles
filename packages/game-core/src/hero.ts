import {
  BASE_STAT_VALUE,
  MANA_PER_KNOWLEDGE,
  MAX_LEVEL,
  MAX_RACE_SKILL,
  RACE_SKILL_POINT_EVERY,
  STARTING_RACE_SKILL,
  expNeeded,
} from './constants.js'
import { getAvailableSpells } from './data/spells.js'
import { RACES, STATS, type BattleHero, type Hero, type HeroStats, type RaceId, type StatId, type Team } from './types.js'

const emptyRaceSkills = (): Record<RaceId, number> =>
  Object.fromEntries(RACES.map((r) => [r, 0])) as Record<RaceId, number>

export function deriveStats(statHistory: readonly StatId[]): HeroStats {
  const stats = Object.fromEntries(STATS.map((s) => [s, BASE_STAT_VALUE])) as HeroStats
  for (const s of statHistory) stats[s]++
  return stats
}

export function deriveRaceSkills(startingRace: RaceId, raceSkillHistory: readonly RaceId[]): Record<RaceId, number> {
  const skills = emptyRaceSkills()
  skills[startingRace] = STARTING_RACE_SKILL
  for (const r of raceSkillHistory) skills[r] = Math.min(MAX_RACE_SKILL, skills[r] + 1)
  return skills
}

export function createHero(uid: string, startingRace: RaceId, level = 1): Hero {
  const hero: Hero = {
    uid,
    level: 1,
    experience: 0,
    startingRace,
    stats: deriveStats([]),
    raceSkills: deriveRaceSkills(startingRace, []),
    statHistory: [],
    raceSkillHistory: [],
    pendingStatPoints: 0,
    pendingRaceSkillPoints: 0,
    lastFreeRespecSeason: null,
  }
  return level > 1 ? grantLevels(hero, level - 1) : hero
}

/** Очки, которые герой получает за достижение уровня `level` */
const pointsForLevel = (level: number) => ({
  stat: 1,
  race: level % RACE_SKILL_POINT_EVERY === 0 ? 1 : 0,
})

function grantLevels(hero: Hero, levels: number): Hero {
  const h = { ...hero }
  for (let i = 0; i < levels && h.level < MAX_LEVEL; i++) {
    h.level++
    const p = pointsForLevel(h.level)
    h.pendingStatPoints += p.stat
    h.pendingRaceSkillPoints += p.race
  }
  return h
}

/** Начисление опыта с повышением уровней (§11.1) */
export function applyExperience(hero: Hero, xp: number): Hero {
  let h: Hero = { ...hero, experience: hero.experience + Math.max(0, xp) }
  while (h.level < MAX_LEVEL && h.experience >= expNeeded(h.level)) {
    h = grantLevels({ ...h, experience: h.experience - expNeeded(h.level) }, 1)
  }
  if (h.level >= MAX_LEVEL) h.experience = 0
  return h
}

export function allocateStat(hero: Hero, stat: StatId): Hero {
  if (hero.pendingStatPoints <= 0) throw new Error('No stat points')
  const statHistory = [...hero.statHistory, stat]
  return { ...hero, statHistory, stats: deriveStats(statHistory), pendingStatPoints: hero.pendingStatPoints - 1 }
}

export function allocateRaceSkill(hero: Hero, race: RaceId): Hero {
  if (hero.pendingRaceSkillPoints <= 0) throw new Error('No race skill points')
  if (hero.raceSkills[race] >= MAX_RACE_SKILL) throw new Error('Race skill at max')
  const raceSkillHistory = [...hero.raceSkillHistory, race]
  return {
    ...hero,
    raceSkillHistory,
    raceSkills: deriveRaceSkills(hero.startingRace, raceSkillHistory),
    pendingRaceSkillPoints: hero.pendingRaceSkillPoints - 1,
  }
}

/**
 * Перераспределение очков (§11.2). Бесплатно раз в сезон, иначе требует зелье
 * (наличие зелья проверяет вызывающая сторона и передаёт `usePotion`).
 */
export function respec(hero: Hero, season: number, usePotion: boolean): Hero {
  const free = hero.lastFreeRespecSeason !== season
  if (!free && !usePotion) throw new Error('Free respec already used this season')
  return {
    ...hero,
    statHistory: [],
    raceSkillHistory: [],
    stats: deriveStats([]),
    raceSkills: deriveRaceSkills(hero.startingRace, []),
    pendingStatPoints: hero.pendingStatPoints + hero.statHistory.length,
    pendingRaceSkillPoints: hero.pendingRaceSkillPoints + hero.raceSkillHistory.length,
    lastFreeRespecSeason: free ? season : hero.lastFreeRespecSeason,
  }
}

/** Статы и навыки героя, приведённые к уровню L (§8, п. 3) */
export function heroAtLevel(hero: Hero, level: number): { stats: HeroStats; raceSkills: Record<RaceId, number> } {
  const L = Math.min(level, hero.level)
  return {
    stats: deriveStats(hero.statHistory.slice(0, L - 1)),
    raceSkills: deriveRaceSkills(hero.startingRace, hero.raceSkillHistory.slice(0, Math.floor(L / RACE_SKILL_POINT_EVERY))),
  }
}

/** Снимок героя для боя на уровне battleLevel */
export function balanceHero(hero: Hero, battleLevel: number, team: Team): BattleHero {
  const { stats, raceSkills } = heroAtLevel(hero, battleLevel)
  const maxMana = stats.knowledge * MANA_PER_KNOWLEDGE
  return {
    uid: hero.uid,
    team,
    realLevel: hero.level,
    stats,
    raceSkills,
    spells: getAvailableSpells(battleLevel, raceSkills),
    mana: maxMana,
    maxMana,
    castThisRound: false,
    surrendered: false,
  }
}
