/**
 * Наклонное поле (псевдо-3D): клетки сетки проецируются в перспективе — дальние ряды уже и ниже,
 * ближние шире. Координаты поля — в клетках (x вправо, v вглубь сверху вниз: v = 0 — дальний край).
 * Логика боя остаётся на квадратной сетке; проекция — только отрисовка и разбор нажатий.
 */

/** Масштаб дальнего ряда относительно ближнего */
export const BACK_SCALE = 0.8
/** Наклон: высота ряда относительно его ширины */
export const TILT = 0.78
/** Запас сверху под спрайты дальнего ряда и летающих — в ширинах клетки */
export const HEADROOM = 1.0
/** Спрайт крупнее клетки — юниты «встают» над полем */
export const SPRITE_K = 1.4

export interface Point {
  x: number
  y: number
}

export interface Projection {
  cols: number
  rows: number
  /** Ширина клетки ближнего ряда, px */
  cell: number
  width: number
  height: number
  /** Масштаб на глубине v */
  scale: (v: number) => number
  /** Точка поля (x, v) → экран; lift — высота над землёй в клетках */
  project: (x: number, v: number, lift?: number) => Point
  /** Экран → точка поля; null — мимо поля */
  unproject: (sx: number, sy: number) => { x: number; v: number } | null
  /** Четырёхугольник области поля [x0, x1] × [v0, v1] — SVG-путь для Skia */
  quad: (x0: number, v0: number, x1: number, v1: number) => string
}

/** Высота полосы рядов при ширине клетки 1 */
const rowsHeight = (rows: number) => TILT * rows * ((1 + BACK_SCALE) / 2)

/** Ширина клетки, при которой поле помещается в availW × availH */
export function fitCell(cols: number, rows: number, availW: number, availH: number): number {
  return Math.max(20, Math.floor(Math.min(availW / cols, availH / (HEADROOM + rowsHeight(rows)))))
}

export function makeProjection(cols: number, rows: number, cell: number): Projection {
  const width = cols * cell
  const top = HEADROOM * cell
  const height = top + rowsHeight(rows) * cell
  const scale = (v: number) => BACK_SCALE + (1 - BACK_SCALE) * (v / rows)
  // Y(v) = top + cell·TILT·∫scale — ряды ближе к зрителю выше
  const a = (cell * TILT * (1 - BACK_SCALE)) / (2 * rows)
  const b = cell * TILT * BACK_SCALE
  const yOf = (v: number) => top + b * v + a * v * v

  const project = (x: number, v: number, lift = 0): Point => {
    const s = scale(v)
    return { x: width / 2 + (x - cols / 2) * cell * s, y: yOf(v) - lift * cell * s }
  }

  const unproject = (sx: number, sy: number) => {
    const c = top - sy
    const disc = b * b - 4 * a * c
    if (disc < 0) return null
    const v = (-b + Math.sqrt(disc)) / (2 * a)
    if (v < 0 || v >= rows) return null
    const x = (sx - width / 2) / (cell * scale(v)) + cols / 2
    if (x < 0 || x >= cols) return null
    return { x, v }
  }

  const quad = (x0: number, v0: number, x1: number, v1: number) => {
    const p = [project(x0, v0), project(x1, v0), project(x1, v1), project(x0, v1)]
    return `M${p.map((q) => `${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' L')} Z`
  }

  return { cols, rows, cell, width, height, scale, project, unproject, quad }
}
