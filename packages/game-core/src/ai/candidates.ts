import { getSpell } from '../data/spells.js'
import { alive, enemiesOf, findUnitState, hasAbility, tmpl } from '../battle/helpers.js'
import { isValidSpellTarget } from '../battle/magic.js'
import { attackPositions, movePositions } from '../battle/movement.js'
import type { Action, BattleState, Cell } from '../types.js'

/**
 * Кандидаты на действие игрока uid в текущем состоянии.
 * Для площадных заклинаний в качестве центров берутся только клетки юнитов.
 */
export function candidateActions(state: BattleState, uid: string): { unit: Action[]; casts: Action[] } {
  const unit: Action[] = []
  const casts: Action[] = []
  if (state.status !== 'active' || !state.activeUnitId) return { unit, casts }
  const u = findUnitState(state, state.activeUnitId)
  if (u.owner !== uid) return { unit, casts }
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
  if (hasAbility(u, 'caster') && !u.casterUsed && t.casterSpells) {
    for (const target of state.units.filter(alive)) {
      if (t.casterSpells.some((s) => isValidSpellTarget(state, s, u.team, { x: target.x, y: target.y })))
        unit.push({ type: 'ability', unitId: u.id, targetId: target.id })
    }
  }

  const hero = state.heroes[uid]
  if (hero && !hero.castThisRound) {
    const unitCells: Cell[] = state.units.filter(alive).map((x) => ({ x: x.x, y: x.y }))
    for (const spellId of hero.spells) {
      const spell = getSpell(spellId)
      if (hero.mana < spell.mana) continue
      const targets: Cell[] = spell.targeting === 'global' ? [{ x: 0, y: 0 }] : unitCells
      for (const target of targets) {
        if (isValidSpellTarget(state, spellId, hero.team, target)) casts.push({ type: 'cast', heroUid: uid, spellId, target })
      }
    }
  }
  return { unit, casts }
}
