import { getUnit, type RaceId } from '@hb/game-core'
import { RIG_BOUNDS } from './bounds.generated.js'
import type { RigSource } from './kit.js'
import { KNIGHT_RIGS } from './knight/index.js'
import { BARBARIAN_RIGS } from './races/barbarian.js'
import { DEMON_RIGS } from './races/demon.js'
import { DUNGEON_RIGS } from './races/dungeon.js'
import { ELF_RIGS } from './races/elf.js'
import { FORTRESS_RIGS } from './races/fortress.js'
import { WIZARD_RIGS } from './races/wizard.js'
import { NECRO_RIGS } from './necro/index.js'
import { placeholderSvg } from './placeholder.js'
import type { UnitArt } from './types.js'

export { RACE_PALETTES, type RacePalette } from './palette.js'
export type { Attack, Bone, Motion, Rig, RigLayer, UnitArt } from './types.js'
export { heroIconSvg } from './hero.js'

/**
 * Исходники ригов всех нарисованных юнитов. Генерируются лениво — при первом обращении к юниту:
 * 112 спрайтов со слоями — это ~15 МБ строк, на телефоне их не нужно строить при старте.
 */
const RIG_BUILDERS: Record<string, () => { rig: RigSource; iconViewBox: string }> = {
  ...NECRO_RIGS,
  ...KNIGHT_RIGS,
  ...WIZARD_RIGS,
  ...ELF_RIGS,
  ...BARBARIAN_RIGS,
  ...DEMON_RIGS,
  ...DUNGEON_RIGS,
  ...FORTRESS_RIGS,
}

/** Спрайт + риг с границами слоёв; если границы устарели (другое число слоёв) — без рига */
function withBounds(id: string, src: RigSource, iconViewBox: string): UnitArt {
  const boxes = RIG_BOUNDS[id]
  const art: UnitArt = { svg: src.svg, iconViewBox, placeholder: false }
  if (!boxes || boxes.length !== src.layers.length) return art
  return {
    ...art,
    rig: {
      layers: src.layers.map((l, i) => ({ ...l, box: boxes[i]! })),
      pivots: src.pivots,
      motion: src.motion,
      attack: src.attack,
    },
  }
}

const built = new Map<string, { rig: RigSource; iconViewBox: string }>()

/** Исходник рига юнита (лениво, с кэшем); для скрипта границ слоёв и теста */
export function rigSource(unitId: string): { rig: RigSource; iconViewBox: string } | undefined {
  let src = built.get(unitId)
  if (!src) {
    const build = RIG_BUILDERS[unitId]
    if (!build) return undefined
    src = build()
    built.set(unitId, src)
  }
  return src
}

/** Юниты, у которых есть нарисованная графика */
export const ILLUSTRATED_UNITS: readonly string[] = Object.keys(RIG_BUILDERS)

/** Расы, графика которых нарисована целиком */
export const ILLUSTRATED_RACES: readonly RaceId[] = ['necro', 'knight', 'wizard', 'elf', 'barbarian', 'demon', 'dungeon', 'fortress']

const cache = new Map<string, UnitArt>()

/** Спрайт юнита (§10.1): нарисованный — с ригом, для остальных — временный жетон в цветах расы */
export function getUnitArt(unitId: string): UnitArt {
  let art = cache.get(unitId)
  if (!art) {
    const src = rigSource(unitId)
    art = src ? withBounds(unitId, src.rig, src.iconViewBox) : { svg: placeholderSvg(getUnit(unitId)), iconViewBox: '8 8 84 84', placeholder: true }
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
