import { getSpell, type BattleEvent, type Cell, type UnitState } from '@hb/game-core'

/**
 * Программные анимации боя (§10.1): события действия превращаются в последовательность шагов —
 * перемещение, удар/выстрел, всплывающие числа урона, вспышка заклинания, затухание при гибели.
 */

export interface FloatText {
  targetId: string
  text: string
  kind: 'damage' | 'heal' | 'miss'
}

export type AnimStep =
  | { kind: 'move'; unitId: string; from: Cell; to: Cell; duration: number }
  | { kind: 'strike'; sourceId: string; targetId: string; ranged: boolean; duration: number }
  | { kind: 'hits'; texts: FloatText[]; duration: number }
  | { kind: 'spell'; center: Cell; radius: number; global: boolean; duration: number; color: 'magic' | 'hero' }
  | { kind: 'death'; unitId: string; duration: number }

export const MOVE_MS_PER_CELL = 110

/** units — позиции юнитов (для эффектов, привязанных к цели, например удара героя) */
export function buildSteps(events: readonly BattleEvent[], units?: ReadonlyMap<string, Cell>): AnimStep[] {
  const steps: AnimStep[] = []
  const lastHits = (): Extract<AnimStep, { kind: 'hits' }> => {
    const last = steps[steps.length - 1]
    if (last?.kind === 'hits') return last
    const step: AnimStep = { kind: 'hits', texts: [], duration: 520 }
    steps.push(step)
    return step
  }
  for (const ev of events) {
    switch (ev.type) {
      case 'move': {
        const dist = Math.max(Math.abs(ev.to.x - ev.from.x), Math.abs(ev.to.y - ev.from.y))
        steps.push({ kind: 'move', unitId: ev.unitId, from: ev.from, to: ev.to, duration: Math.min(600, 160 + dist * MOVE_MS_PER_CELL) })
        break
      }
      case 'damage': {
        const physical = ev.kind === 'melee' || ev.kind === 'ranged' || ev.kind === 'retaliation'
        const last = steps[steps.length - 1]
        const sameStrike = last?.kind === 'hits' && steps[steps.length - 2]?.kind === 'strike' && (steps[steps.length - 2] as { sourceId: string }).sourceId === ev.sourceId
        if (physical && ev.sourceId && !sameStrike) {
          steps.push({ kind: 'strike', sourceId: ev.sourceId, targetId: ev.targetId, ranged: ev.kind === 'ranged', duration: ev.kind === 'ranged' ? 320 : 260 })
        }
        lastHits().texts.push({ targetId: ev.targetId, text: `−${ev.damage}${ev.kills > 0 ? ` †${ev.kills}` : ''}`, kind: 'damage' })
        break
      }
      case 'evade':
        lastHits().texts.push({ targetId: ev.targetId, text: '✦', kind: 'miss' })
        break
      case 'heal':
        lastHits().texts.push({ targetId: ev.targetId, text: `+${ev.hp}${ev.raised > 0 ? ` ↑${ev.raised}` : ''}`, kind: 'heal' })
        break
      case 'cast': {
        const spell = getSpell(ev.spellId)
        steps.push({
          kind: 'spell',
          center: ev.target,
          radius: spell.targeting === 'area' ? 1.5 : 0.6,
          global: spell.targeting === 'global',
          duration: 420,
          color: 'magic',
        })
        break
      }
      case 'hero_strike': {
        const target = units?.get(ev.targetId)
        if (target) steps.push({ kind: 'spell', center: target, radius: 0.7, global: false, duration: 360, color: 'hero' })
        break
      }
      case 'ability':
        steps.push({ kind: 'strike', sourceId: ev.unitId, targetId: ev.targetId, ranged: true, duration: 320 })
        break
      case 'death':
        steps.push({ kind: 'death', unitId: ev.unitId, duration: 420 })
        break
      default:
        break
    }
  }
  return steps
}

export const totalDuration = (steps: readonly AnimStep[]) => steps.reduce((s, x) => s + x.duration, 0)

/** Позиция проигрывания: индекс текущего шага и прогресс 0..1 */
export interface Playhead {
  index: number
  t: number
}

export function playheadAt(steps: readonly AnimStep[], elapsed: number): Playhead {
  let acc = 0
  for (let i = 0; i < steps.length; i++) {
    const d = steps[i]!.duration
    if (elapsed < acc + d) return { index: i, t: (elapsed - acc) / d }
    acc += d
  }
  return { index: steps.length, t: 0 }
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Видимая позиция юнита (в клетках) с учётом перемещений, ещё не проигранных или идущих сейчас */
export function visualPosition(u: UnitState, steps: readonly AnimStep[], ph: Playhead): { x: number; y: number } {
  let pos: Cell | null = null
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!
    if (s.kind !== 'move' || s.unitId !== u.id) continue
    if (i < ph.index) pos = s.to
    else if (i === ph.index) {
      const k = ease(ph.t)
      return { x: s.from.x + (s.to.x - s.from.x) * k, y: s.from.y + (s.to.y - s.from.y) * k }
    } else return pos ?? s.from
  }
  return pos ?? { x: u.x, y: u.y }
}

/** Индекс последнего шага с уроном/лечением юнита — до него показывается старая численность */
export function lastHitIndex(unitId: string, steps: readonly AnimStep[]): number {
  for (let i = steps.length - 1; i >= 0; i--) {
    const s = steps[i]!
    if (s.kind === 'hits' && s.texts.some((x) => x.targetId === unitId)) return i
  }
  return -1
}

/** Прозрачность юнита: погибшие исчезают на шаге гибели, до него видны */
export function unitOpacity(u: UnitState, steps: readonly AnimStep[], ph: Playhead): number {
  if (u.count > 0) return 1
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!
    if (s.kind !== 'death' || s.unitId !== u.id) continue
    if (i > ph.index) return 1
    if (i === ph.index) return 1 - ph.t
  }
  return 0
}
