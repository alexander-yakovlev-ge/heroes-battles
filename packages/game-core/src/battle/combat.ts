import {
  CHARGE_MAX,
  CHARGE_PER_CELL,
  INCORPOREAL_CHANCE,
  LIFE_DRAIN_RATIO,
  POISON_RATIO,
  POISON_ROUNDS,
  PROC_CHANCE,
  RANGED_PENALTY,
  REBIRTH_RATIO,
  ROLE_ADVANTAGE,
} from '../constants.js'
import { rectDistance, rectsAdjacent, type Rect } from '../grid.js'
import type { Rng } from '../rng.js'
import type { BattleEvent, BattleState, Effect, EffectId, UnitState } from '../types.js'
import {
  alive,
  effectiveAttack,
  effectiveDefense,
  enemiesOf,
  hasAbility,
  hasEffect,
  heroOf,
  isAdjacentToEnemy,
  rectOf,
  stackWeight,
  tmpl,
  totalHp,
} from './helpers.js'

export type StrikeKind = 'melee' | 'ranged' | 'retaliation'

export interface DamageOptions {
  kind: StrikeKind
  /** Клеток пройдено перед атакой (для charge) */
  chargeCells?: number
}

/** Множитель треугольника ролей: бонус, если роль атакующего бьёт роль цели */
export function roleMultiplier(attacker: UnitState, target: UnitState): number {
  const adv = ROLE_ADVANTAGE[tmpl(attacker).role]
  return adv.beats === tmpl(target).role ? 1 + adv.bonus : 1
}

export const attackMultiplier = (diff: number) =>
  diff >= 0 ? Math.min(1 + 0.05 * diff, 3.0) : Math.max(1 / (1 + 0.05 * -diff), 0.3)

/**
 * Урон атаки по формуле §5.5. При rng === null возвращает ожидаемое значение (для ИИ).
 */
export function computeDamage(
  state: BattleState,
  attacker: UnitState,
  target: UnitState,
  opts: DamageOptions,
  rng: Rng | null,
  /** Для прогноза: все броски минимальные/максимальные (без rng) */
  roll?: 'min' | 'max',
): number {
  const t = tmpl(attacker)
  const n = Math.min(attacker.count, 10)
  if (n <= 0) return 0
  let rolled = 0
  if (rng) for (let i = 0; i < n; i++) rolled += rng.int(t.damageMin, t.damageMax)
  else if (roll) rolled = (roll === 'min' ? t.damageMin : t.damageMax) * n
  else rolled = ((t.damageMin + t.damageMax) / 2) * n
  const base = (rolled * attacker.count) / n

  const melee = opts.kind !== 'ranged'
  const diff = effectiveAttack(state, attacker, melee) - effectiveDefense(state, target)
  let mods = 1
  if (opts.kind === 'ranged') {
    if (isAdjacentToEnemy(state, attacker) && !hasAbility(attacker, 'no_melee_penalty')) mods *= RANGED_PENALTY
    const range = t.ranged?.range ?? 0
    if (rectDistance(rectOf(attacker), rectOf(target)) > range && !hasAbility(attacker, 'ignore_range_penalty'))
      mods *= RANGED_PENALTY
  }
  if (opts.chargeCells && hasAbility(attacker, 'charge')) mods *= 1 + Math.min(opts.chargeCells * CHARGE_PER_CELL, CHARGE_MAX)
  if (hasAbility(attacker, 'deadly_strike')) {
    if (rng) mods *= rng.chance(PROC_CHANCE) ? 2 : 1
    else if (roll) mods *= roll === 'max' ? 2 : 1
    else mods *= 1 + PROC_CHANCE
  }
  if (hasEffect(attacker, 'confusion')) mods *= 0.5
  mods *= roleMultiplier(attacker, target)
  const dmg = base * attackMultiplier(diff) * mods
  return rng || roll ? Math.max(1, Math.floor(dmg)) : dmg
}

export function addEffect(target: UnitState, effect: Effect, events: BattleEvent[]): void {
  const existing = target.effects.find((e) => e.id === effect.id)
  if (existing) {
    existing.roundsLeft = Math.max(existing.roundsLeft, effect.roundsLeft)
    if (effect.value !== undefined) existing.value = Math.max(existing.value ?? 0, effect.value)
  } else {
    target.effects.push({ ...effect })
  }
  events.push({ type: 'effect', targetId: target.id, effect: effect.id, rounds: effect.roundsLeft })
}

export const removeEffects = (u: UnitState, ids: readonly EffectId[]) => {
  u.effects = u.effects.filter((e) => !ids.includes(e.id))
}

export const DEBUFFS: readonly EffectId[] = [
  'slow',
  'curse',
  'poison',
  'blind',
  'entangled',
  'petrified',
  'stunned',
  'confusion',
  'initiative_drain',
  'earthquake',
]
export const BUFFS: readonly EffectId[] = ['haste', 'divine_strength', 'bloodlust', 'stone_skin', 'war_cry', 'regeneration']

/** Наносит урон стаку; возвращает фактически снятые HP */
export function applyDamage(
  state: BattleState,
  target: UnitState,
  damage: number,
  events: BattleEvent[],
  sourceId: string | null,
  kind: Extract<BattleEvent, { type: 'damage' }>['kind'],
): number {
  if (!alive(target) || damage <= 0) return 0
  const health = tmpl(target).health
  const before = totalHp(target)
  const dealt = Math.min(before, damage)
  const after = before - dealt
  const countBefore = target.count
  if (after <= 0) {
    target.count = 0
    target.topHp = 0
  } else {
    target.count = Math.ceil(after / health)
    target.topHp = after - (target.count - 1) * health
  }
  events.push({ type: 'damage', sourceId, targetId: target.id, damage: dealt, kills: countBefore - target.count, kind })
  if (hasEffect(target, 'blind')) removeEffects(target, ['blind'])
  if (target.count === 0) {
    if (hasAbility(target, 'rebirth') && !target.rebirthUsed) {
      target.rebirthUsed = true
      target.count = Math.max(1, Math.ceil(target.initialCount * REBIRTH_RATIO))
      target.topHp = health
      target.effects = []
      events.push({ type: 'rebirth', unitId: target.id, count: target.count })
    } else {
      target.effects = []
      events.push({ type: 'death', unitId: target.id })
      state.queue = state.queue.filter((id) => id !== target.id)
    }
  }
  return dealt
}

/** Лечение; при allowRaise поднимает погибших существ (не выше initialCount) */
export function heal(target: UnitState, hp: number, allowRaise: boolean, events: BattleEvent[]): void {
  if (!alive(target) || hp <= 0) return
  const health = tmpl(target).health
  const max = allowRaise ? target.initialCount * health : target.count * health
  const before = totalHp(target)
  const after = Math.min(max, before + hp)
  if (after <= before) return
  const countBefore = target.count
  target.count = Math.ceil(after / health)
  target.topHp = after - (target.count - 1) * health
  events.push({ type: 'heal', targetId: target.id, hp: after - before, raised: target.count - countBefore })
}

function applyOnHit(
  state: BattleState,
  attacker: UnitState,
  target: UnitState,
  dealt: number,
  rng: Rng,
  events: BattleEvent[],
): void {
  if (dealt > 0 && hasAbility(attacker, 'life_drain')) heal(attacker, Math.floor(dealt * LIFE_DRAIN_RATIO), true, events)
  if (hasAbility(attacker, 'mana_drain')) {
    const hero = heroOf(state, target)
    if (hero && hero.mana > 0) {
      const amount = Math.min(hero.mana, Math.max(1, Math.round(stackWeight(attacker) / 20)))
      hero.mana -= amount
      events.push({ type: 'mana_drain', heroUid: hero.uid, amount })
    }
  }
  if (!alive(target) || dealt <= 0) return
  if (hasAbility(attacker, 'poison') && !hasAbility(target, 'undead') && !hasAbility(target, 'poison_immune')) {
    addEffect(target, { id: 'poison', roundsLeft: POISON_ROUNDS, value: Math.max(1, Math.floor(dealt * POISON_RATIO)) }, events)
  }
  if (hasAbility(attacker, 'entangle')) {
    // До конца следующего хода цели: если она ещё не ходила в этом раунде — 1 раунд, иначе 2
    addEffect(target, { id: 'entangled', roundsLeft: state.queue.includes(target.id) ? 1 : 2 }, events)
  }
  if (hasAbility(attacker, 'petrify') && rng.chance(PROC_CHANCE)) {
    addEffect(target, { id: 'petrified', roundsLeft: 99 }, events)
  }
  if (hasAbility(attacker, 'stun') && rng.chance(PROC_CHANCE)) addEffect(target, { id: 'stunned', roundsLeft: 2 }, events)
  if (hasAbility(attacker, 'initiative_drain')) addEffect(target, { id: 'initiative_drain', roundsLeft: 2, value: 2 }, events)
  if (hasAbility(attacker, 'curse_on_hit')) addEffect(target, { id: 'curse', roundsLeft: 2, value: 3 }, events)
  if (hasAbility(attacker, 'dispel_on_hit') && target.effects.some((e) => BUFFS.includes(e.id))) {
    removeEffects(target, BUFFS)
    events.push({ type: 'dispel', targetId: target.id })
  }
}

/** Прямоугольник цели, расширенный на 1 клетку (зона 3×3 для area_attack) */
const expand = (r: Rect): Rect => ({ x: r.x - 1, y: r.y - 1, size: r.size + 2 })
const intersects = (a: Rect, b: Rect) => rectDistance(a, b) === 0

/** Клетка «за целью» по направлению атаки — для fire_breath */
function cellBehind(attacker: Rect, target: Rect): { x: number; y: number } {
  const ac = { x: attacker.x + (attacker.size - 1) / 2, y: attacker.y + (attacker.size - 1) / 2 }
  const tc = { x: target.x + (target.size - 1) / 2, y: target.y + (target.size - 1) / 2 }
  const dx = Math.sign(tc.x - ac.x)
  const dy = Math.sign(tc.y - ac.y)
  const x = dx > 0 ? target.x + target.size : dx < 0 ? target.x - 1 : Math.round(tc.x)
  const y = dy > 0 ? target.y + target.size : dy < 0 ? target.y - 1 : Math.round(tc.y)
  return { x, y }
}

/**
 * Одиночный удар/выстрел со всеми эффектами атакующего. Возвращает урон по основной цели.
 * Ответный удар (kind = 'retaliation') — без площадных эффектов.
 */
export function strike(
  state: BattleState,
  attacker: UnitState,
  target: UnitState,
  opts: DamageOptions,
  rng: Rng,
  events: BattleEvent[],
): number {
  if (!alive(attacker) || !alive(target)) return 0
  const eventKind = opts.kind
  const damageFor = (victim: UnitState, ratio = 1) =>
    Math.max(1, Math.floor(computeDamage(state, attacker, victim, opts, rng) * ratio))

  const evaded = (victim: UnitState) =>
    opts.kind !== 'ranged' && hasAbility(victim, 'incorporeal') && rng.chance(INCORPOREAL_CHANCE)

  // Вторичные цели определяются до нанесения урона (позиции не меняются)
  const secondary: { victim: UnitState; ratio: number }[] = []
  if (opts.kind !== 'retaliation') {
    const aRect = rectOf(attacker)
    const tRect = rectOf(target)
    if (hasAbility(attacker, 'area_attack')) {
      const zone = expand(tRect)
      for (const u of state.units)
        if (alive(u) && u.id !== attacker.id && u.id !== target.id && intersects(zone, rectOf(u))) secondary.push({ victim: u, ratio: 1 })
    }
    if (hasAbility(attacker, 'all_around_attack') && opts.kind === 'melee') {
      for (const e of enemiesOf(state, attacker))
        if (e.id !== target.id && rectsAdjacent(aRect, rectOf(e))) secondary.push({ victim: e, ratio: 1 })
    }
    if (hasAbility(attacker, 'fire_breath')) {
      const c = cellBehind(aRect, tRect)
      for (const u of state.units)
        if (alive(u) && u.id !== attacker.id && u.id !== target.id && !hasAbility(u, 'fire_immune') && intersects({ ...c, size: 1 }, rectOf(u)))
          secondary.push({ victim: u, ratio: 1 })
    }
    if (hasAbility(attacker, 'chain_attack')) {
      const others = enemiesOf(state, attacker)
        .filter((e) => e.id !== target.id)
        .sort((a, b) => rectDistance(tRect, rectOf(a)) - rectDistance(tRect, rectOf(b)))
        .slice(0, 2)
      others.forEach((e, i) => secondary.push({ victim: e, ratio: i === 0 ? 0.5 : 0.25 }))
    }
  }

  let primary = 0
  if (evaded(target)) {
    events.push({ type: 'evade', sourceId: attacker.id, targetId: target.id })
  } else {
    primary = applyDamage(state, target, damageFor(target), events, attacker.id, eventKind)
    applyOnHit(state, attacker, target, primary, rng, events)
  }
  const seen = new Set<string>()
  for (const { victim, ratio } of secondary) {
    if (seen.has(victim.id) || !alive(victim)) continue
    seen.add(victim.id)
    if (evaded(victim)) {
      events.push({ type: 'evade', sourceId: attacker.id, targetId: victim.id })
      continue
    }
    const dealt = applyDamage(state, victim, damageFor(victim, ratio), events, attacker.id, eventKind)
    if (dealt > 0 && hasAbility(attacker, 'life_drain')) heal(attacker, Math.floor(dealt * LIFE_DRAIN_RATIO), true, events)
  }
  return primary
}

export function canRetaliate(target: UnitState): boolean {
  if (!alive(target)) return false
  if (hasEffect(target, 'blind') || hasEffect(target, 'petrified')) return false
  return hasAbility(target, 'unlimited_retaliation') || !target.retaliatedThisRound
}
