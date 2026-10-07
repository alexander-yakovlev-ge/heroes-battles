import { getSpell, type BattleEvent, type Cell, type Team, type UnitState } from '@hb/game-core'
import type { Attack, Bone, Motion } from '@hb/assets'

/**
 * Программные анимации боя (§10.1). События действия превращаются в последовательность шагов
 * (перемещение по пути, удар, выстрел, попадания, заклинание, гибель), а поза каждого юнита
 * в каждый момент — функция от шагов, позиции проигрывания и времени (дыхание в покое).
 */

export interface FloatText {
  targetId: string
  /** Кто нанёс урон — для направления отдачи */
  sourceId: string | null
  text: string
  kind: 'damage' | 'heal' | 'miss'
}

export type AnimStep =
  | { kind: 'move'; unitId: string; path: Cell[]; flying: boolean; duration: number }
  | { kind: 'strike'; sourceId: string; targetId: string; ranged: boolean; duration: number }
  | { kind: 'hits'; texts: FloatText[]; duration: number }
  | { kind: 'spell'; center: Cell; radius: number; global: boolean; duration: number; color: 'magic' | 'hero' }
  | { kind: 'death'; unitId: string; duration: number }

export const MOVE_MS_PER_CELL = 150

export interface StepContext {
  /** Позиции юнитов до действия — для эффектов, привязанных к цели */
  positions?: ReadonlyMap<string, Cell>
  /** Путь перемещения по клеткам (включая начало и конец) */
  pathOf?: (unitId: string, from: Cell, to: Cell) => Cell[]
  isFlying?: (unitId: string) => boolean
}

export function buildSteps(events: readonly BattleEvent[], ctx: StepContext = {}): AnimStep[] {
  const steps: AnimStep[] = []
  const lastHits = (): Extract<AnimStep, { kind: 'hits' }> => {
    const last = steps[steps.length - 1]
    if (last?.kind === 'hits') return last
    const step: AnimStep = { kind: 'hits', texts: [], duration: 560 }
    steps.push(step)
    return step
  }
  for (const ev of events) {
    switch (ev.type) {
      case 'move': {
        const flying = ctx.isFlying?.(ev.unitId) ?? false
        const path = flying ? [ev.from, ev.to] : (ctx.pathOf?.(ev.unitId, ev.from, ev.to) ?? [ev.from, ev.to])
        const cells = flying ? Math.max(Math.abs(ev.to.x - ev.from.x), Math.abs(ev.to.y - ev.from.y)) : path.length - 1
        steps.push({ kind: 'move', unitId: ev.unitId, path, flying, duration: Math.min(1100, 200 + cells * MOVE_MS_PER_CELL) })
        break
      }
      case 'damage': {
        const physical = ev.kind === 'melee' || ev.kind === 'ranged' || ev.kind === 'retaliation'
        const last = steps[steps.length - 1]
        const prev = steps[steps.length - 2]
        const sameStrike = last?.kind === 'hits' && prev?.kind === 'strike' && prev.sourceId === ev.sourceId
        if (physical && ev.sourceId && !sameStrike) {
          const ranged = ev.kind === 'ranged'
          steps.push({ kind: 'strike', sourceId: ev.sourceId, targetId: ev.targetId, ranged, duration: ranged ? 520 : 480 })
        }
        lastHits().texts.push({
          targetId: ev.targetId,
          sourceId: ev.sourceId,
          text: `−${ev.damage}${ev.kills > 0 ? ` †${ev.kills}` : ''}`,
          kind: 'damage',
        })
        break
      }
      case 'evade':
        lastHits().texts.push({ targetId: ev.targetId, sourceId: ev.sourceId, text: '✦', kind: 'miss' })
        break
      case 'heal':
        lastHits().texts.push({ targetId: ev.targetId, sourceId: null, text: `+${ev.hp}${ev.raised > 0 ? ` ↑${ev.raised}` : ''}`, kind: 'heal' })
        break
      case 'cast': {
        const spell = getSpell(ev.spellId)
        steps.push({
          kind: 'spell',
          center: ev.target,
          radius: spell.targeting === 'area' ? 1.5 : 0.6,
          global: spell.targeting === 'global',
          duration: 600,
          color: 'magic',
        })
        break
      }
      case 'hero_strike': {
        const target = ctx.positions?.get(ev.targetId)
        if (target) steps.push({ kind: 'spell', center: target, radius: 0.7, global: false, duration: 520, color: 'hero' })
        break
      }
      case 'ability':
        steps.push({ kind: 'strike', sourceId: ev.unitId, targetId: ev.targetId, ranged: true, duration: 520 })
        break
      case 'death':
        steps.push({ kind: 'death', unitId: ev.unitId, duration: 650 })
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

export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2)

/** Точка на пути из клеток при прогрессе k ∈ [0, 1] (равномерно по сегментам) */
export function pointOnPath(path: readonly Cell[], k: number): { x: number; y: number; segment: number; frac: number } {
  if (path.length === 1) return { x: path[0]!.x, y: path[0]!.y, segment: 0, frac: 0 }
  const segs = path.length - 1
  const pos = Math.min(Math.max(k, 0), 1) * segs
  const i = Math.min(Math.floor(pos), segs - 1)
  const f = pos - i
  const a = path[i]!
  const b = path[i + 1]!
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, segment: i, frac: f }
}

/** Видимая позиция юнита (левая верхняя клетка, дробно) с учётом ещё не проигранных и текущих перемещений */
export function visualPosition(u: UnitState, steps: readonly AnimStep[], ph: Playhead): { x: number; y: number } {
  let pos: Cell | null = null
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!
    if (s.kind !== 'move' || s.unitId !== u.id) continue
    const from = s.path[0]!
    const to = s.path[s.path.length - 1]!
    if (i < ph.index) pos = to
    else if (i === ph.index) {
      const p = pointOnPath(s.path, s.flying ? ease(ph.t) : ph.t)
      return { x: p.x, y: p.y }
    } else return pos ?? from
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

/** Прозрачность юнита: погибшие падают и исчезают на шаге гибели, до него видны */
export function unitOpacity(u: UnitState, steps: readonly AnimStep[], ph: Playhead): number {
  if (u.count > 0) return 1
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]!
    if (s.kind !== 'death' || s.unitId !== u.id) continue
    if (i > ph.index) return 1
    if (i === ph.index) return 1 - Math.max(0, (ph.t - 0.45) / 0.55)
  }
  return 0
}

/** Поза юнита для отрисовки */
export interface Pose {
  /** Позиция левой верхней клетки (дробно, со смещениями удара и отдачи) */
  x: number
  y: number
  /** Высота над землёй, в клетках */
  lift: number
  /** Наклон вокруг точки опоры, радианы (по часовой) */
  rot: number
  sx: number
  sy: number
  /** Куда смотрит: 1 — вправо, -1 — влево */
  facing: 1 | -1
  opacity: number
  /** Красная вспышка попадания 0..1 */
  flash: number
}

const phaseOf = (id: string) => {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return (h % 1000) / 1000
}

const teamFacing = (team: Team): 1 | -1 => (team === 'red' ? 1 : -1)

/**
 * Поза юнита в момент проигрывания ph и времени time (секунды, для «дыхания» в покое).
 * positionOf — видимые позиции других юнитов (для направления удара и отдачи).
 */
export function poseOf(
  u: UnitState,
  steps: readonly AnimStep[],
  ph: Playhead,
  time: number,
  flying: boolean,
  positionOf: (id: string) => { x: number; y: number } | undefined,
): Pose {
  const base = visualPosition(u, steps, ph)
  const phase = phaseOf(u.id) * Math.PI * 2
  const breath = Math.sin(time * ((2 * Math.PI) / 2.4) + phase)
  const pose: Pose = {
    x: base.x,
    y: base.y,
    lift: flying ? 0.14 + 0.05 * Math.sin(time * ((2 * Math.PI) / 1.8) + phase) : 0,
    rot: 0,
    sx: 1 - 0.012 * breath,
    sy: 1 + 0.022 * breath,
    facing: teamFacing(u.team),
    opacity: unitOpacity(u, steps, ph),
    flash: 0,
  }
  const step = steps[ph.index]
  if (!step) return pose
  const t = ph.t
  const toward = (id: string) => {
    const p = positionOf(id)
    if (!p) return null
    const dx = p.x - base.x
    const dy = p.y - base.y
    const len = Math.hypot(dx, dy) || 1
    return { dx: dx / len, dy: dy / len }
  }

  switch (step.kind) {
    case 'move': {
      if (step.unitId !== u.id) break
      const k = step.flying ? ease(t) : t
      const p = pointOnPath(step.path, k)
      const a = step.path[p.segment]!
      const b = step.path[Math.min(p.segment + 1, step.path.length - 1)]!
      if (b.x !== a.x) pose.facing = b.x > a.x ? 1 : -1
      if (step.flying) {
        pose.lift += 0.7 * Math.sin(Math.PI * t)
        pose.rot = 0.12 * pose.facing * Math.sin(Math.PI * t)
      } else {
        // Шаг: подскок и покачивание на каждой клетке пути
        pose.lift += 0.14 * Math.abs(Math.sin(Math.PI * p.frac))
        pose.rot = 0.07 * Math.sin(2 * Math.PI * p.frac)
      }
      break
    }
    case 'strike': {
      if (step.sourceId !== u.id) break
      const dir = toward(step.targetId)
      if (!dir) break
      if (dir.dx !== 0) pose.facing = dir.dx > 0 ? 1 : -1
      if (step.ranged) {
        // Выстрел: отдача назад в начале
        const r = t < 0.3 ? Math.sin((Math.PI * t) / 0.3) : 0
        pose.x -= dir.dx * 0.1 * r
        pose.y -= dir.dy * 0.1 * r
        pose.rot = -0.12 * pose.facing * r
      } else {
        // Ближний бой: замах назад, рывок к цели, возврат
        let off: number
        let rot: number
        if (t < 0.35) {
          const k = ease(t / 0.35)
          off = -0.12 * k
          rot = -0.28 * k
        } else if (t < 0.55) {
          const k = ease((t - 0.35) / 0.2)
          off = -0.12 + 0.55 * k
          rot = -0.28 + 0.6 * k
        } else {
          const k = ease((t - 0.55) / 0.45)
          off = 0.43 * (1 - k)
          rot = 0.32 * (1 - k)
        }
        pose.x += dir.dx * off
        pose.y += dir.dy * off
        pose.rot = rot * pose.facing
        pose.lift += Math.max(0, off) * 0.25
      }
      break
    }
    case 'hits': {
      const hit = step.texts.find((x) => x.targetId === u.id)
      if (!hit) break
      if (hit.kind === 'damage') {
        const dir = hit.sourceId ? toward(hit.sourceId) : null
        const knock = 0.16 * Math.sin(Math.PI * Math.min(1, t * 2.2)) * (1 - t)
        if (dir) {
          pose.x -= dir.dx * knock
          pose.y -= dir.dy * knock
        } else pose.x += Math.sin(t * 40) * 0.05 * (1 - t)
        pose.rot = -0.18 * pose.facing * Math.sin(Math.PI * Math.min(1, t * 2))
        pose.flash = Math.max(0, 1 - t * 1.6)
      } else if (hit.kind === 'miss') {
        pose.x += 0.18 * Math.sin(Math.PI * t) * -pose.facing
      } else {
        pose.lift += 0.08 * Math.sin(Math.PI * t)
      }
      break
    }
    case 'death': {
      if (step.unitId !== u.id) break
      // Падение навзничь и исчезновение
      const k = ease(Math.min(1, t / 0.6))
      pose.rot = -1.35 * pose.facing * k
      pose.sy *= 1 - 0.15 * k
      pose.lift = flying ? pose.lift * (1 - k) : 0
      break
    }
    default:
      break
  }
  return pose
}

/** Углы костей рига, радианы (по часовой в системе спрайта, юнит смотрит вправо) */
export type BoneAngles = Partial<Record<Bone, number>>

const deg = Math.PI / 180

/** Фаза удара: замах (0..0.35) → удар (0.35..0.55) → возврат; значение от windup к hit и к 0 */
function strikeCurve(t: number, windup: number, hit: number): number {
  if (t < 0.35) return windup * ease(t / 0.35)
  if (t < 0.55) return windup + (hit - windup) * ease((t - 0.35) / 0.2)
  return hit * (1 - ease((t - 0.55) / 0.45))
}

/**
 * Анимация частей тела: шаг ногами и отмашка руками при ходьбе, галоп, взмахи крыльев,
 * замах и удар оружием по типу атаки, натяжение лука, жест заклинания, вздрагивание от попадания.
 */
export function boneAngles(
  u: UnitState,
  steps: readonly AnimStep[],
  ph: Playhead,
  time: number,
  motion: Motion,
  attack: Attack,
): BoneAngles {
  const phase = phaseOf(u.id) * Math.PI * 2
  const a: BoneAngles = {}
  const add = (b: Bone, v: number) => (a[b] = (a[b] ?? 0) + v)

  // Покой: лёгкое покачивание рук и головы, крылья и хвост дышат
  const idle = Math.sin(time * ((2 * Math.PI) / 2.4) + phase)
  add('armNear', 2.5 * deg * idle)
  add('armFar', -2 * deg * idle)
  add('head', 1.5 * deg * Math.sin(time * ((2 * Math.PI) / 3.1) + phase))
  add('tail', 5 * deg * Math.sin(time * ((2 * Math.PI) / 2.2) + phase))
  if (motion === 'fly') {
    // Зависание: неторопливые взмахи
    const flap = Math.sin(time * ((2 * Math.PI) / 0.9) + phase)
    add('wingNear', 14 * deg * flap)
    add('wingFar', -12 * deg * flap)
  } else {
    add('wingNear', 3 * deg * idle)
    add('wingFar', -3 * deg * idle)
  }

  const step = steps[ph.index]
  if (!step) return a
  const t = ph.t

  switch (step.kind) {
    case 'move': {
      if (step.unitId !== u.id) break
      const p = pointOnPath(step.path, step.flying ? ease(t) : t)
      if (motion === 'walk') {
        // Шаг: ноги ходят вперёд-назад, руки — навстречу
        const s = Math.sin(2 * Math.PI * p.frac)
        add('legNear', -26 * deg * s)
        add('legFar', 26 * deg * s)
        add('armNear', 14 * deg * s)
        add('armFar', -14 * deg * s)
        add('head', 2 * deg * Math.abs(s))
      } else if (motion === 'gallop') {
        // Галоп: передние и задние ноги со сдвигом фазы, голова кивает
        const g = 2 * Math.PI * p.frac
        add('legNear', -30 * deg * Math.sin(g))
        add('legFar', -22 * deg * Math.sin(g + 0.8))
        add('legNear2', 28 * deg * Math.sin(g + 2.4))
        add('legFar2', 22 * deg * Math.sin(g + 3.2))
        add('head', 7 * deg * Math.sin(g + 1))
        add('tail', -10 * deg * Math.sin(g))
        add('armNear', 6 * deg * Math.sin(g))
      } else if (motion === 'fly') {
        // Перелёт: мощные взмахи, лапы поджаты
        const f = Math.sin(t * Math.PI * 2 * 3.5)
        add('wingNear', 38 * deg * f)
        add('wingFar', -32 * deg * f)
        add('legNear', 22 * deg)
        add('legFar', 22 * deg)
        add('tail', 8 * deg * f)
      } else {
        // Парение: руки и полы плаща тянутся назад
        const k = Math.sin(Math.PI * t)
        add('armNear', 14 * deg * k)
        add('armFar', 12 * deg * k)
        add('wingNear', 18 * deg * k)
        add('wingFar', -14 * deg * k)
        add('tail', -10 * deg * k)
        add('legNear', 12 * deg * k)
        add('legFar', 16 * deg * k)
      }
      break
    }
    case 'strike': {
      if (step.sourceId !== u.id) break
      const kind: Attack = step.ranged ? attack : attack === 'bow' ? 'swing' : attack
      switch (kind) {
        case 'swing':
          // Рубящий удар: оружие заносится над головой и обрушивается вниз, шаг ближней ногой
          add('armNear', strikeCurve(t, -75 * deg, 40 * deg))
          add('armFar', strikeCurve(t, 12 * deg, -10 * deg))
          add('legNear', strikeCurve(t, 6 * deg, -18 * deg))
          add('legFar', strikeCurve(t, -4 * deg, 14 * deg))
          add('legNear2', strikeCurve(t, 8 * deg, -8 * deg))
          add('head', strikeCurve(t, -4 * deg, 6 * deg))
          break
        case 'thrust':
          // Выпад: клинок отводится назад и выбрасывается вперёд
          add('armNear', strikeCurve(t, -30 * deg, 14 * deg))
          add('legNear', strikeCurve(t, 6 * deg, -22 * deg))
          add('legFar', strikeCurve(t, -4 * deg, 16 * deg))
          add('wingNear', strikeCurve(t, -14 * deg, 20 * deg))
          add('wingFar', strikeCurve(t, 10 * deg, -16 * deg))
          break
        case 'claw':
          // Когти: ближняя рука заносится и рвёт сверху вниз, дальняя — следом
          add('armNear', strikeCurve(t, -60 * deg, 45 * deg))
          add('armFar', strikeCurve(Math.max(0, t - 0.08), -45 * deg, 35 * deg))
          add('legNear', strikeCurve(t, 4 * deg, -14 * deg))
          add('head', strikeCurve(t, -6 * deg, 8 * deg))
          break
        case 'bite':
          // Укус: голова отводится назад и бросается вниз-вперёд, крылья раскрываются
          add('head', strikeCurve(t, -22 * deg, 26 * deg))
          add('wingNear', strikeCurve(t, -28 * deg, 18 * deg))
          add('wingFar', strikeCurve(t, 24 * deg, -14 * deg))
          add('tail', strikeCurve(t, 14 * deg, -16 * deg))
          add('legNear', strikeCurve(t, -10 * deg, 12 * deg))
          break
        case 'bow': {
          // Лук: тетива натягивается к уху, отпускание — рука отлетает назад
          const draw = t < 0.3 ? ease(t / 0.3) : 0
          const release = t >= 0.3 ? Math.sin(Math.PI * Math.min(1, (t - 0.3) / 0.4)) : 0
          add('armNear', -14 * deg * draw + 20 * deg * release)
          add('armFar', -4 * deg * draw)
          add('head', -3 * deg * draw)
          break
        }
        case 'cast': {
          // Заклинание: рука вскидывается и выбрасывает силу вперёд, голова откидывается
          add('armNear', strikeCurve(t, -55 * deg, 12 * deg))
          add('armFar', strikeCurve(t, -12 * deg, 6 * deg))
          add('head', strikeCurve(t, -8 * deg, 5 * deg))
          add('tail', strikeCurve(t, -14 * deg, 10 * deg))
          break
        }
      }
      break
    }
    case 'hits': {
      const hit = step.texts.find((x) => x.targetId === u.id)
      if (!hit || hit.kind !== 'damage') break
      // Попадание: голова откидывается, руки вздрагивают
      const k = Math.sin(Math.PI * Math.min(1, t * 2)) * (1 - t * 0.5)
      add('head', -12 * deg * k)
      add('armNear', -20 * deg * k)
      add('armFar', -16 * deg * k)
      add('wingNear', -20 * deg * k)
      add('wingFar', 16 * deg * k)
      add('legNear', 8 * deg * k)
      break
    }
    case 'death': {
      if (step.unitId !== u.id) break
      // Гибель: конечности обмякают
      const k = ease(Math.min(1, t / 0.6))
      add('armNear', 35 * deg * k)
      add('armFar', 25 * deg * k)
      add('head', 18 * deg * k)
      add('legNear', -14 * deg * k)
      add('wingNear', 40 * deg * k)
      add('wingFar', -30 * deg * k)
      break
    }
    default:
      break
  }
  return a
}
