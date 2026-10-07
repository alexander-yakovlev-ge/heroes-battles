import { getSpell } from '../data/spells.js'
import { alive, enemiesOf, findUnitState, hasAbility, isAdjacentToEnemy, shootMoveLimit, tmpl } from '../battle/helpers.js'
import { isValidSpellTarget } from '../battle/magic.js'
import { attackPositions, movePositions } from '../battle/movement.js'
import type { Action, BattleState, Cell } from '../types.js'

/**
 * Кандидаты на действие игрока uid в текущем состоянии.
 * Ход юнита — unit (перемещение, атаки, способности, ожидание, защита);
 * ход героя (§5.3) — casts (заклинания) и hero (удары героя и пропуск).
 * Для площадных заклинаний в качестве центров берутся только клетки юнитов.
 */
export function candidateActions(state: BattleState, uid: string): { unit: Action[]; casts: Action[]; hero: Action[] } {
  const unit: Action[] = []
  const casts: Action[] = []
  const hero: Action[] = []
  if (state.status !== 'active') return { unit, casts, hero }

  if (state.activeHeroUid) {
    const h = state.heroes[state.activeHeroUid]
    if (state.activeHeroUid !== uid || !h) return { unit, casts, hero }
    const unitCells: Cell[] = state.units.filter(alive).map((x) => ({ x: x.x, y: x.y }))
    for (const spellId of h.spells) {
      const spell = getSpell(spellId)
      if (h.mana < spell.mana) continue
      const targets: Cell[] = spell.targeting === 'global' ? [{ x: 0, y: 0 }] : unitCells
      for (const target of targets) {
        if (isValidSpellTarget(state, spellId, h.team, target)) casts.push({ type: 'cast', heroUid: uid, spellId, target })
      }
    }
    for (const e of state.units) if (alive(e) && e.team !== h.team) hero.push({ type: 'hero_strike', heroUid: uid, targetId: e.id })
    hero.push({ type: 'hero_pass', heroUid: uid })
    return { unit, casts, hero }
  }

  if (!state.activeUnitId) return { unit, casts, hero }
  const u = findUnitState(state, state.activeUnitId)
  if (u.owner !== uid) return { unit, casts, hero }
  const t = tmpl(u)

  unit.push({ type: 'defend', unitId: u.id })
  if (!u.waitedThisRound) unit.push({ type: 'wait', unitId: u.id })
  for (const p of movePositions(state, u).values()) {
    if (p.steps > 0) unit.push({ type: 'move', unitId: u.id, to: { x: p.x, y: p.y } })
  }
  for (const e of enemiesOf(state, u)) {
    for (const p of attackPositions(state, u, e)) unit.push({ type: 'attack', unitId: u.id, targetId: e.id, from: { x: p.x, y: p.y } })
    if (t.ranged && (u.shotsLeft ?? 0) > 0) unit.push({ type: 'shoot', unitId: u.id, targetId: e.id })
  }
  // Перемещение на часть хода и выстрел (§5.6): только в клетки не вплотную к врагу —
  // вплотную выстрел со штрафом, такой ход бессмыслен
  if (t.ranged && (u.shotsLeft ?? 0) > 0) {
    const limit = shootMoveLimit(u)
    const spots = [...movePositions(state, u).values()].filter((p) => p.steps > 0 && p.steps <= limit && !isAdjacentToEnemy(state, u, p))
    for (const e of enemiesOf(state, u))
      for (const p of spots) unit.push({ type: 'shoot', unitId: u.id, targetId: e.id, from: { x: p.x, y: p.y } })
  }
  if (hasAbility(u, 'caster') && !u.casterUsed && t.casterSpells) {
    for (const target of state.units.filter(alive)) {
      if (t.casterSpells.some((s) => isValidSpellTarget(state, s, u.team, { x: target.x, y: target.y })))
        unit.push({ type: 'ability', unitId: u.id, targetId: target.id })
    }
  }
  return { unit, casts, hero }
}
