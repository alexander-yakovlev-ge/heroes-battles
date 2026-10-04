import type { AbilityId, UnitTemplate } from '../types.js'

type PowerInput = Pick<
  UnitTemplate,
  'attack' | 'defense' | 'damageMin' | 'damageMax' | 'health' | 'speed' | 'initiative' | 'isFlying' | 'ranged' | 'abilities' | 'size'
>

/** Вклад способностей в атакующую (off) и защитную (def) составляющие «силы» */
const ABILITY_FACTORS: Partial<Record<AbilityId, { off?: number; def?: number }>> = {
  double_attack: { off: 1.8 },
  no_retaliation: { off: 1.15 },
  life_drain: { def: 1.3 },
  area_attack: { off: 1.3 },
  poison: { off: 1.15 },
  fire_breath: { off: 1.2 },
  unlimited_retaliation: { def: 1.15 },
  charge: { off: 1.15 },
  entangle: { off: 1.05 },
  petrify: { off: 1.1 },
  stun: { off: 1.1 },
  regeneration: { def: 1.15 },
  rebirth: { def: 1.3 },
  incorporeal: { def: 1.3 },
  magic_resist: { def: 1.1 },
  aura_magic_resist: { def: 1.05 },
  aura_defense: { def: 1.1 },
  aura_dread: { off: 1.05 },
  fire_aura: { off: 1.15 },
  mana_drain: { off: 1.05 },
  caster: { off: 1.1 },
  chain_attack: { off: 1.4 },
  return_strike: { def: 1.15 },
  teleport: { off: 1.1 },
  ignore_range_penalty: { off: 1.1 },
  no_melee_penalty: { off: 1.1 },
  all_around_attack: { off: 1.3 },
  deadly_strike: { off: 1.2 },
  initiative_drain: { off: 1.05 },
  curse_on_hit: { off: 1.05 },
  dispel_on_hit: { off: 1.05 },
  undead: { def: 1.05 },
  fire_immune: { def: 1.05 },
  poison_immune: { def: 1.02 },
  blind_immune: { def: 1.02 },
  spell_immune: { def: 1.2 },
}

export const RANGED_POWER_FACTOR = 1.4
export const FLYING_POWER_BONUS = 0.1

/** «Сила» одного существа: эффективный урон × эффективное HP с поправкой на мобильность и способности */
export function unitPower(u: PowerInput): number {
  let off = ((u.damageMin + u.damageMax) / 2) * (1 + 0.05 * u.attack)
  let def = u.health * (1 + 0.05 * u.defense)
  if (u.ranged) off *= RANGED_POWER_FACTOR
  for (const a of u.abilities) {
    const f = ABILITY_FACTORS[a]
    if (f?.off) off *= f.off
    if (f?.def) def *= f.def
  }
  const mobility =
    1 + 0.04 * (u.speed - 4) + 0.02 * (u.initiative - 10) + (u.isFlying ? FLYING_POWER_BONUS : 0)
  return Math.sqrt(off * def) * Math.max(mobility, 0.6)
}

/** Сколько «силы» приходится на 1 единицу веса (калибровка: базовый юнит 1-го уровня ≈ вес 1) */
export const POWER_PER_WEIGHT = 3.3

export const weightFromPower = (power: number) => Math.max(0.5, Math.round((power / POWER_PER_WEIGHT) * 10) / 10)
