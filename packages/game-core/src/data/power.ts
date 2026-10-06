import type { AbilityId, UnitTemplate } from '../types.js'
import { TIER_BASELINE } from './baseline.js'

type PowerInput = Pick<
  UnitTemplate,
  'tier' | 'attack' | 'defense' | 'damageMin' | 'damageMax' | 'health' | 'speed' | 'initiative' | 'isFlying' | 'ranged' | 'abilities' | 'size'
>

/**
 * Вклад способностей в атакующую (off) и защитную (def) составляющие «силы».
 * Значения откалиброваны по боям ботов (scripts/units.mjs); способность не может удешевлять юнит (≥ 1).
 */
const ABILITY_FACTORS: Partial<Record<AbilityId, { off?: number; def?: number }>> = {
  double_attack: { off: 1.55 },
  no_retaliation: { off: 1.5 },
  life_drain: { def: 1.25 },
  area_attack: { off: 1.22 },
  poison: { off: 1.19 },
  fire_breath: { off: 1.17 },
  unlimited_retaliation: { def: 1.06 },
  charge: { off: 1.12 },
  entangle: { off: 1.11 },
  petrify: { off: 1.06 },
  stun: { off: 1 },
  regeneration: { def: 1.2 },
  rebirth: { def: 1.33 },
  incorporeal: { def: 1.12 },
  magic_resist: { def: 1 },
  aura_magic_resist: { def: 1 },
  aura_defense: { def: 1.06 },
  aura_dread: { off: 1.03 },
  fire_aura: { off: 1.26 },
  mana_drain: { off: 1 },
  caster: { off: 1.03 },
  chain_attack: { off: 1.75 },
  return_strike: { def: 1.02 },
  teleport: { off: 1.2 },
  ignore_range_penalty: { off: 1.22 },
  no_melee_penalty: { off: 1.12 },
  all_around_attack: { off: 1.34 },
  deadly_strike: { off: 1.04 },
  initiative_drain: { off: 1.03 },
  curse_on_hit: { off: 1.11 },
  dispel_on_hit: { off: 1 },
  undead: { def: 1.04 },
  fire_immune: { def: 1.08 },
  poison_immune: { def: 1.06 },
  blind_immune: { def: 1.01 },
  spell_immune: { def: 1.04 },
}

export const RANGED_POWER_FACTOR = 1.92
export const FLYING_POWER_BONUS = 0.047
export const LARGE_POWER_FACTOR = 1.02
/** Доля защитной составляющей в силе (0.5 — урон и HP равноценны) */
export const DEF_SHARE = 0.513
/**
 * Цена скорости выше/ниже базовой линии уровня (за клетку); медлительность стоит дороже, чем прибавка.
 * Прибавка скорости и инициатива — не ниже минимума: бот их почти не использует, а игрок будет.
 */
export const SPEED_UP_COST = 0.01
export const SPEED_DOWN_COST = 0.058
export const INITIATIVE_COST = 0.005

/** «Сила» одного существа: эффективный урон × эффективное HP с поправкой на мобильность и способности */
export function unitPower(u: PowerInput): number {
  const b = TIER_BASELINE[u.tier]
  let off = ((u.damageMin + u.damageMax) / 2) * (1 + 0.05 * u.attack)
  let def = u.health * (1 + 0.05 * u.defense)
  if (u.ranged) off *= RANGED_POWER_FACTOR
  for (const a of u.abilities) {
    const f = ABILITY_FACTORS[a]
    if (f?.off) off *= f.off
    if (f?.def) def *= f.def
  }
  // Скорость меряется от базовой линии уровня; +1 скорости крупного юнита входит в LARGE_POWER_FACTOR
  const dSpeed = u.speed - b.speed - (u.size === 2 ? 1 : 0)
  const mobility =
    1 +
    0.04 * (b.speed - 4) +
    SPEED_UP_COST * Math.max(0, dSpeed) -
    SPEED_DOWN_COST * Math.max(0, -dSpeed) +
    INITIATIVE_COST * (u.initiative - 10) +
    (u.isFlying ? FLYING_POWER_BONUS : 0)
  const size = u.size === 2 ? LARGE_POWER_FACTOR : 1
  return off ** (1 - DEF_SHARE) * def ** DEF_SHARE * Math.max(mobility, 0.6) * size
}

/** Сколько «силы» приходится на 1 единицу веса (калибровка: базовый юнит 1-го уровня ≈ вес 1) */
export const POWER_PER_WEIGHT = 3.3

/** Вес округляется до 0.01: у юнитов 1-го уровня (вес ≈ 1) шаг 0.1 давал бы ±5% ошибки цены */
export const weightFromPower = (power: number) => Math.max(0.5, Math.round((power / POWER_PER_WEIGHT) * 100) / 100)
