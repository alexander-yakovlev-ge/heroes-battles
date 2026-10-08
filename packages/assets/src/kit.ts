/**
 * Набор деталей для спрайтов некромантов: палитра, светотень и анатомические элементы
 * (кости, черепа, ткань, металл). Координаты — в системе viewBox 0 0 100 100, юнит смотрит вправо.
 *
 * Стиль — полуреалистичная живопись: объём задаётся градиентами (основной свет слева сверху,
 * холодная тень с рефлексом у края), по теневому краю — холодный контровой свет, поверх —
 * фактура материала (узор-<pattern>: поры кости, пятна кожи, плетение ткани, царапины металла).
 * Контур тонкий и тёплый, мелкие детали (трещины, складки, швы) — полупрозрачными штрихами.
 * Фильтры не используются: их по-разному поддерживают Skia, браузер и react-native-svg.
 */

import type { Attack, Bone, Motion } from './types.js'

export type { Bone }
export type Pt = readonly [number, number]

/** Описание рига: как двигается, чем бьёт, где шарниры костей */
export interface RigMeta {
  motion: Motion
  attack: Attack
  pivots: Partial<Record<Bone, Pt>>
}

/** Спрайт с ригом до расчёта границ слоёв */
export interface RigSource extends RigMeta {
  svg: string
  layers: readonly { bone: Bone; svg: string }[]
}
/** Точка оси конечности с толщиной в этой точке */
export type Wp = readonly [number, number, number]

/** Фактура материала поверх светотени */
export type Tex = 'bone' | 'skin' | 'cloth' | 'metal' | 'wood' | 'leather' | 'scale' | 'bandage'

/** Тон материала: блик, основной цвет, тень и фактура */
export interface Tone {
  hi: string
  base: string
  lo: string
  tex?: Tex
}

export const INK = '#1c1714'

export const C = {
  ink: INK,
  glow: '#7cf2c4',
  glowSoft: '#d4fff0',
  glowDeep: '#1f8f6e',
  bone: '#d9cfb6',
  boneDark: '#6e6450',
  gold: '#c9a24a',
  goldHi: '#f3dc8a',
  goldLo: '#7a5a1e',
  blood: '#6e1622',
  bloodLight: '#a8293a',
  venom: '#9be86a',
} as const

export const T = {
  bone: { hi: '#f7f2e3', base: '#d6ccb2', lo: '#857a60', tex: 'bone' },
  boneOld: { hi: '#e6dcc2', base: '#bdb193', lo: '#6f644c', tex: 'bone' },
  boneFar: { hi: '#c9bfa6', base: '#a39880', lo: '#5e5544', tex: 'bone' },
  metal: { hi: '#e3e8ef', base: '#8d95a3', lo: '#3a3f4a', tex: 'metal' },
  rust: { hi: '#c49a72', base: '#8a5a3a', lo: '#4a2c1a', tex: 'metal' },
  iron: { hi: '#7d8597', base: '#3f4452', lo: '#16181f', tex: 'metal' },
  wood: { hi: '#a37a52', base: '#6b4a2e', lo: '#2e1f12', tex: 'wood' },
  leather: { hi: '#8e6a4a', base: '#5a3e28', lo: '#24170e', tex: 'leather' },
  gold: { hi: '#f6e3a0', base: '#c9a24a', lo: '#6e4f18', tex: 'metal' },
  cloth: { hi: '#6e6188', base: '#3e3552', lo: '#15111e', tex: 'cloth' },
  robe: { hi: '#8e7cb3', base: '#55457a', lo: '#1e1830', tex: 'cloth' },
  rot: { hi: '#b3c49a', base: '#7d9468', lo: '#33402a', tex: 'skin' },
  flesh: { hi: '#d9c4c4', base: '#a58b92', lo: '#4e3a44', tex: 'skin' },
  pale: { hi: '#f4f1f6', base: '#cfc7d6', lo: '#6e6478', tex: 'skin' },
  bandage: { hi: '#efe6cc', base: '#cdbf9c', lo: '#6e6248', tex: 'bandage' },
  blood: { hi: '#c23a4a', base: '#7a1f2b', lo: '#2a070c' },
  ghost: { hi: '#f0fffa', base: '#a8efda', lo: '#2f7f70' },
} as const satisfies Record<string, Tone>

const n = (v: number) => Math.round(v * 100) / 100
const P = (p: Pt) => `${n(p[0])},${n(p[1])}`

/** Смешение цветов #rrggbb: k = 0 — a, 1 — b */
export function mix(a: string, b: string, k: number): string {
  const ch = (c: string, i: number) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16)
  return `#${[0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k).toString(16).padStart(2, '0')).join('')}`
}

/** Холодный окружающий свет в тенях (сумерки некрополя) */
const AMBIENT = '#140c24'
/** Контровой свет — холодный, лунный: подмешивается в рефлекс на теневом краю */
const RIM = '#d2ecff'

/** Детерминированный генератор случайных чисел: фактура одинакова при каждой сборке */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Узоры фактур: размер плитки и содержимое (в единицах спрайта) */
function texture(kind: Tex): { w: number; h: number; rot: number; body: string } {
  const r = rng(kind.length * 977 + kind.charCodeAt(0))
  // фактура должна читаться на спрайте ~130 px: плотнее и крупнее, чем «честный» масштаб
  const K = 1.6
  const op = (v: number) => n(Math.min(1, v * K))
  const dot = (x: number, y: number, rad: number, color: string, o: number) => `<circle cx="${n(x)}" cy="${n(y)}" r="${n(rad * 1.2)}" fill="${color}" opacity="${op(o)}"/>`
  const ln = (d: string, color: string, w: number, o: number) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(w * 1.3)}" stroke-linecap="round" opacity="${op(o)}"/>`
  let body = ''
  switch (kind) {
    case 'bone': {
      for (let i = 0; i < 9; i++) body += dot(r() * 8, r() * 8, 0.1 + r() * 0.16, '#3a2a14', 0.4)
      for (let i = 0; i < 4; i++) body += dot(r() * 8, r() * 8, 0.12 + r() * 0.1, '#ffffff', 0.35)
      for (let i = 0; i < 2; i++) {
        const x = r() * 8
        const y = r() * 8
        body += ln(`M${n(x)},${n(y)} l${n(0.6 + r())},${n(r() * 0.8 - 0.4)} l${n(0.4 + r() * 0.6)},${n(r() * 0.8)}`, '#3a2a14', 0.12, 0.45)
      }
      return { w: 8, h: 8, rot: 20, body }
    }
    case 'skin': {
      for (let i = 0; i < 5; i++) body += `<ellipse cx="${n(r() * 10)}" cy="${n(r() * 10)}" rx="${n(0.7 + r() * 1.2)}" ry="${n(0.5 + r() * 0.9)}" fill="#3a1028" opacity="0.2"/>`
      for (let i = 0; i < 12; i++) body += dot(r() * 10, r() * 10, 0.08 + r() * 0.08, '#2a1018', 0.35)
      for (let i = 0; i < 5; i++) body += dot(r() * 10, r() * 10, 0.1 + r() * 0.1, '#ffffff', 0.25)
      for (let i = 0; i < 2; i++) {
        const x = r() * 10
        const y = r() * 10
        body += ln(`M${n(x)},${n(y)} q${n(0.6)},${n(0.6)} ${n(1.2 + r())},${n(r() * 0.8)}`, '#5a1830', 0.1, 0.2)
      }
      return { w: 10, h: 10, rot: 0, body }
    }
    case 'cloth': {
      // грубая холстина: неровные волокна и узелки, без регулярной сетки
      for (let i = 0; i < 14; i++) {
        const x = r() * 6
        const y = r() * 6
        const len = 0.5 + r() * 1.3
        const vert = r() < 0.4
        body += ln(`M${n(x)},${n(y)} l${n(vert ? r() * 0.3 : len)},${n(vert ? len : r() * 0.3 - 0.15)}`, i % 3 ? '#000000' : '#ffffff', 0.1, i % 3 ? 0.16 : 0.08)
      }
      for (let i = 0; i < 4; i++) body += dot(r() * 6, r() * 6, 0.1, '#000000', 0.15)
      return { w: 6, h: 6, rot: 0, body }
    }
    case 'bandage':
      body = ln('M0,0.6 H2.4 M0,1.8 H2.4', '#3a2a10', 0.2, 0.2) + ln('M0.6,0 V2.4 M1.8,0 V2.4', '#ffffff', 0.14, 0.18)
      return { w: 2.4, h: 2.4, rot: 30, body }
    case 'metal': {
      for (let i = 0; i < 10; i++) {
        const x = r() * 12
        const y = r() * 6
        body += ln(`M${n(x)},${n(y)} l${n(1 + r() * 3)},${n(r() * 0.3 - 0.15)}`, i % 2 ? '#ffffff' : '#000000', 0.09, 0.3)
      }
      for (let i = 0; i < 3; i++) body += dot(r() * 12, r() * 6, 0.1 + r() * 0.1, '#000000', 0.35)
      return { w: 12, h: 6, rot: -25, body }
    }
    case 'wood': {
      for (let i = 0; i < 5; i++) {
        const y = 0.5 + i * 0.9 + r() * 0.3
        body += ln(`M0,${n(y)} C3,${n(y - 0.4)} 6,${n(y + 0.5)} 9,${n(y)} S14,${n(y + 0.3)} 14,${n(y)}`, '#1a0e04', 0.16, 0.4)
      }
      body += `<ellipse cx="${n(4 + r() * 6)}" cy="2.4" rx="0.9" ry="0.4" fill="none" stroke="#1a0e04" stroke-width="0.18" opacity="0.6"/>`
      return { w: 14, h: 5, rot: 90, body }
    }
    case 'leather': {
      for (let i = 0; i < 6; i++) {
        const x = r() * 6
        const y = r() * 6
        body += ln(`M${n(x)},${n(y)} q0.5,${n(-0.4 + r() * 0.8)} ${n(0.9 + r() * 0.6)},0`, '#000000', 0.12, 0.35)
      }
      for (let i = 0; i < 4; i++) body += dot(r() * 6, r() * 6, 0.12, '#ffffff', 0.15)
      return { w: 6, h: 6, rot: 10, body }
    }
    case 'scale':
      body =
        ln('M0,1.2 a0.75,0.75 0 0,0 1.5,0 a0.75,0.75 0 0,0 1.5,0 M-0.75,2.4 a0.75,0.75 0 0,0 1.5,0 a0.75,0.75 0 0,0 1.5,0 a0.75,0.75 0 0,0 1.5,0', '#000000', 0.18, 0.35) +
        ln('M0.2,1.6 a0.6,0.6 0 0,0 1.1,0 M1.7,1.6 a0.6,0.6 0 0,0 1.1,0', '#ffffff', 0.1, 0.15)
      return { w: 3, h: 2.4, rot: -20, body }
  }
}

/** Габарит пути по числам в d (для решения, насколько крупная фигура) */
function extent(d: string): number {
  const v = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)
  if (v.length < 4 || /[a-z]/.test(d.replace(/e/g, ''))) return 10
  let x0 = Infinity
  let x1 = -Infinity
  let y0 = Infinity
  let y1 = -Infinity
  for (let i = 0; i + 1 < v.length; i += 2) {
    x0 = Math.min(x0, v[i]!)
    x1 = Math.max(x1, v[i]!)
    y0 = Math.min(y0, v[i + 1]!)
    y1 = Math.max(y1, v[i + 1]!)
  }
  return Math.min(x1 - x0, y1 - y0)
}

/**
 * Холст спрайта: копит градиенты в <defs>. id градиентов начинаются с префикса юнита —
 * иконки разных юнитов рисуются в одном документе (web), их градиенты не должны пересекаться.
 */
export class Art {
  private readonly defs = new Map<string, string>()
  constructor(private readonly prefix: string) {}

  private def(key: string, make: (id: string) => string): string {
    const id = `${this.prefix}-${key}`
    if (!this.defs.has(key)) this.defs.set(key, make(id))
    return `url(#${id})`
  }

  private static stops(s: readonly (readonly [number, string, number?])[]): string {
    return s
      .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined || a === 1 ? '' : ` stop-opacity="${a}"`}/>`)
      .join('')
  }

  /**
   * Сферическая светотень по габариту фигуры: блик слева сверху, полутон, холодная собственная тень
   * и у самого края теневой стороны — рефлекс с холодным контровым светом, отделяющий силуэт от фона.
   */
  sph(t: Tone): string {
    const core = mix(t.lo, AMBIENT, 0.4)
    const reflect = mix(mix(t.lo, t.base, 0.4), RIM, 0.25)
    return this.def(`s${t.base.slice(1)}${t.lo.slice(1)}`, (id) =>
      `<radialGradient id="${id}" cx="0.36" cy="0.3" r="0.8" fx="0.28" fy="0.22">${Art.stops([[0, mix(t.hi, '#ffffff', 0.4)], [0.12, t.hi], [0.4, t.base], [0.66, mix(t.base, t.lo, 0.55)], [0.86, core], [1, reflect]])}</radialGradient>`,
    )
  }

  /**
   * Граница света и тени: поверх сферической светотени — довольно резкий переход в собственную тень
   * (терминатор) и чуть светлее у самого края (рефлекс). Даёт «лепную» форму вместо размытого объёма.
   */
  form(): string {
    return this.def('form', (id) =>
      `<linearGradient id="${id}" x1="0.12" y1="0.05" x2="0.95" y2="0.92">${Art.stops([[0, '#0c0816', 0], [0.5, '#0c0816', 0], [0.6, '#0c0816', 0.34], [0.84, '#0c0816', 0.3], [1, '#0c0816', 0.12]])}</linearGradient>`,
    )
  }

  /** Крупная неоднородность цвета материала: тёплые, холодные и тёмные пятна размером с ладонь */
  mottle(): string {
    const warm = this.halo('#d08a52', 0.9)
    const cool = this.halo('#5a74c8', 0.9)
    const dark = this.halo('#1a0c14', 0.9)
    return this.def('mottle', (id) => {
      const r = rng(4242)
      let body = ''
      for (let i = 0; i < 9; i++) {
        const paint = i % 3 === 0 ? warm : i % 3 === 1 ? cool : dark
        body += `<ellipse cx="${n(r() * 26)}" cy="${n(r() * 26)}" rx="${n(3 + r() * 4)}" ry="${n(2.4 + r() * 3)}" fill="${paint}" opacity="0.16"/>`
      }
      return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="26" height="26" patternTransform="rotate(17)">${body}</pattern>`
    })
  }

  /** Фактура материала: узор, которым поверх светотени заливается та же фигура */
  tex(kind: Tex): string {
    return this.def(`t${kind}`, (id) => {
      const { w, h, rot, body } = texture(kind)
      return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}"${rot ? ` patternTransform="rotate(${rot})"` : ''}>${body}</pattern>`
    })
  }

  /** Цилиндр/складка: линейная светотень по габариту под углом (0 — свет слева, 90 — сверху) */
  cyl(t: Tone, angle = 30): string {
    const a = (angle * Math.PI) / 180
    const dx = Math.cos(a) / 2
    const dy = Math.sin(a) / 2
    return this.def(`c${angle}${t.base.slice(1)}${t.lo.slice(1)}`, (id) =>
      `<linearGradient id="${id}" x1="${n(0.5 - dx)}" y1="${n(0.5 - dy)}" x2="${n(0.5 + dx)}" y2="${n(0.5 + dy)}">${Art.stops([[0, t.hi], [0.35, t.base], [0.75, t.base], [1, t.lo]])}</linearGradient>`,
    )
  }

  /** Мягкое свечение: цвет в центре, прозрачность к краю */
  halo(color: string, strength = 0.75): string {
    return this.def(`h${color.slice(1)}${Math.round(strength * 100)}`, (id) =>
      `<radialGradient id="${id}">${Art.stops([[0, color, strength], [0.35, color, strength * 0.45], [1, color, 0]])}</radialGradient>`,
    )
  }

  /** Линейный градиент в координатах спрайта */
  lin(key: string, a: Pt, b: Pt, stops: readonly (readonly [number, string, number?])[]): string {
    return this.def(key, (id) =>
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(a[0])}" y1="${n(a[1])}" x2="${n(b[0])}" y2="${n(b[1])}">${Art.stops(stops)}</linearGradient>`,
    )
  }

  /** Радиальный градиент в координатах спрайта */
  rad(key: string, c: Pt, r: number, stops: readonly (readonly [number, string, number?])[]): string {
    return this.def(key, (id) =>
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(c[0])}" cy="${n(c[1])}" r="${n(r)}">${Art.stops(stops)}</radialGradient>`,
    )
  }

  svg(body: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${[...this.defs.values()].join('')}</defs>${body}</svg>`
  }

  /** SVG одного слоя: только градиенты и узоры, на которые он ссылается */
  private layerSvg(body: string): string {
    // узоры ссылаются на градиенты — собираем ссылки транзитивно
    const refs = (text: string) => [...text.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]!)
    const used = new Set(refs(body))
    for (let grew = true; grew; ) {
      grew = false
      for (const [key, d] of this.defs) if (used.has(`${this.prefix}-${key}`)) for (const r of refs(d)) if (!used.has(r)) (used.add(r), (grew = true))
    }
    const defs = [...this.defs.entries()].filter(([key]) => used.has(`${this.prefix}-${key}`)).map(([, d]) => d)
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs>${defs.join('')}</defs>${body}</svg>`
  }

  /**
   * Спрайт с ригом: слои в порядке отрисовки, каждый на своей кости. Полный SVG (иконки, превью) —
   * все слои подряд; для анимации на поле каждый слой растрируется отдельно и поворачивается
   * вокруг шарнира кости. Соседние слои одной кости сливаются.
   */
  rig(meta: RigMeta, layers: readonly (readonly [Bone, string])[]): RigSource {
    const merged: [Bone, string][] = []
    for (const [bone, body] of layers) {
      const last = merged[merged.length - 1]
      if (last && last[0] === bone) last[1] += body
      else merged.push([bone, body])
    }
    return {
      ...meta,
      svg: this.svg(merged.map(([, b]) => b).join('')),
      layers: merged.map(([bone, body]) => ({ bone, svg: this.layerSvg(body) })),
    }
  }
}

// ——— геометрия ———

/** Гладкая кривая через точки (Catmull-Rom → кубические Безье) */
export function smooth(p: readonly Pt[], closed = false, tension = 1): string {
  const len = p.length
  const at = (i: number) => (closed ? p[(i + len) % len]! : p[Math.max(0, Math.min(len - 1, i))]!)
  let d = `M${P(p[0]!)}`
  const segs = closed ? len : len - 1
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1: Pt = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension]
    const c2: Pt = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension]
    d += ` C${P(c1)} ${P(c2)} ${P(p2)}`
  }
  return closed ? `${d} Z` : d
}

/** Контур конечности переменной толщины вдоль оси: мышцы, хвосты, шеи, кости */
export function limbPath(p: readonly Wp[], capK = 0.8): string {
  const len = p.length
  const dir = (i: number): Pt => {
    const a = p[Math.max(0, i - 1)]!
    const b = p[Math.min(len - 1, i + 1)]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy) || 1
    return [dx / l, dy / l]
  }
  const left: Pt[] = []
  const right: Pt[] = []
  p.forEach(([x, y, w], i) => {
    const [dx, dy] = dir(i)
    left.push([x - (dy * w) / 2, y + (dx * w) / 2])
    right.push([x + (dy * w) / 2, y - (dx * w) / 2])
  })
  const [ex, ey, ew] = p[len - 1]!
  const [sx, sy, sw] = p[0]!
  const de = dir(len - 1)
  const ds = dir(0)
  const ring: Pt[] = [
    ...left,
    [ex + de[0] * ew * 0.5 * capK, ey + de[1] * ew * 0.5 * capK],
    ...right.reverse(),
    [sx - ds[0] * sw * 0.5 * capK, sy - ds[1] * sw * 0.5 * capK],
  ]
  return smooth(ring, true, 0.9)
}

/** Точка на отрезке */
export const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/** Многоугольник по точкам */
export const poly = (p: readonly Pt[]) => `M${p.map(P).join(' L')} Z`

// ——— заливки и штрихи ———

/** Залитая фигура с тонким контуром */
export const fill = (d: string, paint: string, line = 0.8, extra = '') =>
  `<path d="${d}" fill="${paint}"${line > 0 ? ` stroke="${INK}" stroke-opacity="0.55" stroke-width="${n(line * 0.7)}" stroke-linejoin="round"` : ''}${extra}/>`

/** Тон без контура (тени, блики, подсветка) */
export const tint = (d: string, color: string, opacity = 1) =>
  `<path d="${d}" fill="${color}"${opacity < 1 ? ` opacity="${opacity}"` : ''}/>`

/** Штрих: складки, трещины, швы, пряди */
export const line = (d: string, color: string, w: number, opacity = 1, extra = '') =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${opacity < 1 ? ` opacity="${opacity}"` : ''}${extra}/>`

/**
 * Объёмная фигура: светотень, фактура материала и контур.
 * У мелких фигур (зубы, заклёпки) фактура не рисуется — она бы их «замылила».
 */
export function vol(a: Art, d: string, t: Tone, lineW = 0.8): string {
  const size = extent(d)
  const big = size > 2.5
  return (
    // контактная тень на то, что лежит под формой
    (size > 4 ? `<path d="${d}" transform="translate(0.9 1.3)" fill="${a.halo('#0a0610', 0.6)}" opacity="0.5"/>` : '') +
    fill(d, a.sph(t), 0) +
    (big && t.tex ? `<path d="${d}" fill="${a.tex(t.tex)}"/>` : '') +
    (size > 6 && t.tex && t.tex !== 'metal' ? `<path d="${d}" fill="${a.mottle()}"/>` : '') +
    (big ? `<path d="${d}" fill="${a.form()}"/>` : '') +
    // контур почти растворён: форму отделяют свет и тень
    (lineW > 0 ? `<path d="${d}" fill="none" stroke="${edge(t)}" stroke-width="${n(lineW * 0.6)}" stroke-opacity="0.75" stroke-linejoin="round"/>` : '')
  )
}

/** Контур в цвет материала: глубокий оттенок его тени, а не чёрная обводка */
export const edge = (t: Tone) => mix(mix(t.lo, INK, 0.55), AMBIENT, 0.15)

/** Мягкая контактная тень под юнитом */
export const groundShadow = (a: Art, cx = 50, rx = 22, cy = 94) =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(rx * 0.2)}" fill="${a.halo('#000000', 0.55)}"/>`

/** Мягкая падающая тень / затенение в складке: тёмное пятно, тающее к краям */
export const shade = (a: Art, d: string, strength = 0.6) => `<path d="${d}" fill="${a.halo('#0a0610', strength)}"/>`

/** Блик на глянцевой или влажной поверхности */
export const spec = (a: Art, x: number, y: number, r = 0.8, op = 0.9) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * 2.4)}" fill="${a.halo('#ffffff', 0.5)}"/>` +
  `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(r)}" ry="${n(r * 0.7)}" fill="#ffffff" opacity="${op}"/>`

/** Свечение вокруг точки */
export const glow = (a: Art, x: number, y: number, r: number, color: string = C.glow, strength = 0.7) =>
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${a.halo(color, strength)}"/>`

/** Горящий глаз: ореол, радужка, горячая точка */
export const eye = (a: Art, x: number, y: number, r = 1, color: string = C.glow) =>
  glow(a, x, y, r * 3.2, color, 0.65) +
  `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="${color}"/>` +
  `<circle cx="${n(x + r * 0.15)}" cy="${n(y - r * 0.1)}" r="${n(r * 0.45)}" fill="#ffffff" opacity="0.9"/>`

// ——— кости ———

/**
 * Трубчатая кость от a до b: узкий стержень и утолщённые эпифизы,
 * светотень цилиндра и блик вдоль оси.
 */
export function bone(art: Art, a: Pt, b: Pt, w = 2.4, t: Tone = T.bone): string {
  const axis: Wp[] = [
    [...a, w * 1.75],
    [...lerp(a, b, 0.12), w * 1.05],
    [...lerp(a, b, 0.5), w * 0.82],
    [...lerp(a, b, 0.88), w * 1.05],
    [...b, w * 1.65],
  ]
  const h1 = lerp(a, b, 0.14)
  const h2 = lerp(a, b, 0.86)
  const o = w * 0.22
  return (
    vol(art, limbPath(axis, 0.9), t, 0.7) +
    line(`M${n(h1[0] - o)},${n(h1[1] - o)} L${n(h2[0] - o)},${n(h2[1] - o)}`, t.hi, w * 0.32, 0.8) +
    // бугорок сустава
    `<circle cx="${n(a[0] - o)}" cy="${n(a[1] - o)}" r="${n(w * 0.38)}" fill="${t.hi}" opacity="0.55"/>`
  )
}

/** Предплечье — две параллельные кости (лучевая и локтевая) */
export function forearm(art: Art, a: Pt, b: Pt, w = 2, t: Tone = T.bone): string {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const px = (-dy / l) * w * 0.42
  const py = (dx / l) * w * 0.42
  return (
    bone(art, [a[0] + px, a[1] + py], [b[0] + px * 0.6, b[1] + py * 0.6], w * 0.72, { ...t, base: t.lo, hi: t.base }) +
    bone(art, [a[0] - px, a[1] - py], [b[0] - px * 0.6, b[1] - py * 0.6], w * 0.78, t)
  )
}

/** Кисть скелета: пястье и растопыренные фаланги, пальцы в направлении angle (градусы) */
export function boneHand(art: Art, x: number, y: number, angle: number, size = 1, t: Tone = T.bone, curl = 0): string {
  const r = (deg: number) => (deg * Math.PI) / 180
  let s = `<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(1.5 * size)}" ry="${n(1.1 * size)}" fill="${art.sph(t)}" stroke="${INK}" stroke-width="0.5"/>`
  const fingers = [-26, -9, 7, 22]
  fingers.forEach((f, i) => {
    const a1 = r(angle + f)
    const a2 = r(angle + f + curl)
    const l1 = (2.6 - Math.abs(i - 1.5) * 0.35) * size
    const k: Pt = [x + Math.cos(a1) * l1, y + Math.sin(a1) * l1]
    const tip: Pt = [k[0] + Math.cos(a2) * l1 * 0.8, k[1] + Math.sin(a2) * l1 * 0.8]
    s +=
      line(`M${n(x)},${n(y)} L${P(k)} L${P(tip)}`, INK, 1.25 * size) +
      line(`M${n(x)},${n(y)} L${P(k)} L${P(tip)}`, t.base, 0.62 * size) +
      `<circle cx="${n(k[0])}" cy="${n(k[1])}" r="${n(0.42 * size)}" fill="${t.hi}"/>`
  })
  // большой палец
  const at = r(angle + 70)
  const th: Pt = [x + Math.cos(at) * 2.2 * size, y + Math.sin(at) * 2.2 * size]
  s += line(`M${n(x)},${n(y)} L${P(th)}`, INK, 1.3 * size) + line(`M${n(x)},${n(y)} L${P(th)}`, t.base, 0.66 * size)
  return s
}

/** Стопа скелета: пяточная кость, плюсна и фаланги, носок вправо */
export function boneFoot(art: Art, x: number, y: number, len = 6, t: Tone = T.bone): string {
  const k = len / 6
  return (
    vol(art, smooth([[x - 1.6 * k, y - 1.2 * k], [x + 1.2 * k, y - 2 * k], [x + 3.6 * k, y - 0.6 * k], [x + 2.6 * k, y + 0.9 * k], [x - 1.2 * k, y + 1 * k]], true), t, 0.6) +
    [0, 1, 2].map((i) => {
      const yy = y - 0.4 * k + i * 0.55 * k
      return line(`M${n(x + 3 * k)},${n(yy)} L${n(x + 5.8 * k - i * 0.4 * k)},${n(yy + 0.5 * k)}`, INK, 1.2 * k) +
        line(`M${n(x + 3 * k)},${n(yy)} L${n(x + 5.8 * k - i * 0.4 * k)},${n(yy + 0.5 * k)}`, i === 0 ? t.hi : t.base, 0.6 * k)
    }).join('')
  )
}

/**
 * Анатомический череп в профиль 3/4, смотрит вправо. (cx, cy) — центр мозговой части,
 * s — её радиус. Глазница, носовое отверстие, скула, зубы, отдельная нижняя челюсть.
 */
export function skull(
  art: Art,
  cx: number,
  cy: number,
  s: number,
  opts: { jaw?: boolean; open?: number; eyeColor?: string | null; tone?: Tone } = {},
): string {
  const { jaw = true, open = 0, eyeColor = C.glow, tone = T.bone } = opts
  const k = s / 10
  const Q = (x: number, y: number): Pt => [cx + x * k, cy + y * k]
  const Qs = (x: number, y: number) => P(Q(x, y))
  const cranium = smooth(
    [Q(-9.6, 2), Q(-9.4, -4), Q(-6, -9), Q(0, -10.6), Q(6, -8.6), Q(9.6, -4.6), Q(10.8, -0.6), Q(11.6, 2.6), Q(12.8, 5.6), Q(13.2, 8.4), Q(12.4, 10), Q(7.6, 10.4), Q(4, 9.2), Q(0.6, 9.6), Q(-3, 9), Q(-7, 6.6)],
    true,
  )
  const jawOpen = open * 3.5
  const mand = smooth(
    [Q(0.6, 8), Q(1.2, 12.6 + jawOpen * 0.4), Q(3, 14.6 + jawOpen), Q(8.4, 15.4 + jawOpen), Q(12, 14.2 + jawOpen), Q(12.6, 12 + jawOpen), Q(9, 11.4 + jawOpen * 0.7), Q(4.4, 11.6 + jawOpen * 0.5), Q(2.6, 10)],
    true,
  )
  const teeth = (y: number, x0: number, x1: number, h: number) => {
    let d = ''
    for (let x = x0; x <= x1 + 0.01; x += 1.25) d += `M${Qs(x, y)} L${Qs(x, y + h)} `
    return line(d, INK, 0.42 * k, 0.85)
  }
  return (
    (jaw
      ? vol(art, mand, { ...tone, hi: tone.base, base: tone.lo }, 0.7 * k) +
        fill(`M${Qs(5, 11.6 + jawOpen * 0.5)} L${Qs(12.3, 12.1 + jawOpen)} L${Qs(12, 13.3 + jawOpen)} L${Qs(5.4, 13 + jawOpen * 0.6)} Z`, tone.base, 0.4 * k) +
        teeth(11.8 + jawOpen * 0.7, 6, 11.4, 1.3)
      : '') +
    vol(art, cranium, tone, 0.75 * k) +
    // височная впадина и линия скулы
    tint(smooth([Q(-1, 3), Q(2, 0.6), Q(5.6, 2.8), Q(5, 6.6), Q(1, 7.6), Q(-2.4, 6)], true), tone.lo, 0.45) +
    line(`M${Qs(1, 6.6)} C${Qs(3.6, 5.8)} ${Qs(6.4, 6.2)} ${Qs(9, 7.4)}`, tone.hi, 0.9 * k, 0.9) +
    // надбровье и лоб — блик
    tint(smooth([Q(-4, -6.6), Q(1, -9.2), Q(6.4, -7.4), Q(3.4, -6), Q(-1, -5.6)], true), tone.hi, 0.7) +
    // глазница
    fill(smooth([Q(5.4, 0), Q(9.6, -1.2), Q(11.4, 2.2), Q(10.6, 6), Q(7, 6.4), Q(5, 3.4)], true), art.rad(`orb${cx}${cy}`, Q(8.3, 2.8), 4.2 * k, [[0, '#000000'], [0.62, '#120c0a'], [1, tone.lo]]), 0.5 * k) +
    // скуловая кость под глазницей
    tint(smooth([Q(6, 6.8), Q(9.4, 6.4), Q(10.6, 7.6), Q(7.4, 8.4)], true), tone.hi, 0.75) +
    // носовое отверстие
    fill(`M${Qs(11.8, 5)} C${Qs(13, 6.4)} ${Qs(13, 7.8)} ${Qs(12.4, 8.8)} L${Qs(10.8, 8.6)} C${Qs(10.4, 7.6)} ${Qs(10.8, 6.2)} ${Qs(11.8, 5)} Z`, '#120d0a', 0) +
    // верхние зубы
    fill(`M${Qs(6.4, 9.6)} L${Qs(12.6, 9.8)} L${Qs(12.3, 11.6)} L${Qs(6.8, 11.3)} Z`, tone.hi, 0.4 * k) +
    teeth(9.8, 7.4, 11.6, 1.6) +
    // черепной шов и трещины
    line(`M${Qs(-3, -9.8)} C${Qs(-2, -7)} ${Qs(-4, -5)} ${Qs(-3, -2)}`, tone.lo, 0.35 * k, 0.8) +
    line(`M${Qs(4.6, -8.8)} l${n(-0.8 * k)},${n(2 * k)} l${n(1 * k)},${n(1.2 * k)}`, tone.lo, 0.3 * k, 0.7) +
    (eyeColor ? eye(art, cx + 8.4 * k, cy + 2.6 * k, 0.95 * k, eyeColor) : '')
  )
}

/** Позвоночник: цепочка позвонков с остистыми отростками */
export function spine(art: Art, p: readonly Pt[], w = 2, t: Tone = T.bone): string {
  let s = line(smooth(p), INK, w * 1.3) + line(smooth(p), t.lo, w * 0.8)
  const steps = Math.max(3, Math.round(w * 3))
  for (let i = 0; i < p.length - 1; i++) {
    for (let j = 0; j < steps; j++) {
      const c = lerp(p[i]!, p[i + 1]!, j / steps)
      s += `<ellipse cx="${n(c[0])}" cy="${n(c[1])}" rx="${n(w * 0.62)}" ry="${n(w * 0.5)}" fill="${art.sph(t)}" stroke="${INK}" stroke-width="0.4"/>`
    }
  }
  return s
}

/**
 * Грудная клетка 3/4: позвоночник сзади, грудина спереди, рёбра дугами вперёд-вниз,
 * в глубине — тень. x — позвоночник, front — смещение грудины вперёд.
 */
export function ribcage(art: Art, x: number, top: number, bottom: number, front = 9, t: Tone = T.bone): string {
  const h = bottom - top
  const sx = x + front
  const cavity = smooth([[x + 1, top + 1], [sx - 1, top + 2], [sx + 0.6, top + h * 0.6], [sx - 2, bottom], [x + 1, bottom - 1]], true)
  let ribs = ''
  const count = 7
  for (let i = 0; i < count; i++) {
    const f = i / (count - 1)
    const y = top + 1.5 + h * 0.78 * f
    const reach = front * (0.86 + Math.sin(f * Math.PI) * 0.22)
    const d = `M${n(x)},${n(y)} C${n(x + reach * 0.35)},${n(y - 2.4)} ${n(x + reach * 1.05)},${n(y - 0.8)} ${n(x + reach * 0.96)},${n(y + 2.6 + f * 1.4)}`
    const w = 0.95 - f * 0.2
    ribs += line(d, INK, w + 0.75) + line(d, i % 2 ? t.base : t.hi, w)
  }
  // грудина
  const sternum = smooth([[sx - 0.6, top + 1], [sx + 1, top + 1.6], [sx + 0.6, top + h * 0.62], [sx - 0.8, top + h * 0.6]], true)
  return (
    tint(cavity, '#0e0b0a', 0.55) +
    spine(art, [[x, top - 1], [x - 0.6, top + h * 0.5], [x + 0.4, bottom + 1]], 1.9, t) +
    ribs +
    vol(art, sternum, t, 0.5)
  )
}

/** Таз в 3/4: крыло подвздошной кости, вертлужная впадина и запирательное отверстие */
export function pelvis(art: Art, x: number, y: number, t: Tone = T.bone): string {
  const wing = smooth([[x - 4.6, y - 1.6], [x - 3.4, y - 4.6], [x + 0.4, y - 5.4], [x + 3.6, y - 3.6], [x + 3, y - 0.6], [x + 0.4, y + 0.6]], true)
  const lower = smooth([[x - 0.6, y - 0.4], [x + 3.6, y - 0.8], [x + 5.2, y + 1.6], [x + 3.4, y + 3.6], [x - 0.4, y + 3]], true)
  return (
    vol(art, wing, t, 0.6) +
    line(`M${n(x - 3.8)},${n(y - 3.6)} C${n(x - 2)},${n(y - 5.2)} ${n(x + 1.4)},${n(y - 5.2)} ${n(x + 3.2)},${n(y - 3.4)}`, t.hi, 0.6, 0.9) +
    tint(smooth([[x - 1.6, y - 2.6], [x + 1.4, y - 2.6], [x + 0.6, y - 0.4], [x - 1.4, y - 0.6]], true), t.lo, 0.5) +
    vol(art, lower, t, 0.6) +
    fill(smooth([[x + 1, y + 0.6], [x + 3.4, y + 0.6], [x + 3.2, y + 2.4], [x + 1.2, y + 2.2]], true), '#120d0a', 0) +
    `<circle cx="${n(x - 0.2)}" cy="${n(y + 0.4)}" r="1.25" fill="${t.lo}" stroke="${INK}" stroke-width="0.4"/>`
  )
}

// ——— оружие и снаряжение ———

/**
 * Клинок от рукояти (hx, hy) под углом angle (градусы, 0 — вправо, -90 — вверх):
 * дол, режущая кромка с бликом, гарда, обмотанная рукоять, навершие; rust — ржавые пятна.
 */
export function blade(
  art: Art,
  hx: number,
  hy: number,
  angle: number,
  len: number,
  w = 3,
  opts: { rust?: boolean; tone?: Tone; guard?: number } = {},
): string {
  const { rust = false, tone = T.metal, guard = 4.5 } = opts
  const a = (angle * Math.PI) / 180
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const px = -dy
  const py = dx
  const at = (along: number, side: number): Pt => [hx + dx * along + px * side, hy + dy * along + py * side]
  const body = poly([at(0, w / 2), at(len * 0.82, w * 0.46), at(len, 0), at(len * 0.82, -w * 0.46), at(0, -w / 2)])
  const edgeHi = poly([at(0, -w / 2), at(len * 0.82, -w * 0.46), at(len, 0), at(len * 0.8, -w * 0.12), at(0, -w * 0.14)])
  const grip0 = at(-0.8, 0)
  const grip1 = at(-w * 1.9, 0)
  let wraps = ''
  for (let i = 1; i < 4; i++) {
    const c = lerp(grip0, grip1, i / 4)
    wraps += line(`M${n(c[0] + px * 0.9)},${n(c[1] + py * 0.9)} L${n(c[0] - px * 0.9 + dx * 0.6)},${n(c[1] - py * 0.9 + dy * 0.6)}`, '#120d0a', 0.4, 0.8)
  }
  let spots = ''
  if (rust)
    for (const [t, sd, r] of [[0.3, 0.6, 0.7], [0.55, -0.4, 0.5], [0.72, 0.3, 0.6], [0.18, -0.6, 0.4]] as const) {
      const c = at(len * t, w * sd * 0.5)
      spots += `<circle cx="${n(c[0])}" cy="${n(c[1])}" r="${n(r * w * 0.4)}" fill="${T.rust.base}" opacity="0.75"/>`
    }
  const pommel = at(-w * 2.1, 0)
  return (
    line(`M${P(grip0)} L${P(grip1)}`, INK, 2.1) +
    line(`M${P(grip0)} L${P(grip1)}`, T.leather.base, 1.3) +
    wraps +
    `<circle cx="${n(pommel[0])}" cy="${n(pommel[1])}" r="1.05" fill="${art.sph(tone)}" stroke="${INK}" stroke-width="0.5"/>` +
    fill(body, art.cyl(tone, angle + 90), 0.6) +
    tint(edgeHi, tone.hi, 0.55) +
    line(`M${P(at(1.2, w * 0.05))} L${P(at(len * 0.72, w * 0.04))}`, tone.lo, w * 0.18, 0.7) +
    spots +
    line(`M${P(at(0, guard))} L${P(at(0, -guard))}`, INK, 1.9) +
    line(`M${P(at(0, guard))} L${P(at(0, -guard))}`, T.iron.hi, 1.1)
  )
}

/** Свисающая рваная ткань — бахрома снизу у фигуры: зигзаг между x0 и x1 на высоте y */
export function tatters(x0: number, x1: number, y: number, depth: number, count: number, seed = 1): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i <= count * 2; i++) {
    const t = i / (count * 2)
    const r = Math.abs(Math.sin((i + 1) * 12.9898 * seed) * 43758.5453) % 1
    const down = i % 2 === 1 ? depth * (0.55 + r * 0.6) : depth * 0.15 * r
    out.push([x0 + (x1 - x0) * t, y + down])
  }
  return out
}
