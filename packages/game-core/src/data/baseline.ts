import type { Tier } from '../types.js'

/** Базовая линия характеристик уровня (§4.1): от неё строятся юниты и считается цена отклонений */
export interface TierBaseline {
  attack: number
  defense: number
  damageMin: number
  damageMax: number
  health: number
  speed: number
  initiative: number
}

export const TIER_BASELINE: Record<Tier, TierBaseline> = {
  1: { attack: 2, defense: 2, damageMin: 1, damageMax: 2, health: 6, speed: 4, initiative: 10 },
  2: { attack: 4, defense: 4, damageMin: 2, damageMax: 4, health: 12, speed: 4, initiative: 10 },
  3: { attack: 6, defense: 6, damageMin: 4, damageMax: 6, health: 24, speed: 5, initiative: 10 },
  4: { attack: 9, defense: 9, damageMin: 7, damageMax: 11, health: 45, speed: 5, initiative: 10 },
  5: { attack: 12, defense: 12, damageMin: 13, damageMax: 18, health: 80, speed: 5, initiative: 10 },
  6: { attack: 16, defense: 16, damageMin: 22, damageMax: 32, health: 140, speed: 6, initiative: 10 },
  7: { attack: 21, defense: 21, damageMin: 38, damageMax: 55, health: 250, speed: 6, initiative: 10 },
}
