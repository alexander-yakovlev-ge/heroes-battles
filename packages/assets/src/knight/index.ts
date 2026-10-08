/** Рыцари (§10.1): сталь, синее сукно, золото; люди и небесное воинство */
import type { Tone } from '../kit.js'
import { C, T } from '../kit.js'
import { type UnitSource, humanoid } from '../figures/humanoid.js'
import { KNIGHT_BEASTS } from './beasts.js'

export const STEEL = { hi: '#f2f6fc', base: '#9eaabc', lo: '#343c4c', tex: 'metal' } satisfies Tone
export const BLUE = { hi: '#78a4ec', base: '#2f5fb3', lo: '#0c1a3a', tex: 'cloth' } satisfies Tone
const WHITE = { hi: '#ffffff', base: '#ddd8ce', lo: '#6a665c', tex: 'cloth' } satisfies Tone
const SKIN = { hi: '#f8dcc4', base: '#d29e7a', lo: '#5e3a28', tex: 'skin' } satisfies Tone
const SKIN_PALE = { hi: '#fff2e6', base: '#ecc8aa', lo: '#7a5440', tex: 'skin' } satisfies Tone
const BROWN_HAIR = { hi: '#a07850', base: '#5a3c22', lo: '#1e120a' } satisfies Tone
const BLOND = { hi: '#fff4c0', base: '#e0b860', lo: '#7a5420' } satisfies Tone
const GREY_HAIR = { hi: '#f0f0f0', base: '#a8a8a8', lo: '#4a4a4a' } satisfies Tone
const HOMESPUN = { hi: '#c8a882', base: '#8a6a48', lo: '#2e2216', tex: 'cloth' } satisfies Tone
const ROBE_BROWN = { hi: '#a8845e', base: '#6a4c30', lo: '#22160c', tex: 'cloth' } satisfies Tone
const CRIMSON = { hi: '#d8506a', base: '#8a1e30', lo: '#2a060c', tex: 'cloth' } satisfies Tone
const GOLD_PLATE = { ...T.gold, hi: '#fff6d0' } satisfies Tone

const HUMANOIDS: Record<string, () => UnitSource> = {
  knight_peasant: () => humanoid({
    id: 'kpeas',
    height: 1.02,
    skin: SKIN,
    head: { kind: 'human', hair: { tone: BROWN_HAIR, style: 'short' }, beard: { tone: BROWN_HAIR, style: 'short' } },
    torso: { kind: 'tunic', tone: HOMESPUN, belt: T.leather },
    legs: { kind: 'pants', tone: { hi: '#8a8070', base: '#5a5244', lo: '#1a1612', tex: 'cloth' } },
    arms: { sleeve: HOMESPUN },
    pose: 'spear',
    weapon: { kind: 'pitchfork', tone: T.iron },
    motion: 'walk',
    attack: 'thrust',
  }),
  knight_slinger: () => humanoid({
    id: 'kslng',
    height: 1.0,
    skin: SKIN,
    head: { kind: 'human', hair: { tone: BLOND, style: 'short' }, helmet: { kind: 'cap', tone: HOMESPUN } },
    torso: { kind: 'leather', tone: T.leather, belt: T.leather },
    legs: { kind: 'pants', tone: BLUE },
    pose: 'throw',
    weapon: { kind: 'sling' },
    motion: 'walk',
    attack: 'bow',
  }),
  knight_spearman: () => humanoid({
    id: 'kspear',
    skin: SKIN,
    head: { kind: 'human', helmet: { kind: 'kettle', tone: STEEL }, beard: { tone: BROWN_HAIR, style: 'short' } },
    torso: { kind: 'chain', tone: STEEL, tabard: { tone: BLUE, emblem: C.gold }, belt: T.leather },
    legs: { kind: 'pants', tone: { ...STEEL, tex: 'metal' }, boots: T.leather },
    arms: { sleeve: STEEL },
    pose: 'spear',
    weapon: { kind: 'spear', tone: STEEL },
    off: { kind: 'shield_round', tone: BLUE, emblem: C.gold },
    motion: 'walk',
    attack: 'thrust',
  }),
  knight_archer: () => humanoid({
    id: 'karch',
    skin: SKIN,
    head: { kind: 'human', hair: { tone: BROWN_HAIR, style: 'short' }, helmet: { kind: 'hood', tone: { hi: '#7ab07a', base: '#3a6a3a', lo: '#102010', tex: 'cloth' } } },
    torso: { kind: 'leather', tone: T.leather, belt: T.leather, tabard: { tone: BLUE } },
    legs: { kind: 'pants', tone: HOMESPUN },
    pose: 'bow',
    off: { kind: 'bow', tone: T.wood },
    motion: 'walk',
    attack: 'bow',
  }),
  knight_swordsman: () => humanoid({
    id: 'kswrd',
    bulk: 1.08,
    skin: SKIN,
    head: { kind: 'human', helmet: { kind: 'barbute', tone: STEEL, plume: '#2f5fb3' } },
    torso: { kind: 'plate', tone: STEEL, tabard: { tone: BLUE, emblem: C.gold }, belt: T.leather, pauldrons: STEEL },
    legs: { kind: 'plate', tone: STEEL, boots: STEEL },
    arms: { sleeve: STEEL, gauntlet: STEEL },
    pose: 'melee',
    weapon: { kind: 'sword', tone: STEEL },
    off: { kind: 'shield_kite', tone: BLUE, emblem: C.gold },
    motion: 'walk',
    attack: 'swing',
  }),
  knight_monk: () => humanoid({
    id: 'kmonk',
    skin: SKIN,
    head: { kind: 'human', hair: { tone: GREY_HAIR, style: 'short' }, beard: { tone: GREY_HAIR, style: 'long' }, helmet: { kind: 'hood', tone: ROBE_BROWN } },
    torso: { kind: 'robe', tone: ROBE_BROWN, skirt: 'robe', belt: { hi: '#e8d8b0', base: '#b8a070', lo: '#4a3a20' } },
    legs: { kind: 'pants', tone: ROBE_BROWN },
    pose: 'cast',
    weapon: { kind: 'staff', glow: '#ffe08a' },
    castGlow: '#ffe08a',
    motion: 'walk',
    attack: 'cast',
  }),
  knight_inquisitor: () => humanoid({
    id: 'kinq',
    bulk: 1.05,
    skin: SKIN,
    head: { kind: 'human', helmet: { kind: 'hood', tone: CRIMSON }, beard: { tone: GREY_HAIR, style: 'short' } },
    torso: { kind: 'chain', tone: STEEL, tabard: { tone: CRIMSON, emblem: C.gold }, belt: T.leather, skirt: 'long' },
    legs: { kind: 'plate', tone: STEEL, boots: STEEL },
    arms: { sleeve: STEEL, gauntlet: STEEL },
    pose: 'melee',
    weapon: { kind: 'mace', tone: STEEL },
    off: { kind: 'book', tone: CRIMSON, emblem: C.gold, glow: '#ffe08a' },
    motion: 'walk',
    attack: 'swing',
  }),
  knight_paladin: () => humanoid({
    id: 'kpal',
    bulk: 1.12,
    skin: SKIN,
    head: { kind: 'human', helmet: { kind: 'winged', tone: GOLD_PLATE } },
    torso: { kind: 'plate', tone: STEEL, trim: T.gold, tabard: { tone: WHITE, emblem: C.gold }, belt: T.leather, pauldrons: GOLD_PLATE },
    legs: { kind: 'plate', tone: STEEL, boots: STEEL },
    arms: { sleeve: STEEL, gauntlet: STEEL },
    pose: 'twohand',
    weapon: { kind: 'greatsword', tone: STEEL, glow: '#ffe8a0' },
    cape: WHITE,
    aura: { color: '#ffe8a0', strength: 0.18 },
    motion: 'walk',
    attack: 'swing',
  }),
  knight_angel: () => humanoid({
    id: 'kangel',
    skin: SKIN_PALE,
    head: { kind: 'female', hair: { tone: BLOND, style: 'long' }, helmet: { kind: 'circlet', tone: T.gold } },
    torso: { kind: 'plate', tone: GOLD_PLATE, skirt: 'long', belt: T.leather },
    legs: { kind: 'pants', tone: WHITE, boots: GOLD_PLATE },
    arms: { sleeve: WHITE },
    pose: 'melee',
    weapon: { kind: 'sword', tone: STEEL, glow: '#fff4c0' },
    wings: { kind: 'feather', tone: WHITE, span: 1 },
    aura: { color: '#fff4c0', strength: 0.2 },
    hover: 6,
    motion: 'fly',
    attack: 'swing',
  }),
  knight_seraph: () => humanoid({
    id: 'kseraph',
    skin: SKIN_PALE,
    head: { kind: 'female', hair: { tone: { hi: '#ffffff', base: '#f0e6c8', lo: '#8a7a50' }, style: 'long' }, helmet: { kind: 'circlet', tone: T.gold } },
    torso: { kind: 'robe', tone: WHITE, skirt: 'long', belt: T.gold, trim: T.gold },
    legs: { kind: 'pants', tone: WHITE, boots: GOLD_PLATE },
    arms: { sleeve: WHITE },
    pose: 'bow',
    off: { kind: 'bow', tone: GOLD_PLATE },
    wings: { kind: 'feather', tone: WHITE, span: 1.1 },
    aura: { color: '#ffe8a0', strength: 0.2 },
    hover: 6,
    motion: 'fly',
    attack: 'bow',
  }),
  knight_archangel: () => humanoid({
    id: 'karchang',
    height: 1.1,
    bulk: 1.15,
    skin: SKIN_PALE,
    head: { kind: 'human', hair: { tone: BLOND, style: 'long' }, helmet: { kind: 'winged', tone: GOLD_PLATE } },
    torso: { kind: 'plate', tone: GOLD_PLATE, skirt: 'long', tabard: { tone: WHITE, emblem: C.gold }, pauldrons: GOLD_PLATE, belt: T.leather },
    legs: { kind: 'plate', tone: GOLD_PLATE, boots: GOLD_PLATE },
    arms: { sleeve: GOLD_PLATE, gauntlet: GOLD_PLATE },
    pose: 'twohand',
    weapon: { kind: 'greatsword', tone: STEEL, glow: '#fff4c0', scale: 1.1 },
    wings: { kind: 'feather', tone: WHITE, span: 1.1 },
    aura: { color: '#fff4c0', strength: 0.3 },
    hover: 5,
    motion: 'fly',
    attack: 'swing',
  }),
}

export const KNIGHT_RIGS: Record<string, () => UnitSource> = { ...HUMANOIDS, ...KNIGHT_BEASTS }
