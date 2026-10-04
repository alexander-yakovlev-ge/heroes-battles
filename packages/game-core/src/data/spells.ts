import { SPELL_CIRCLE_REQUIREMENTS } from '../constants.js'
import type { RaceId, SpellId, SpellSchool } from '../types.js'

/**
 * Цель заклинания:
 * - enemy / ally — один стак (живой);
 * - area — клетка, эффект 3×3;
 * - global — без цели (по всем юнитам или по своим, см. реализацию).
 */
export type SpellTargeting = 'enemy' | 'ally' | 'area' | 'global'

export interface SpellTemplate {
  id: SpellId
  school: SpellSchool
  circle: 1 | 2 | 3 | 4 | 5
  mana: number
  targeting: SpellTargeting
  /** Огненное заклинание (не действует на юнитов с fire_immune) */
  fire?: boolean
  nameKey: string
}

const spell = (
  id: SpellId,
  school: SpellSchool,
  circle: SpellTemplate['circle'],
  mana: number,
  targeting: SpellTargeting,
  extra: Partial<SpellTemplate> = {},
): SpellTemplate => ({ id, school, circle, mana, targeting, nameKey: `spell.${id}`, ...extra })

export const SPELLS: readonly SpellTemplate[] = [
  spell('lightning_bolt', 'common', 1, 8, 'enemy'),
  spell('cure', 'common', 1, 6, 'ally'),
  spell('haste', 'common', 1, 6, 'ally'),
  spell('slow', 'common', 2, 8, 'enemy'),
  spell('divine_strength', 'knight', 2, 8, 'ally'),
  spell('resurrection', 'knight', 4, 20, 'ally'),
  spell('curse', 'necro', 2, 8, 'enemy'),
  spell('raise_dead', 'necro', 3, 16, 'ally'),
  spell('blind', 'wizard', 3, 14, 'enemy'),
  spell('chain_lightning', 'wizard', 4, 20, 'enemy'),
  spell('regeneration', 'elf', 2, 8, 'ally'),
  spell('entangle', 'elf', 3, 12, 'enemy'),
  spell('bloodlust', 'barbarian', 2, 6, 'ally'),
  spell('war_cry', 'barbarian', 4, 18, 'global'),
  spell('fireball', 'demon', 2, 12, 'area', { fire: true }),
  spell('armageddon', 'demon', 5, 25, 'global', { fire: true }),
  spell('confusion', 'dungeon', 2, 10, 'enemy'),
  spell('meteor_shower', 'dungeon', 4, 20, 'area', { fire: true }),
  spell('stone_skin', 'fortress', 2, 8, 'ally'),
  spell('earthquake', 'fortress', 4, 18, 'area'),
]

const BY_ID = new Map(SPELLS.map((s) => [s.id, s]))

export function getSpell(id: SpellId): SpellTemplate {
  const s = BY_ID.get(id)
  if (!s) throw new Error(`Unknown spell: ${id}`)
  return s
}

/** Заклинания, доступные герою данного уровня с данными навыками рас (§5.7) */
export function getAvailableSpells(level: number, raceSkills: Record<RaceId, number>): SpellId[] {
  return SPELLS.filter((s) => {
    const req = SPELL_CIRCLE_REQUIREMENTS[s.circle]
    if (level < req.level) return false
    if (s.school === 'common') return true
    return raceSkills[s.school] >= req.raceSkill
  }).map((s) => s.id)
}
