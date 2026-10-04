import { applyAction } from '../battle/engine.js'
import { alive, enemiesOf, findUnitState, rectOf, tmpl, totalHp } from '../battle/helpers.js'
import { rectDistance } from '../grid.js'
import { createRng, type Rng } from '../rng.js'
import type { Action, BattleState, Team } from '../types.js'
import { candidateActions } from './candidates.js'

export type BotDifficulty = 'easy' | 'normal'

/** «Материал» команды — суммарный вес живых существ с учётом недостающего HP */
export function material(state: BattleState, team: Team): number {
  return state.units
    .filter((u) => u.team === team && alive(u))
    .reduce((s, u) => s + (totalHp(u) / tmpl(u).health) * tmpl(u).weight, 0)
}

/** Оценка действия симуляцией: (потери врага − свои потери). Общий seed снижает шум сравнения. */
function evaluate(state: BattleState, action: Action, uid: string, seed: number): number {
  const team = state.heroes[uid]!.team
  const enemy: Team = team === 'red' ? 'blue' : 'red'
  try {
    const { state: next } = applyAction(state, action, uid, createRng(seed))
    const gain = material(state, enemy) - material(next, enemy)
    const loss = material(state, team) - material(next, team)
    if (next.status === 'finished') {
      if (next.winner === team) return 1e6
      if (next.winner === enemy) return -1e6
    }
    return gain - loss
  } catch {
    return -Infinity
  }
}

function approach(state: BattleState, actions: Action[]): Action | undefined {
  const u = findUnitState(state, state.activeUnitId!)
  const enemies = enemiesOf(state, u)
  if (enemies.length === 0) return undefined
  const size = tmpl(u).size
  const distFrom = (x: number, y: number) =>
    Math.min(...enemies.map((e) => rectDistance({ x, y, size }, rectOf(e))))
  const current = distFrom(u.x, u.y)
  let best: Action | undefined
  let bestDist = current
  for (const a of actions) {
    if (a.type !== 'move') continue
    const d = distFrom(a.to.x, a.to.y)
    if (d < bestDist) {
      bestDist = d
      best = a
    }
  }
  return best
}

/** Выбор действия бота (§9). Вызывается повторно, пока ход не перейдёт к другому игроку. */
export function chooseBotAction(state: BattleState, uid: string, difficulty: BotDifficulty, rng: Rng): Action | null {
  const { unit, casts } = candidateActions(state, uid)
  if (unit.length === 0) return null
  const u = findUnitState(state, state.activeUnitId!)

  if (difficulty === 'easy') {
    if (casts.length > 0 && rng.chance(0.3)) return rng.pick(casts)
    const offensive = unit.filter((a) => a.type === 'attack' || a.type === 'shoot')
    const pool = offensive.length > 0 && rng.chance(0.7) ? offensive : unit.filter((a) => a.type !== 'wait')
    return rng.pick(pool)
  }

  const seed = rng.int(0, 0x7fffffff)
  if (casts.length > 0) {
    let bestCast: Action | null = null
    let bestCastScore = 0
    for (const a of casts) {
      const s = evaluate(state, a, uid, seed)
      if (s > bestCastScore) {
        bestCastScore = s
        bestCast = a
      }
    }
    // Порог: заклинание должно стоить хотя бы ~1 веса материала
    if (bestCast && bestCastScore >= 1) return bestCast
  }

  let best: Action | null = null
  let bestScore = 0
  for (const a of unit) {
    if (a.type !== 'attack' && a.type !== 'shoot' && a.type !== 'ability') continue
    const s = evaluate(state, a, uid, seed)
    if (s > bestScore) {
      bestScore = s
      best = a
    }
  }
  if (best) return best

  const ranged = tmpl(u).ranged && (u.shotsLeft ?? 0) > 0
  if (!ranged) {
    const move = approach(state, unit)
    if (move) return move
  }
  return unit.find((a) => a.type === 'defend')!
}
