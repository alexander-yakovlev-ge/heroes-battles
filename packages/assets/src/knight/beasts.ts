/** Звери и всадники рыцарей: грифон, кавалерист */
import { C, T, type Tone } from '../kit.js'
import type { UnitSource } from '../figures/humanoid.js'
import { quadruped } from '../figures/quadruped.js'
import { dragon } from '../figures/dragon.js'

const STEEL = { hi: '#f2f6fc', base: '#9eaabc', lo: '#343c4c', tex: 'metal' } satisfies Tone
const BLUE = { hi: '#78a4ec', base: '#2f5fb3', lo: '#0c1a3a', tex: 'cloth' } satisfies Tone
const SKIN = { hi: '#f8dcc4', base: '#d29e7a', lo: '#5e3a28', tex: 'skin' } satisfies Tone
const LION = { hi: '#f4d8a0', base: '#c09050', lo: '#4a3010', tex: 'skin' } satisfies Tone
const FEATHER = { hi: '#ffffff', base: '#e6e0d4', lo: '#6a6458', tex: 'cloth' } satisfies Tone
const HORSE = { hi: '#c8b8a8', base: '#7a6458', lo: '#22160e', tex: 'skin' } satisfies Tone

export const KNIGHT_BEASTS: Record<string, () => UnitSource> = {
  knight_gold_dragon: () => dragon({
    id: 'kgdrag',
    tone: { hi: '#fff4c0', base: '#d8a838', lo: '#5a3a08', tex: 'scale' },
    belly: { hi: '#fffae0', base: '#f0d890', lo: '#7a6020' },
    wing: { hi: '#ffe8a0', base: '#e0a848', lo: '#6a3a10' },
    horn: { hi: '#ffffff', base: '#e8dcc0', lo: '#6a5a40', tex: 'bone' },
    eyes: '#ffffff',
    breath: '#ffb030',
    aura: { color: '#ffd870', strength: 0.18 },
    motion: 'fly',
    attack: 'bite',
  }),
  knight_griffin: () => quadruped({
    id: 'kgrif',
    species: 'eagle',
    tone: LION,
    mane: FEATHER,
    belly: { hi: '#fff0d0', base: '#e8cc98', lo: '#7a5a30' },
    wings: { tone: FEATHER, kind: 'feather' },
    tail: 'tuft',
    scale: 1.05,
    motion: 'fly',
    attack: 'claw',
  }),
  knight_cavalier: () => quadruped({
    id: 'kcav',
    species: 'horse',
    tone: HORSE,
    mane: { hi: '#5a4a3a', base: '#2a2018', lo: '#060404' },
    barding: { tone: BLUE, trim: C.gold },
    rider: {
      id: 'kcav',
      height: 0.92,
      skin: SKIN,
      head: { kind: 'human', helmet: { kind: 'great', tone: STEEL, plume: '#e8e0d0' } },
      torso: { kind: 'plate', tone: STEEL, tabard: { tone: BLUE, emblem: C.gold }, pauldrons: STEEL },
      legs: { kind: 'plate', tone: STEEL, boots: STEEL },
      arms: { sleeve: STEEL, gauntlet: STEEL },
      pose: 'spear',
      weapon: { kind: 'pike', tone: STEEL },
      off: { kind: 'shield_kite', tone: BLUE, emblem: C.gold },
      motion: 'gallop',
      attack: 'thrust',
    },
    scale: 1,
    motion: 'gallop',
    attack: 'thrust',
  }),
}
void T
