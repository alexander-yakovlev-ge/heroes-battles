import { getUnit, type RaceId } from '@hb/game-core'
import { NECRO_ART } from './necro/index.js'
import { placeholderSvg } from './placeholder.js'
import type { UnitArt } from './types.js'

export { RACE_PALETTES, type RacePalette } from './palette.js'
export type { UnitArt } from './types.js'
export { heroIconSvg } from './hero.js'

/**
 * Нарисованные спрайты по unitId (§10.1). Раса добавляется сюда после утверждения владельцем;
 * для остальных — временный жетон в цветах расы.
 */
const ART: Record<string, UnitArt> = { ...NECRO_ART }

/** Расы, графика которых нарисована целиком */
export const ILLUSTRATED_RACES: readonly RaceId[] = ['necro']

const cache = new Map<string, UnitArt>()

export function getUnitArt(unitId: string): UnitArt {
  let art = cache.get(unitId) ?? ART[unitId]
  if (!art) {
    art = { svg: placeholderSvg(getUnit(unitId)), iconViewBox: '8 8 84 84', placeholder: true }
    cache.set(unitId, art)
  }
  return art
}

/** Иконка юнита — тот же спрайт, обрезанный по iconViewBox (портрет) */
export function unitIconSvg(unitId: string): string {
  const art = getUnitArt(unitId)
  return art.svg.replace(/viewBox="[^"]*"/, `viewBox="${art.iconViewBox}"`)
}

export type Projectile = 'arrow' | 'orb' | 'rock'

/** Магические стрелки — светящийся снаряд; метатели — камень/топор; остальные — стрела */
const ORB = /lich|mage|druid|monk|witch|caster|titan|seraph|genie|matriarch|succubus|efreet|shaman|brimstone|gremlin|medusa/
const THROWN = /hurler|thrower|cyclops|spearthrower|slinger|juggernaut|ballista/

/** Снаряд стрелка для анимации выстрела */
export function projectileOf(unitId: string): Projectile {
  const slug = unitId.slice(unitId.indexOf('_') + 1)
  if (ORB.test(slug)) return 'orb'
  if (THROWN.test(slug)) return 'rock'
  return 'arrow'
}
