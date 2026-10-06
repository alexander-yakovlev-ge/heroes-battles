/**
 * Общие элементы стиля некромантов: палитра и «детали» (кости, черепа, ткань),
 * из которых собираются спрайты. Координаты — в системе viewBox 0 0 100 100, юнит смотрит вправо.
 */

export const C = {
  ink: '#1a1622',
  bone: '#e6e0cf',
  boneShade: '#b8ae94',
  boneDark: '#8a8068',
  glow: '#7cf2c4',
  glowSoft: '#b9fbe3',
  purple: '#5b4b7a',
  purpleDark: '#3a2f52',
  purpleLight: '#8a77b0',
  rot: '#7d9468',
  rotDark: '#4f6143',
  rotLight: '#a3b78c',
  flesh: '#b49aa0',
  fleshDark: '#7d6670',
  rust: '#8a5a3a',
  wood: '#6b4a2e',
  woodDark: '#43301f',
  metal: '#8f97a6',
  metalDark: '#4c5260',
  metalLight: '#c4cad4',
  cloth: '#3e3552',
  clothDark: '#271f36',
  bandage: '#cfc3a3',
  bandageShade: '#9e9276',
  blood: '#7a1f2b',
  bloodLight: '#b2343f',
  ghost: '#bff7e6',
} as const

const n = (v: number) => Math.round(v * 10) / 10

export const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`

/** Тень под юнитом */
export const shadow = (cx = 50, rx = 22, cy = 95) =>
  `<ellipse cx="${n(cx)}" cy="${cy}" rx="${n(rx)}" ry="${n(rx * 0.16)}" fill="#000" opacity="0.3"/>`

type Pt = readonly [number, number]
const pts = (p: readonly Pt[]) => p.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')

/** Кость: светлая линия с тёмным контуром и утолщениями-суставами на концах */
export function bone(p: readonly Pt[], w = 3.6, color: string = C.bone): string {
  const ends = [p[0]!, p[p.length - 1]!]
  return (
    `<polyline points="${pts(p)}" fill="none" stroke="${C.ink}" stroke-width="${n(w + 2.4)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    ends.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(w * 0.75 + 1.2)}" fill="${C.ink}"/>`).join('') +
    `<polyline points="${pts(p)}" fill="none" stroke="${color}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    ends.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(w * 0.75)}" fill="${color}"/>`).join('')
  )
}

/** Линия с контуром (ремни, древки, щупальца) */
export function stroke(p: readonly Pt[], w: number, color: string, outline = 2.2): string {
  return (
    `<polyline points="${pts(p)}" fill="none" stroke="${C.ink}" stroke-width="${n(w + outline)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<polyline points="${pts(p)}" fill="none" stroke="${color}" stroke-width="${n(w)}" stroke-linecap="round" stroke-linejoin="round"/>`
  )
}

/** Залитая фигура с контуром */
export const shape = (d: string, fill: string, sw = 1.6, extra = '') =>
  `<path d="${d}" fill="${fill}" stroke="${C.ink}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${extra}/>`

/** Фигура без контура (блики, тени) */
export const tint = (d: string, fill: string, opacity = 1) =>
  `<path d="${d}" fill="${fill}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`

/** Светящийся глаз: мягкий ореол и яркая точка */
export const eye = (x: number, y: number, r = 1.4, color: string = C.glow) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 2.4)}" fill="${color}" opacity="0.28"/><circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${C.glowSoft}"/>`

/**
 * Череп в профиль 3/4, смотрит вправо. (cx, cy) — центр черепной коробки, r — её радиус.
 * jaw — нижняя челюсть (у мумий и личей в капюшоне можно убрать).
 */
export function skull(cx: number, cy: number, r: number, opts: { jaw?: boolean; eyeColor?: string; color?: string } = {}): string {
  const { jaw = true, eyeColor = C.glow, color = C.bone } = opts
  const k = r / 10
  const P = (x: number, y: number) => `${n(cx + x * k)},${n(cy + y * k)}`
  const cranium = `M${P(-9, 2)} C${P(-11, -9)} ${P(-3, -13)} ${P(3, -11)} C${P(9, -9)} ${P(12, -3)} ${P(11, 3)} L${P(12, 7)} L${P(9, 9)} L${P(2, 10)} C${P(-3, 10)} ${P(-8, 7)} ${P(-9, 2)} Z`
  const jawPath = `M${P(0, 9)} L${P(10, 9)} L${P(11, 13)} C${P(8, 15)} ${P(3, 15)} ${P(-1, 13)} Z`
  return (
    (jaw ? shape(jawPath, color) : '') +
    shape(cranium, color) +
    tint(`M${P(-8, 3)} C${P(-9, -4)} ${P(-5, -9)} ${P(-1, -10)} C${P(-6, -6)} ${P(-6, 0)} ${P(-3, 7)} C${P(-6, 7)} ${P(-8, 5)} ${P(-8, 3)} Z`, C.boneShade, 0.7) +
    `<ellipse cx="${n(cx + 5 * k)}" cy="${n(cy + 1 * k)}" rx="${n(3 * k)}" ry="${n(3.4 * k)}" fill="${C.ink}"/>` +
    `<path d="M${P(10, 4)} L${P(11.5, 7)} L${P(9.5, 7)} Z" fill="${C.ink}"/>` +
    (jaw ? `<path d="M${P(3, 9.6)} L${P(3, 12)} M${P(6, 9.6)} L${P(6, 12)} M${P(9, 9.6)} L${P(9, 12)}" stroke="${C.ink}" stroke-width="${n(0.8 * k)}"/>` : '') +
    eye(cx + 5.3 * k, cy + 1 * k, 1.3 * k, eyeColor)
  )
}

/** Грудная клетка: позвоночник и рёбра, обращённые вперёд (вправо) */
export function ribcage(x: number, top: number, bottom: number, w = 9): string {
  const ribs: string[] = []
  const count = 4
  for (let i = 0; i < count; i++) {
    const y = top + 3 + ((bottom - top - 6) * i) / (count - 1)
    const len = w * (1 - i * 0.12)
    ribs.push(`M${n(x)},${n(y)} C${n(x + len * 0.5)},${n(y - 3)} ${n(x + len)},${n(y - 1)} ${n(x + len * 0.9)},${n(y + 3)}`)
  }
  const d = ribs.join(' ')
  return (
    bone([[x, top], [x - 1, bottom]], 3.2) +
    `<path d="${d}" fill="none" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="${d}" fill="none" stroke="${C.bone}" stroke-width="2" stroke-linecap="round"/>`
  )
}

/** Таз */
export const pelvis = (x: number, y: number) =>
  shape(`M${n(x - 6)},${n(y - 2)} C${n(x - 4)},${n(y - 5)} ${n(x + 4)},${n(y - 5)} ${n(x + 6)},${n(y - 2)} L${n(x + 4)},${n(y + 3)} L${n(x)},${n(y + 1)} L${n(x - 4)},${n(y + 3)} Z`, C.bone)

/** Стопа скелета */
export const foot = (x: number, y: number, len = 6) =>
  shape(`M${n(x - 1.5)},${n(y - 2)} L${n(x + len)},${n(y - 0.5)} L${n(x + len)},${n(y + 1.2)} L${n(x - 2)},${n(y + 1.2)} Z`, C.bone, 1.4)

/** Ржавый клинок: от рукояти (hx, hy) в направлении угла angle (градусы, 0 — вправо, -90 — вверх) */
export function blade(hx: number, hy: number, angle: number, len: number, w = 3.2, color: string = C.metal): string {
  const a = (angle * Math.PI) / 180
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const px = -dy
  const py = dx
  const tip = [hx + dx * len, hy + dy * len] as const
  const b1 = [hx + px * w * 0.5, hy + py * w * 0.5] as const
  const b2 = [hx - px * w * 0.5, hy - py * w * 0.5] as const
  const s1 = [tip[0] - dx * 4 + px * w * 0.5, tip[1] - dy * 4 + py * w * 0.5] as const
  const s2 = [tip[0] - dx * 4 - px * w * 0.5, tip[1] - dy * 4 - py * w * 0.5] as const
  const guard = [
    [hx + px * 4.5, hy + py * 4.5],
    [hx - px * 4.5, hy - py * 4.5],
  ] as const
  const grip = [hx - dx * 4, hy - dy * 4] as const
  return (
    stroke([[hx, hy], grip], 2.2, C.woodDark, 1.6) +
    shape(`M${pts([b1, s1, tip, s2, b2])} Z`, color, 1.4) +
    `<line x1="${n(hx)}" y1="${n(hy)}" x2="${n(tip[0] - dx * 3)}" y2="${n(tip[1] - dy * 3)}" stroke="${C.metalLight}" stroke-width="0.8" opacity="0.8"/>` +
    stroke([guard[0], guard[1]], 1.8, C.metalDark, 1.4)
  )
}
