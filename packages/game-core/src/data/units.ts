import type { AbilityId, RaceId, SpellId, Tier, UnitRole, UnitTemplate } from '../types.js'
import { TIER_BASELINE } from './baseline.js'
import { POWER_CALIBRATION, RACE_POWER_CALIBRATION } from './calibration.js'
import { DEF_SHARE, unitPower, weightFromPower } from './power.js'

export { TIER_BASELINE }

/**
 * Стартовые характеристики юнитов (§4.1 ТЗ).
 * Юнит = базовая линия уровня + роль (модификаторы). Вес вычисляется из «силы»,
 * альтернативный юнит нормализуется к силе базового — так соблюдается правило ±10%.
 */

interface UnitSpec {
  slug: string
  ranged?: true | { range?: number; shots?: number }
  flying?: boolean
  large?: boolean
  abilities?: AbilityId[]
  casterSpells?: SpellId[]
  /** Роль нестрелка; по умолчанию летающий — mobile, наземный — heavy. Стрелок всегда shooter */
  role?: Exclude<UnitRole, 'shooter'>
  /** Аддитивные поправки к атаке/защите/скорости/инициативе, мультипликативные — к урону и HP */
  mod?: { atk?: number; def?: number; dmg?: number; hp?: number; spd?: number; init?: number }
}

type RaceRoster = Record<Tier, [base: UnitSpec, alt: UnitSpec]>

const DEFAULT_RANGE = 6
const DEFAULT_SHOTS = 10

function build(raceId: RaceId, tier: Tier, variant: 'base' | 'alt', spec: UnitSpec, raceAbilities: AbilityId[]): UnitTemplate {
  const b = TIER_BASELINE[tier]
  const m = spec.mod ?? {}
  let dmgMul = m.dmg ?? 1
  let hpMul = m.hp ?? 1
  let speed = b.speed + (m.spd ?? 0)
  if (spec.ranged) {
    dmgMul *= 0.85
    hpMul *= 0.7
  }
  if (spec.large) {
    dmgMul *= 1.15
    hpMul *= 1.3
    speed += 1
  }
  const ranged = spec.ranged
    ? {
        range: (spec.ranged === true ? undefined : spec.ranged.range) ?? DEFAULT_RANGE,
        shots: (spec.ranged === true ? undefined : spec.ranged.shots) ?? DEFAULT_SHOTS,
      }
    : undefined
  const id = `${raceId}_${spec.slug}`
  const unit: UnitTemplate = {
    id,
    raceId,
    tier,
    variant,
    nameKey: `unit.${id}`,
    size: spec.large ? 2 : 1,
    attack: Math.max(0, b.attack + (m.atk ?? 0)),
    defense: Math.max(0, b.defense + (m.def ?? 0)),
    damageMin: Math.max(1, Math.round(b.damageMin * dmgMul)),
    damageMax: Math.max(1, Math.round(b.damageMax * dmgMul)),
    health: Math.max(1, Math.round(b.health * hpMul)),
    speed: Math.max(1, speed),
    initiative: Math.max(1, Math.min(20, b.initiative + (m.init ?? 0))),
    weight: 0,
    isFlying: spec.flying ?? false,
    role: spec.ranged ? 'shooter' : (spec.role ?? (spec.flying ? 'mobile' : 'heavy')),
    abilities: [...new Set([...(spec.abilities ?? []), ...raceAbilities])],
  }
  if (unit.damageMax < unit.damageMin) unit.damageMax = unit.damageMin
  if (ranged) unit.ranged = ranged
  if (spec.casterSpells) unit.casterSpells = spec.casterSpells
  return unit
}

/** Сила с поправкой по статистике боёв (§13): из неё считается вес */
export const calibratedPower = (u: UnitTemplate) =>
  unitPower(u) * (POWER_CALIBRATION[u.id] ?? 1) * (RACE_POWER_CALIBRATION[u.raceId] ?? 1)

/** Подгоняет урон и HP альтернативного юнита так, чтобы его сила совпала с базовым */
function normalizeTo(alt: UnitTemplate, base: UnitTemplate): UnitTemplate {
  const target = calibratedPower(base)
  let result = alt
  for (let i = 0; i < 4; i++) {
    const ratio = target / calibratedPower(result)
    if (Math.abs(ratio - 1) < 0.03) break
    const k = Math.sqrt(ratio)
    const damageMin = Math.max(1, Math.round(result.damageMin * k))
    result = {
      ...result,
      damageMin,
      damageMax: Math.max(damageMin, Math.round(result.damageMax * k)),
      health: Math.max(1, Math.round(result.health * k)),
    }
  }
  // Урон малых юнитов округляется грубо — досогласуем силу через HP
  for (let i = 0; i < 4; i++) {
    const ratio = target / calibratedPower(result)
    if (Math.abs(ratio - 1) < 0.03) break
    result = { ...result, health: Math.max(1, Math.round(result.health * ratio ** (1 / DEF_SHARE))) }
  }
  // У юнитов 1-го уровня шаг HP слишком крупный — последняя подстройка защитой
  let best = result
  for (let d = -3; d <= 3 && Math.abs(target / calibratedPower(result) - 1) >= 0.03; d++) {
    const candidate = { ...result, defense: Math.max(0, result.defense + d) }
    if (Math.abs(target / calibratedPower(candidate) - 1) < Math.abs(target / calibratedPower(best) - 1)) best = candidate
  }
  result = best
  return result
}

function race(raceId: RaceId, roster: RaceRoster, raceAbilities: AbilityId[] = []): UnitTemplate[] {
  const out: UnitTemplate[] = []
  for (const tier of [1, 2, 3, 4, 5, 6, 7] as const) {
    const [baseSpec, altSpec] = roster[tier]
    const base = build(raceId, tier, 'base', baseSpec, raceAbilities)
    const alt = normalizeTo(build(raceId, tier, 'alt', altSpec, raceAbilities), base)
    base.weight = weightFromPower(calibratedPower(base))
    alt.weight = base.weight
    out.push(base, alt)
  }
  return out
}

const knight = race('knight', {
  1: [{ slug: 'peasant', mod: { atk: -1, def: -1, hp: 0.85 } }, { slug: 'slinger', ranged: { shots: 16 } }],
  2: [{ slug: 'spearman', abilities: ['unlimited_retaliation'], mod: { def: 1 } }, { slug: 'archer', ranged: true }],
  3: [
    { slug: 'griffin', flying: true, abilities: ['unlimited_retaliation'], mod: { spd: 2, init: 1 } },
    { slug: 'swordsman', abilities: ['aura_defense'], mod: { def: 2 } },
  ],
  4: [{ slug: 'monk', ranged: true, abilities: ['no_melee_penalty'] }, { slug: 'inquisitor', abilities: ['dispel_on_hit'] }],
  5: [
    { slug: 'cavalier', large: true, abilities: ['charge'], mod: { spd: 2 } },
    { slug: 'paladin', abilities: ['caster'], casterSpells: ['cure'] },
  ],
  6: [{ slug: 'angel', flying: true, mod: { init: 1 } }, { slug: 'seraph', flying: true, ranged: true }],
  7: [
    { slug: 'archangel', large: true, flying: true, abilities: ['caster'], casterSpells: ['resurrection'] },
    { slug: 'gold_dragon', large: true, flying: true, abilities: ['fire_breath', 'magic_resist'] },
  ],
})

const necro = race(
  'necro',
  {
    1: [{ slug: 'skeleton', mod: { hp: 0.9 } }, { slug: 'skeleton_archer', ranged: true }],
    2: [
      { slug: 'zombie', mod: { atk: -1, hp: 1.5, spd: -1, init: -2 } },
      { slug: 'ghoul', role: 'mobile', abilities: ['poison'], mod: { hp: 0.85, spd: 1, init: 1 } },
    ],
    3: [
      { slug: 'ghost', flying: true, abilities: ['incorporeal'], mod: { hp: 0.8 } },
      { slug: 'banshee', flying: true, abilities: ['initiative_drain'] },
    ],
    4: [
      { slug: 'vampire', flying: true, abilities: ['life_drain', 'no_retaliation'] },
      { slug: 'mummy', abilities: ['curse_on_hit'], mod: { hp: 1.2, spd: -1 } },
    ],
    5: [
      { slug: 'lich', ranged: true, abilities: ['area_attack'] },
      { slug: 'death_knight', role: 'mobile', large: true, abilities: ['charge', 'deadly_strike'] },
    ],
    6: [
      { slug: 'abomination', large: true, abilities: ['poison'], mod: { hp: 1.3, spd: -1 } },
      { slug: 'shadow_wyvern', large: true, flying: true, abilities: ['poison'] },
    ],
    7: [
      { slug: 'bone_dragon', large: true, flying: true, abilities: ['aura_dread'] },
      { slug: 'lich_lord', large: true, ranged: true, abilities: ['area_attack', 'mana_drain'] },
    ],
  },
  ['undead'],
)

const wizard = race('wizard', {
  1: [{ slug: 'gremlin', ranged: true }, { slug: 'brass_sentry', mod: { def: 3, hp: 1.1, spd: -1 } }],
  2: [
    { slug: 'gargoyle', flying: true, abilities: ['poison_immune'] },
    { slug: 'stone_hound', role: 'mobile', mod: { spd: 2, init: 2 } },
  ],
  3: [
    { slug: 'iron_golem', abilities: ['magic_resist'], mod: { hp: 1.2, spd: -1, init: -1 } },
    { slug: 'clay_golem', abilities: ['regeneration'], mod: { hp: 1.2, spd: -1 } },
  ],
  4: [
    { slug: 'mage', ranged: true, abilities: ['no_melee_penalty'] },
    { slug: 'enchanter', abilities: ['caster'], casterSpells: ['haste'] },
  ],
  5: [
    { slug: 'genie', flying: true, abilities: ['caster'], casterSpells: ['haste', 'divine_strength', 'stone_skin'] },
    { slug: 'naga', abilities: ['no_retaliation'] },
  ],
  6: [
    { slug: 'stone_colossus', large: true, mod: { atk: 2 } },
    { slug: 'storm_elemental', flying: true, abilities: ['chain_attack'] },
  ],
  7: [
    { slug: 'titan', large: true, ranged: true, abilities: ['no_melee_penalty'] },
    { slug: 'arcane_dragon', large: true, flying: true, abilities: ['spell_immune'] },
  ],
})

const elf = race('elf', {
  1: [
    { slug: 'sprite', flying: true, abilities: ['no_retaliation'], mod: { hp: 0.8 } },
    { slug: 'wood_scout', role: 'mobile', mod: { spd: 2, init: 2 } },
  ],
  2: [
    { slug: 'elven_archer', ranged: true, abilities: ['double_attack'], mod: { dmg: 0.6 } },
    { slug: 'dryad', abilities: ['entangle'] },
  ],
  3: [
    { slug: 'druid', ranged: true, abilities: ['no_melee_penalty'] },
    { slug: 'dire_wolf', role: 'mobile', abilities: ['double_attack'], mod: { dmg: 0.6, spd: 2 } },
  ],
  4: [
    { slug: 'unicorn', role: 'mobile', large: true, abilities: ['aura_magic_resist'], mod: { spd: 1 } },
    { slug: 'centaur', ranged: true, mod: { spd: 2 } },
  ],
  5: [
    { slug: 'treant', large: true, abilities: ['entangle'], mod: { def: 3, hp: 1.4, spd: -2 } },
    { slug: 'ranger', ranged: true, abilities: ['ignore_range_penalty'] },
  ],
  6: [
    { slug: 'phoenix', flying: true, abilities: ['rebirth'], mod: { spd: 3, init: 2 } },
    { slug: 'forest_guardian', large: true, abilities: ['area_attack'] },
  ],
  7: [
    { slug: 'silver_dragon', large: true, flying: true, abilities: ['fire_breath'] },
    { slug: 'emerald_dragon', large: true, flying: true, abilities: ['fire_breath', 'poison'] },
  ],
})

const barbarian = race('barbarian', {
  1: [
    { slug: 'goblin', mod: { hp: 0.8, init: 1 } },
    { slug: 'goblin_spearthrower', ranged: { shots: 6 } },
  ],
  2: [
    { slug: 'wolf_rider', role: 'mobile', abilities: ['double_attack'], mod: { dmg: 0.6, spd: 2 } },
    { slug: 'orc_warrior', mod: { def: 2, hp: 1.3 } },
  ],
  3: [{ slug: 'orc_axe_thrower', ranged: true }, { slug: 'berserker', mod: { atk: 4, def: -3 } }],
  4: [
    { slug: 'ogre', mod: { hp: 1.4, spd: -1 } },
    { slug: 'ogre_shaman', abilities: ['caster'], casterSpells: ['bloodlust'] },
  ],
  5: [
    { slug: 'thunderbird', large: true, flying: true, abilities: ['stun'] },
    { slug: 'war_troll', abilities: ['regeneration'], mod: { hp: 1.2 } },
  ],
  6: [
    { slug: 'cyclops', large: true, ranged: true, abilities: ['area_attack'] },
    { slug: 'hill_giant', large: true, abilities: ['stun'] },
  ],
  7: [
    { slug: 'mammoth', large: true, abilities: ['area_attack'] },
    { slug: 'war_rhino', large: true, abilities: ['charge'], mod: { spd: 1 } },
  ],
})

const demon = race('demon', {
  1: [{ slug: 'imp', role: 'mobile', mod: { hp: 0.8, spd: 2, init: 2 } }, { slug: 'familiar', role: 'mobile', abilities: ['mana_drain'], mod: { spd: 1 } }],
  2: [
    { slug: 'hellhound', role: 'mobile', abilities: ['double_attack'], mod: { dmg: 0.6, spd: 2 } },
    { slug: 'horned_demon', mod: { def: 2, hp: 1.3 } },
  ],
  3: [{ slug: 'succubus', ranged: true }, { slug: 'flame_lasher', role: 'mobile', abilities: ['no_retaliation'], mod: { spd: 1 } }],
  4: [
    { slug: 'nightmare', role: 'mobile', large: true, abilities: ['charge'], mod: { spd: 2 } },
    { slug: 'cerberus', role: 'mobile', abilities: ['area_attack'], mod: { spd: 1 } },
  ],
  5: [
    { slug: 'infernal_fiend', abilities: ['fire_aura'] },
    { slug: 'brimstone_thrower', ranged: true, abilities: ['area_attack'] },
  ],
  6: [
    { slug: 'efreet', flying: true, abilities: ['fire_immune', 'fire_aura'] },
    { slug: 'lava_brute', large: true, abilities: ['fire_immune'], mod: { hp: 1.3 } },
  ],
  7: [
    { slug: 'archfiend', role: 'mobile', large: true, abilities: ['teleport', 'no_retaliation'] },
    { slug: 'doom_lord', large: true, abilities: ['area_attack', 'fire_immune'] },
  ],
})

const dungeon = race('dungeon', {
  1: [{ slug: 'troglodyte', abilities: ['blind_immune'] }, { slug: 'cave_spider', role: 'mobile', abilities: ['poison'], mod: { spd: 1 } }],
  2: [
    { slug: 'harpy', flying: true, abilities: ['return_strike'], mod: { spd: 2 } },
    { slug: 'dark_scout', ranged: true },
  ],
  3: [
    { slug: 'shadow_crossbowman', ranged: true },
    { slug: 'assassin', role: 'mobile', abilities: ['double_attack'], mod: { dmg: 0.6, spd: 1, init: 2 } },
  ],
  4: [
    { slug: 'medusa', ranged: true, abilities: ['petrify'] },
    { slug: 'lizard_rider', role: 'mobile', abilities: ['charge'], mod: { spd: 2 } },
  ],
  5: [
    { slug: 'minotaur', mod: { atk: 3 } },
    { slug: 'deep_witch', ranged: true, abilities: ['caster'], casterSpells: ['confusion'] },
  ],
  6: [
    { slug: 'manticore', large: true, flying: true, abilities: ['poison'] },
    { slug: 'hydra', large: true, abilities: ['all_around_attack', 'no_retaliation'] },
  ],
  7: [
    { slug: 'shadow_dragon', large: true, flying: true, abilities: ['fire_breath'] },
    { slug: 'shadow_matriarch', ranged: true, abilities: ['area_attack', 'mana_drain'] },
  ],
})

const fortress = race('fortress', {
  1: [{ slug: 'dwarf_defender', mod: { def: 3, spd: -1 } }, { slug: 'hammer_hurler', ranged: true }],
  2: [
    { slug: 'boar_rider', role: 'mobile', abilities: ['charge'], mod: { spd: 2 } },
    { slug: 'shieldbearer', abilities: ['aura_defense'], mod: { def: 2 } },
  ],
  3: [
    { slug: 'rune_caster', ranged: true, abilities: ['no_melee_penalty'] },
    { slug: 'clan_elder', abilities: ['unlimited_retaliation'], mod: { hp: 1.3 } },
  ],
  4: [
    { slug: 'ironguard', mod: { def: 3, hp: 1.3, spd: -1 } },
    { slug: 'ballista_crew', ranged: true, abilities: ['ignore_range_penalty'], mod: { spd: -2 } },
  ],
  5: [
    { slug: 'roc', large: true, flying: true },
    { slug: 'mountain_bear', large: true, abilities: ['double_attack'], mod: { dmg: 0.6 } },
  ],
  6: [
    { slug: 'magma_golem', large: true, abilities: ['fire_aura'] },
    { slug: 'rune_golem', large: true, abilities: ['spell_immune'] },
  ],
  7: [
    { slug: 'magma_dragon', large: true, abilities: ['fire_breath'] },
    { slug: 'steam_juggernaut', large: true, ranged: true, abilities: ['area_attack'] },
  ],
})

export const UNITS: readonly UnitTemplate[] = [
  ...knight,
  ...necro,
  ...wizard,
  ...elf,
  ...barbarian,
  ...demon,
  ...dungeon,
  ...fortress,
]

const BY_ID = new Map(UNITS.map((u) => [u.id, u]))

export function getUnit(id: string): UnitTemplate {
  const u = BY_ID.get(id)
  if (!u) throw new Error(`Unknown unit: ${id}`)
  return u
}

export const findUnit = (id: string): UnitTemplate | undefined => BY_ID.get(id)

export function unitsOfRace(raceId: RaceId): UnitTemplate[] {
  return UNITS.filter((u) => u.raceId === raceId)
}

export function baseUnitOf(raceId: RaceId, tier: Tier): UnitTemplate {
  const u = UNITS.find((x) => x.raceId === raceId && x.tier === tier && x.variant === 'base')
  if (!u) throw new Error(`No base unit for ${raceId} tier ${tier}`)
  return u
}
