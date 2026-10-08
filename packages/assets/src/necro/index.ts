import type { RigSource } from './kit.js'
import { abomination } from './abomination.js'
import { banshee } from './banshee.js'
import { boneDragon } from './bone_dragon.js'
import { deathKnight } from './death_knight.js'
import { ghost } from './ghost.js'
import { lich } from './lich.js'
import { lichLord } from './lich_lord.js'
import { mummy } from './mummy.js'
import { plagueZombie } from './plague_zombie.js'
import { skeleton } from './skeleton.js'
import { shadowWyvern } from './shadow_wyvern.js'
import { skeletonArcher } from './skeleton_archer.js'
import { vampire } from './vampire.js'
import { zombie } from './zombie.js'

/** Спрайты расы с ригами — по ним скрипт `pnpm --filter @hb/assets bounds` считает границы слоёв */
export const NECRO_RIGS: Record<string, () => { rig: RigSource; iconViewBox: string }> = {
  necro_skeleton: () => ({ rig: skeleton, iconViewBox: '34 7 36 36' }),
  necro_skeleton_archer: () => ({ rig: skeletonArcher, iconViewBox: '36 6 36 36' }),
  necro_zombie: () => ({ rig: zombie, iconViewBox: '46 4 36 36' }),
  necro_plague_zombie: () => ({ rig: plagueZombie, iconViewBox: '50 8 36 36' }),
  necro_ghost: () => ({ rig: ghost, iconViewBox: '50 8 36 36' }),
  necro_banshee: () => ({ rig: banshee, iconViewBox: '48 6 36 36' }),
  necro_vampire: () => ({ rig: vampire, iconViewBox: '38 4 36 36' }),
  necro_mummy: () => ({ rig: mummy, iconViewBox: '38 6 36 36' }),
  necro_lich: () => ({ rig: lich, iconViewBox: '38 4 38 38' }),
  necro_death_knight: () => ({ rig: deathKnight, iconViewBox: '38 0 50 50' }),
  necro_abomination: () => ({ rig: abomination, iconViewBox: '40 0 40 40' }),
  necro_shadow_wyvern: () => ({ rig: shadowWyvern, iconViewBox: '62 2 38 38' }),
  necro_bone_dragon: () => ({ rig: boneDragon, iconViewBox: '62 0 38 38' }),
  necro_lich_lord: () => ({ rig: lichLord, iconViewBox: '34 -2 40 40' }),
}
