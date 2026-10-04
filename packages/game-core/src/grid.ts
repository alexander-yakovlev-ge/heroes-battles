import { DEPLOY_COLUMNS, MODE_CONFIG, OBSTACLE_RATIO_MAX, OBSTACLE_RATIO_MIN } from './constants.js'
import type { Rng } from './rng.js'
import type { Cell, Grid, Mode } from './types.js'

export const key = (x: number, y: number) => y * 1000 + x

export interface Rect {
  x: number
  y: number
  size: number
}

export const DIRS: readonly [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
]

export function rectCells(r: Rect): Cell[] {
  const cells: Cell[] = []
  for (let dy = 0; dy < r.size; dy++) for (let dx = 0; dx < r.size; dx++) cells.push({ x: r.x + dx, y: r.y + dy })
  return cells
}

/** Расстояние Чебышёва между прямоугольниками (0 — пересекаются, 1 — соседние) */
export function rectDistance(a: Rect, b: Rect): number {
  const dx = Math.max(0, b.x - (a.x + a.size - 1), a.x - (b.x + b.size - 1))
  const dy = Math.max(0, b.y - (a.y + a.size - 1), a.y - (b.y + b.size - 1))
  return Math.max(dx, dy)
}

export const rectsAdjacent = (a: Rect, b: Rect) => rectDistance(a, b) === 1

export function inBounds(grid: Pick<Grid, 'width' | 'height'>, r: Rect): boolean {
  return r.x >= 0 && r.y >= 0 && r.x + r.size <= grid.width && r.y + r.size <= grid.height
}

export function obstacleSet(grid: Grid): Set<number> {
  return new Set(grid.obstacles.map(([x, y]) => key(x, y)))
}

/** Свободен ли прямоугольник от препятствий и занятых клеток */
export function rectFree(grid: Grid, blocked: Set<number>, r: Rect): boolean {
  if (!inBounds(grid, r)) return false
  for (const c of rectCells(r)) if (blocked.has(key(c.x, c.y))) return false
  return true
}

/**
 * BFS по позициям прямоугольника size×size, 8 направлений, шаг = 1.
 * Возвращает карту key(позиции) → расстояние для всех позиций в пределах maxSteps.
 */
export function reachable(
  grid: Grid,
  blocked: Set<number>,
  start: Rect,
  maxSteps: number,
): Map<number, number> {
  const dist = new Map<number, number>([[key(start.x, start.y), 0]])
  let frontier: Cell[] = [{ x: start.x, y: start.y }]
  for (let step = 1; step <= maxSteps && frontier.length > 0; step++) {
    const next: Cell[] = []
    for (const c of frontier) {
      for (const [dx, dy] of DIRS) {
        const nx = c.x + dx
        const ny = c.y + dy
        const k = key(nx, ny)
        if (dist.has(k)) continue
        if (!rectFree(grid, blocked, { x: nx, y: ny, size: start.size })) continue
        dist.set(k, step)
        next.push({ x: nx, y: ny })
      }
    }
    frontier = next
  }
  return dist
}

function connected(grid: Grid, size: number): boolean {
  const blocked = obstacleSet(grid)
  const starts: Rect[] = []
  for (let y = 0; y + size <= grid.height; y++) {
    const r = { x: 0, y, size }
    if (rectFree(grid, blocked, r)) starts.push(r)
  }
  const first = starts[0]
  if (!first) return false
  const dist = reachable(grid, blocked, first, Infinity)
  // Все позиции обеих зон расстановки должны быть в одной компоненте связности
  for (let y = 0; y + size <= grid.height; y++) {
    for (const x of [0, grid.width - size]) {
      if (rectFree(grid, blocked, { x, y, size }) && !dist.has(key(x, y))) return false
    }
  }
  return true
}

/**
 * Генерация поля (§5.1): препятствия 10–15% вне зон расстановки, зеркальная симметрия
 * по вертикальной оси, проверка связности для юнитов 1×1 и 2×2.
 */
export function generateGrid(mode: Mode, rng: Rng): Grid {
  const { width, height } = MODE_CONFIG[mode]
  const half = width / 2
  for (let attempt = 0; attempt < 200; attempt++) {
    const total = width * height
    const target = Math.round(total * (OBSTACLE_RATIO_MIN + rng.next() * (OBSTACLE_RATIO_MAX - OBSTACLE_RATIO_MIN)))
    const pairs = Math.floor(target / 2)
    const candidates: Cell[] = []
    for (let y = 0; y < height; y++) for (let x = DEPLOY_COLUMNS; x < half; x++) candidates.push({ x, y })
    const chosen = new Set<number>()
    const obstacles: [number, number][] = []
    while (obstacles.length < pairs * 2 && chosen.size < candidates.length) {
      const c = rng.pick(candidates)
      const k = key(c.x, c.y)
      if (chosen.has(k)) continue
      chosen.add(k)
      obstacles.push([c.x, c.y], [width - 1 - c.x, c.y])
    }
    const grid: Grid = { width, height, obstacles }
    if (connected(grid, 1) && connected(grid, 2)) return grid
  }
  // Практически недостижимо; поле без препятствий всегда корректно
  return { width, height, obstacles: [] }
}
