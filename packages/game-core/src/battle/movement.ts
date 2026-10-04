import { key, reachable, rectFree, rectsAdjacent } from '../grid.js'
import type { BattleState, Cell, UnitState } from '../types.js'
import { blockedCells, effectiveSpeed, hasAbility, hasEffect, rectOf, tmpl } from './helpers.js'

export interface Position extends Cell {
  steps: number
}

/** Все позиции, куда юнит может переместиться в этот ход (включая текущую, steps = 0) */
export function movePositions(state: BattleState, u: UnitState): Map<number, Position> {
  const t = tmpl(u)
  const result = new Map<number, Position>([[key(u.x, u.y), { x: u.x, y: u.y, steps: 0 }]])
  if (hasEffect(u, 'entangled')) return result
  const speed = effectiveSpeed(u)
  const blocked = blockedCells(state, u.id)
  if (t.isFlying || hasAbility(u, 'teleport')) {
    for (let y = 0; y + t.size <= state.grid.height; y++) {
      for (let x = 0; x + t.size <= state.grid.width; x++) {
        const steps = Math.max(Math.abs(x - u.x), Math.abs(y - u.y))
        if (steps === 0 || steps > speed) continue
        if (rectFree(state.grid, blocked, { x, y, size: t.size })) result.set(key(x, y), { x, y, steps })
      }
    }
    return result
  }
  for (const [k, steps] of reachable(state.grid, blocked, rectOf(u), speed)) {
    result.set(k, { x: k % 1000, y: Math.floor(k / 1000), steps })
  }
  return result
}

/** Позиции, из которых юнит может атаковать цель в ближнем бою */
export function attackPositions(state: BattleState, u: UnitState, target: UnitState): Position[] {
  const tRect = rectOf(target)
  const size = tmpl(u).size
  return [...movePositions(state, u).values()].filter((p) => rectsAdjacent({ x: p.x, y: p.y, size }, tRect))
}
