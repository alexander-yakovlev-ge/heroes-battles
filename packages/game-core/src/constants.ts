import type { Mode, Tier, UnitRole } from './types.js'

/** Версия игровых данных (юниты, заклинания, константы). Меняется при любом изменении баланса. */
export const BALANCE_VERSION = '0.3.0'

export const MAX_LEVEL = 30
export const MAX_LEVEL_GAP = 3
export const MAX_RACE_SKILL = 9
export const STARTING_RACE_SKILL = 3
export const BASE_STAT_VALUE = 1
export const RACE_SKILL_POINT_EVERY = 3
export const MAX_ROUNDS = 30
export const DRAW_THRESHOLD = 0.05
export const MAX_CONSECUTIVE_TIMEOUTS = 3
export const MANA_PER_KNOWLEDGE = 10

/** Инициатива героя (§5.3): середина шкалы юнитов 1–20 — герой ходит раз в раунд */
export const HERO_INITIATIVE = 10
/** Удар героя (§5.5): (база + за уровень боя × L) × (1 + 5% за очко атаки героя); без случайности */
export const HERO_STRIKE_BASE = 3
export const HERO_STRIKE_PER_LEVEL = 2
export const HERO_STRIKE_PER_ATTACK = 0.05
/** Префикс id героя в очереди хода */
export const HERO_QUEUE_PREFIX = 'hero:'

export const MODE_CONFIG: Record<Mode, { width: number; height: number; stacksPerHero: number; heroesPerTeam: number }> = {
  '1v1': { width: 12, height: 8, stacksPerHero: 7, heroesPerTeam: 1 },
  '2v2': { width: 14, height: 10, stacksPerHero: 5, heroesPerTeam: 2 },
  '3v3': { width: 16, height: 12, stacksPerHero: 4, heroesPerTeam: 3 },
}

export const DEPLOY_COLUMNS = 2
export const OBSTACLE_RATIO_MIN = 0.1
export const OBSTACLE_RATIO_MAX = 0.15

export const maxWeight = (level: number) => 100 + level * 10

/** Множитель стоимости юнита от навыка расы 0–9 */
export const WEIGHT_MULTIPLIER = [2.0, 1.6, 1.3, 1.0, 0.9, 0.8, 0.7, 0.63, 0.56, 0.5] as const

/** Уровень героя, открывающий базовый юнит уровня tier */
export const TIER_UNLOCK_LEVEL: Record<Tier, number> = { 1: 1, 2: 1, 3: 3, 4: 6, 5: 10, 6: 14, 7: 18 }
/** Навык расы, открывающий альтернативный юнит уровня tier */
export const ALT_UNLOCK_SKILL: Record<Tier, number> = { 1: 4, 2: 4, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8 }

/** Круг заклинания → [уровень героя, навык расы для школы расы] */
export const SPELL_CIRCLE_REQUIREMENTS: Record<1 | 2 | 3 | 4 | 5, { level: number; raceSkill: number }> = {
  1: { level: 1, raceSkill: 0 },
  2: { level: 5, raceSkill: 2 },
  3: { level: 10, raceSkill: 4 },
  4: { level: 15, raceSkill: 6 },
  5: { level: 20, raceSkill: 8 },
}

export const XP_REWARD = { win: 100, draw: 60, loss: 40, forfeit: 0 } as const
export const expNeeded = (level: number) => level * 500

export const ELO_BASE = 1000
export const ELO_K_NEW = 32
export const ELO_K = 16
export const ELO_NEW_GAMES = 10

export const DEFEND_BONUS = 1.3
export const AURA_DEFENSE_BONUS = 1.2
export const RANGED_PENALTY = 0.5
export const CHARGE_PER_CELL = 0.05
export const CHARGE_MAX = 0.5
export const PROC_CHANCE = 0.2
export const INCORPOREAL_CHANCE = 0.3
export const LIFE_DRAIN_RATIO = 0.5
export const POISON_ROUNDS = 3
/** Яд за раунд — доля урона удара, наложившего яд */
export const POISON_RATIO = 0.2
export const REBIRTH_RATIO = 0.3
export const FIRE_AURA_RATIO = 0.25
export const MANA_DRAIN_PER_HIT = 2

/**
 * Треугольник ролей: роль-ключ получает бонус урона против роли `beats` (§5.6).
 * Бонус тяжёлых меньше: стрелков в армиях меньше, и при равных бонусах нейтральной
 * была бы армия с долей стрелков 1/3, а не типичная ~1/4.
 */
export const ROLE_ADVANTAGE: Record<UnitRole, { beats: UnitRole; bonus: number }> = {
  shooter: { beats: 'heavy', bonus: 1 },
  heavy: { beats: 'mobile', bonus: 0.7 },
  mobile: { beats: 'shooter', bonus: 1 },
}
