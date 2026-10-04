import { getSpell, type SpellTemplate } from '../data/spells.js'
import { rectDistance, type Rect } from '../grid.js'
import type { BattleEvent, BattleState, Cell, EffectId, SpellId, Team, UnitState } from '../types.js'
import { DEBUFFS, addEffect, applyDamage, heal, removeEffects } from './combat.js'
import { alive, hasAbility, hasMagicResist, rectOf, unitAtCell } from './helpers.js'

/** Может ли юнит быть целью/жертвой заклинания стороны casterTeam */
export function spellAffects(state: BattleState, spell: SpellTemplate, u: UnitState): boolean {
  if (!alive(u) || hasAbility(u, 'spell_immune')) return false
  if (spell.fire && hasAbility(u, 'fire_immune')) return false
  return true
}

/** Проверка цели для одиночных заклинаний */
export function isValidSpellTarget(state: BattleState, spellId: SpellId, casterTeam: Team, target: Cell): boolean {
  const spell = getSpell(spellId)
  if (spell.targeting === 'global') return true
  if (target.x < 0 || target.y < 0 || target.x >= state.grid.width || target.y >= state.grid.height) return false
  if (spell.targeting === 'area') return true
  const u = unitAtCell(state, target)
  if (!u || !spellAffects(state, spell, u)) return false
  if (spell.targeting === 'enemy' && u.team === casterTeam) return false
  if (spell.targeting === 'ally' && u.team !== casterTeam) return false
  if (spellId === 'raise_dead' && !hasAbility(u, 'undead')) return false
  if (spellId === 'resurrection' && hasAbility(u, 'undead')) return false
  if (spellId === 'blind' && (hasAbility(u, 'blind_immune') || hasAbility(u, 'undead'))) return false
  return true
}

const scale = (state: BattleState, u: UnitState, casterTeam: Team, v: number) =>
  u.team !== casterTeam && hasMagicResist(state, u) ? v * 0.5 : v

const duration = (state: BattleState, u: UnitState, casterTeam: Team, rounds: number) =>
  Math.max(1, Math.ceil(scale(state, u, casterTeam, rounds)))

function areaUnits(state: BattleState, spell: SpellTemplate, center: Cell): UnitState[] {
  const zone: Rect = { x: center.x - 1, y: center.y - 1, size: 3 }
  return state.units.filter((u) => spellAffects(state, spell, u) && rectDistance(zone, rectOf(u)) === 0)
}

function damage(state: BattleState, u: UnitState, casterTeam: Team, amount: number, events: BattleEvent[]) {
  applyDamage(state, u, Math.max(1, Math.floor(scale(state, u, casterTeam, amount))), events, null, 'spell')
}

function buff(state: BattleState, u: UnitState, casterTeam: Team, id: EffectId, rounds: number, events: BattleEvent[], value?: number) {
  const effect = { id, roundsLeft: duration(state, u, casterTeam, rounds), ...(value !== undefined ? { value } : {}) }
  addEffect(u, effect, events)
}

/**
 * Применение заклинания (§5.7). Цель уже проверена isValidSpellTarget.
 * power — сила героя или сила способности caster.
 */
export function resolveSpell(
  state: BattleState,
  spellId: SpellId,
  power: number,
  casterTeam: Team,
  target: Cell,
  events: BattleEvent[],
): void {
  const spell = getSpell(spellId)
  const single = spell.targeting === 'enemy' || spell.targeting === 'ally' ? unitAtCell(state, target) : undefined
  const p = Math.max(1, power)
  const bonus = 2 + Math.floor(p / 3)

  switch (spellId) {
    case 'lightning_bolt':
      if (single) damage(state, single, casterTeam, 10 + p * 6, events)
      break
    case 'cure':
      if (single) {
        removeEffects(single, DEBUFFS)
        heal(single, 10 + p * 5, false, events)
      }
      break
    case 'haste':
      if (single) buff(state, single, casterTeam, 'haste', 3, events)
      break
    case 'slow':
      if (single) buff(state, single, casterTeam, 'slow', 3, events)
      break
    case 'divine_strength':
      if (single) buff(state, single, casterTeam, 'divine_strength', 3, events, bonus)
      break
    case 'resurrection':
      if (single) heal(single, p * 15, true, events)
      break
    case 'curse':
      if (single) buff(state, single, casterTeam, 'curse', 3, events, bonus)
      break
    case 'raise_dead':
      if (single) heal(single, p * 20, true, events)
      break
    case 'blind':
      if (single) buff(state, single, casterTeam, 'blind', 2, events)
      break
    case 'chain_lightning': {
      if (!single) break
      const hit = new Set<string>([single.id])
      let current = single
      let amount = p * 8
      damage(state, current, casterTeam, amount, events)
      for (let i = 0; i < 3; i++) {
        const from = rectOf(current)
        const next = state.units
          .filter((u) => !hit.has(u.id) && spellAffects(state, spell, u))
          .sort((a, b) => rectDistance(from, rectOf(a)) - rectDistance(from, rectOf(b)))[0]
        if (!next) break
        amount /= 2
        hit.add(next.id)
        damage(state, next, casterTeam, amount, events)
        current = next
      }
      break
    }
    case 'regeneration':
      if (single) buff(state, single, casterTeam, 'regeneration', 3, events, 5 + p * 3)
      break
    case 'entangle':
      if (single) buff(state, single, casterTeam, 'entangled', 2, events)
      break
    case 'bloodlust':
      if (single) buff(state, single, casterTeam, 'bloodlust', 3, events, 3 + Math.floor(p / 3))
      break
    case 'war_cry':
      for (const u of state.units)
        if (u.team === casterTeam && spellAffects(state, spell, u)) buff(state, u, casterTeam, 'war_cry', 2, events)
      break
    case 'fireball':
      for (const u of areaUnits(state, spell, target)) damage(state, u, casterTeam, 8 + p * 5, events)
      break
    case 'armageddon':
      for (const u of state.units.filter((x) => spellAffects(state, spell, x))) damage(state, u, casterTeam, p * 8, events)
      break
    case 'confusion':
      if (single) buff(state, single, casterTeam, 'confusion', 2, events)
      break
    case 'meteor_shower':
      for (const u of areaUnits(state, spell, target)) damage(state, u, casterTeam, p * 7, events)
      break
    case 'stone_skin':
      if (single) buff(state, single, casterTeam, 'stone_skin', 3, events, bonus)
      break
    case 'earthquake':
      for (const u of areaUnits(state, spell, target)) {
        damage(state, u, casterTeam, p * 5, events)
        if (alive(u)) buff(state, u, casterTeam, 'earthquake', 2, events)
      }
      break
  }
}
