import type { UnitArt } from '../types.js'
import { abomination } from './abomination.js'
import { banshee } from './banshee.js'
import { boneDragon } from './bone_dragon.js'
import { deathKnight } from './death_knight.js'
import { ghost } from './ghost.js'
import { ghoul } from './ghoul.js'
import { lich } from './lich.js'
import { lichLord } from './lich_lord.js'
import { mummy } from './mummy.js'
import { skeleton } from './skeleton.js'
import { shadowWyvern } from './shadow_wyvern.js'
import { skeletonArcher } from './skeleton_archer.js'
import { vampire } from './vampire.js'
import { zombie } from './zombie.js'

const art = (svg: string, iconViewBox: string): UnitArt => ({ svg, iconViewBox, placeholder: false })

export const NECRO_ART: Record<string, UnitArt> = {
  necro_skeleton: art(skeleton, '30 4 48 48'),
  necro_skeleton_archer: art(skeletonArcher, '30 4 48 48'),
  necro_zombie: art(zombie, '38 6 46 46'),
  necro_ghoul: art(ghoul, '44 16 44 44'),
  necro_ghost: art(ghost, '40 10 46 46'),
  necro_banshee: art(banshee, '40 6 46 46'),
  necro_vampire: art(vampire, '30 2 46 46'),
  necro_mummy: art(mummy, '30 2 46 46'),
  necro_lich: art(lich, '30 0 50 50'),
  necro_death_knight: art(deathKnight, '34 4 56 56'),
  necro_abomination: art(abomination, '30 0 60 60'),
  necro_shadow_wyvern: art(shadowWyvern, '46 0 54 54'),
  necro_bone_dragon: art(boneDragon, '46 -2 54 54'),
  necro_lich_lord: art(lichLord, '28 -4 60 60'),
}
