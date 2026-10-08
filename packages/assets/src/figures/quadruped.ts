/**
 * Конструктор четвероногих с ригом: конь, волк/пёс, лев, кабан, медведь, носорог, мамонт, ящер.
 * Ноги — по одной кости на ногу (галоп: передние legNear/legFar, задние legNear2/legFar2),
 * шея с головой — кость head, хвост — tail. Можно посадить всадника, приделать торс кентавра,
 * крылья, несколько голов.
 */
import type { Attack, Motion } from '../types.js'
import { Art, C, INK, type Bone, type Pt, type Tone, eye, fill, glow, groundShadow, lerp, limbPath, line, mix, shade, smooth, spec, tint, vol } from '../kit.js'
import { type HumanoidSpec, type UnitSource, humanoidParts } from './humanoid.js'

export type Species = 'horse' | 'wolf' | 'lion' | 'boar' | 'bear' | 'rhino' | 'mammoth' | 'lizard' | 'eagle'

interface Build {
  /** длина корпуса, высота корпуса, длина ног, ширина ноги */
  L: number
  Hb: number
  leg: number
  legW: number
  /** шея: угол (градусы, -90 вверх), длина, толщина */
  neckA: number
  neckL: number
  neckW: number
  head: number
  paws: boolean
}

const BUILD: Record<Species, Build> = {
  horse: { L: 42, Hb: 19, leg: 28, legW: 4.4, neckA: -52, neckL: 15, neckW: 11, head: 10.5, paws: false },
  wolf: { L: 38, Hb: 15, leg: 22, legW: 4.6, neckA: -25, neckL: 9, neckW: 10, head: 8, paws: true },
  lion: { L: 40, Hb: 17, leg: 22, legW: 5.6, neckA: -35, neckL: 8, neckW: 12, head: 9, paws: true },
  boar: { L: 38, Hb: 19, leg: 16, legW: 5.4, neckA: -10, neckL: 6, neckW: 13, head: 9, paws: false },
  bear: { L: 42, Hb: 24, leg: 20, legW: 8, neckA: -20, neckL: 7, neckW: 15, head: 9.5, paws: true },
  rhino: { L: 50, Hb: 26, leg: 20, legW: 8.6, neckA: -10, neckL: 6, neckW: 17, head: 12, paws: false },
  mammoth: { L: 52, Hb: 34, leg: 26, legW: 10, neckA: -20, neckL: 6, neckW: 20, head: 14, paws: false },
  lizard: { L: 46, Hb: 13, leg: 13, legW: 5.4, neckA: -15, neckL: 10, neckW: 9, head: 9, paws: true },
  eagle: { L: 42, Hb: 19, leg: 24, legW: 5, neckA: -50, neckL: 13, neckW: 11, head: 9.5, paws: true },
}

export interface QuadSpec {
  id: string
  species: Species
  tone: Tone
  /** Брюхо / подшёрсток */
  belly?: Tone
  /** Грива, шерсть на загривке, перья */
  mane?: Tone
  /** Масштаб фигуры (1 — заполняет кадр 1×1 как пёс; для 2×2 юнитов те же координаты, кадр больше) */
  scale?: number
  eyes?: string
  /** Попона/броня на корпусе */
  barding?: { tone: Tone; trim?: string }
  rider?: HumanoidSpec
  /** Торс кентавра вместо шеи и головы */
  centaur?: HumanoidSpec
  wings?: { tone: Tone; kind: 'feather' | 'bat' }
  heads?: number
  /** Хвост: обычный, кисточка (лев), скорпион, пламя, оперённый */
  tail?: 'normal' | 'tuft' | 'scorpion' | 'flame' | 'stub' | 'feather' | 'lizard'
  horn?: boolean
  tusks?: boolean
  fire?: string
  aura?: { color: string; strength?: number }
  motion: Motion
  attack: Attack
  extra?: { back?: string; front?: string; head?: string }
}

const n2 = (v: number) => Math.round(v * 100) / 100

/** Голова зверя в точке крепления шеи (x, y), смотрит вправо, размер s */
function beastHead(a: Art, sp: QuadSpec, x: number, y: number, s: number, eyeColor?: string): string {
  const t = sp.tone
  const P = (dx: number, dy: number): Pt => [x + dx * s, y + dy * s]
  const S = (dx: number, dy: number) => P(dx, dy).map(n2).join(',')
  const eyeAt = (dx: number, dy: number, r = 0.11) =>
    eyeColor
      ? fill(smooth([P(dx - 0.12, dy), P(dx, dy - 0.09), P(dx + 0.13, dy), P(dx, dy + 0.08)], true), '#100808', 0) + eye(a, x + dx * s, y + dy * s, r * s * 0.55, eyeColor)
      : fill(smooth([P(dx - 0.12, dy), P(dx, dy - 0.09), P(dx + 0.13, dy), P(dx, dy + 0.08)], true), '#1a120c', 0) + `<circle cx="${n2(x + (dx + 0.03) * s)}" cy="${n2(y + (dy - 0.02) * s)}" r="${n2(0.035 * s)}" fill="#ffffff"/>`
  let h = ''
  switch (sp.species) {
    case 'horse': {
      const d = smooth([P(-0.4, 0.1), P(-0.2, -0.5), P(0.3, -0.62), P(0.7, -0.35), P(1.3, 0.25), P(1.55, 0.6), P(1.5, 0.85), P(1.15, 0.92), P(0.6, 0.6), P(0.1, 0.55), P(-0.3, 0.5)], true)
      h += vol(a, smooth([P(0.1, -0.5), P(0.0, -1.05), P(0.3, -0.6)], true), t, 0.5)
      h += vol(a, d, t, 0.7)
      h += tint(smooth([P(0.9, 0.2), P(1.45, 0.62), P(1.4, 0.82), P(1.0, 0.7)], true), t.lo, 0.35)
      h += eyeAt(0.42, -0.15)
      h += fill(smooth([P(1.32, 0.52), P(1.44, 0.56), P(1.38, 0.64)], true), '#140c08', 0)
      h += line(`M${S(1.15, 0.85)} L${S(1.5, 0.78)}`, mix(t.lo, INK, 0.4), 0.06 * s)
      break
    }
    case 'wolf':
    case 'lion': {
      const lion = sp.species === 'lion'
      const d = smooth([P(-0.5, 0.2), P(-0.35, -0.45), P(0.2, -0.6), P(0.65, -0.35), P(1.2, -0.1), P(1.5, 0.12), P(1.45, 0.35), P(1.1, 0.42), P(1.35, 0.55), P(1.05, 0.72), P(0.5, 0.72), P(-0.2, 0.6)], true)
      if (lion && sp.mane) h += vol(a, smooth([P(-0.9, 1.2), P(-1.1, 0), P(-0.7, -0.9), P(0.1, -1.1), P(0.6, -0.7), P(0.4, 0.2), P(0.5, 1.0), P(-0.2, 1.4)], true), sp.mane, 0.6)
      h += vol(a, smooth([P(-0.1, -0.45), P(-0.3, -1.05), P(0.25, -0.5)], true), t, 0.5)
      h += vol(a, d, t, 0.7)
      h += fill(smooth([P(1.12, 0.42), P(1.42, 0.38), P(1.3, 0.54), P(1.05, 0.62)], true), '#2a0a0c', 0.3)
      h += line(`M${S(1.15, 0.4)} l${n2(0.03 * s)},${n2(0.14 * s)} M${S(1.32, 0.38)} l${n2(0.02 * s)},${n2(0.13 * s)}`, '#efe6cc', 0.06 * s)
      h += fill(smooth([P(1.42, 0.06), P(1.54, 0.12), P(1.46, 0.2)], true), '#140c08', 0)
      h += eyeAt(0.55, -0.12)
      h += line(`M${S(0.35, -0.3)} C${S(0.55, -0.4)} ${S(0.75, -0.32)} ${S(0.85, -0.2)}`, mix(t.lo, INK, 0.3), 0.07 * s, 0.8)
      break
    }
    case 'boar': {
      const d = smooth([P(-0.5, 0.3), P(-0.4, -0.5), P(0.2, -0.65), P(0.8, -0.3), P(1.35, 0.1), P(1.45, 0.5), P(1.2, 0.7), P(0.5, 0.75), P(-0.2, 0.7)], true)
      h += vol(a, smooth([P(0, -0.5), P(-0.15, -1.0), P(0.35, -0.55)], true), t, 0.5)
      h += vol(a, d, t, 0.7)
      h += vol(a, smooth([P(1.3, 0.05), P(1.5, 0.12), P(1.52, 0.5), P(1.32, 0.55)], true), { ...t, base: mix(t.base, '#d89a8a', 0.4) }, 0.5)
      h += fill(`M${S(1.0, 0.55)} C${S(1.25, 0.5)} ${S(1.4, 0.2)} ${S(1.3, -0.1)} C${S(1.2, 0.2)} ${S(1.05, 0.4)} ${S(0.95, 0.42)} Z`, a.sph({ hi: '#ffffff', base: '#e8dcc0', lo: '#7a6a4a' }), 0.4)
      h += eyeAt(0.5, -0.15)
      break
    }
    case 'bear': {
      const d = smooth([P(-0.6, 0.3), P(-0.5, -0.5), P(0.1, -0.75), P(0.7, -0.5), P(1.0, -0.1), P(1.4, 0.1), P(1.45, 0.4), P(1.1, 0.6), P(0.4, 0.75), P(-0.3, 0.7)], true)
      h += vol(a, `M${S(-0.25, -0.55)} a${n2(0.22 * s)},${n2(0.22 * s)} 0 1,1 ${n2(0.3 * s)},${n2(-0.1 * s)} Z`, t, 0.5)
      h += vol(a, d, t, 0.7)
      h += vol(a, smooth([P(1.0, 0.0), P(1.45, 0.1), P(1.45, 0.42), P(1.05, 0.5)], true), { ...t, base: mix(t.base, '#c8a882', 0.35) }, 0.4)
      h += fill(smooth([P(1.32, 0.06), P(1.48, 0.12), P(1.4, 0.24)], true), '#140c08', 0)
      h += eyeAt(0.5, -0.2, 0.09)
      break
    }
    case 'rhino': {
      const d = smooth([P(-0.5, 0.2), P(-0.35, -0.5), P(0.3, -0.55), P(1.0, -0.2), P(1.55, 0.2), P(1.6, 0.55), P(1.2, 0.75), P(0.5, 0.75), P(-0.2, 0.65)], true)
      h += vol(a, smooth([P(0, -0.45), P(-0.1, -0.85), P(0.25, -0.5)], true), t, 0.5)
      h += vol(a, d, t, 0.7)
      h += vol(a, smooth([P(1.15, -0.05), P(1.35, -0.85), P(1.45, -1.0), P(1.5, -0.6), P(1.5, 0.15)], true), { hi: '#f0e6d0', base: '#a89a80', lo: '#3a3020', tex: 'bone' }, 0.5)
      h += vol(a, smooth([P(0.8, -0.3), P(0.92, -0.62), P(1.02, -0.3)], true), { hi: '#f0e6d0', base: '#a89a80', lo: '#3a3020' }, 0.4)
      h += line(`M${S(0.2, 0.2)} C${S(0.4, 0.3)} ${S(0.6, 0.3)} ${S(0.8, 0.2)} M${S(0.1, 0.4)} C${S(0.3, 0.5)} ${S(0.6, 0.5)} ${S(0.9, 0.4)}`, t.lo, 0.06 * s, 0.6)
      h += eyeAt(0.55, 0.05, 0.08)
      break
    }
    case 'mammoth': {
      const d = smooth([P(-0.6, 0.4), P(-0.5, -0.6), P(0.1, -0.95), P(0.7, -0.6), P(1.0, -0.1), P(1.1, 0.4), P(0.9, 0.7), P(0.3, 0.75), P(-0.3, 0.75)], true)
      h += vol(a, smooth([P(-0.6, -0.4), P(-1.1, -0.2), P(-1.15, 0.6), P(-0.7, 1.0), P(-0.3, 0.6)], true), t, 0.6)
      h += vol(a, d, t, 0.7)
      // хобот
      h += vol(a, limbPath([[x + 0.95 * s, y + 0.35 * s, 0.42 * s], [x + 1.25 * s, y + 0.9 * s, 0.32 * s], [x + 1.2 * s, y + 1.5 * s, 0.24 * s], [x + 1.45 * s, y + 1.8 * s, 0.2 * s]]), t, 0.6)
      for (let i = 0; i < 6; i++) h += line(`M${S(1.08 + i * 0.01, 0.6 + i * 0.18)} l${n2(0.2 * s)},0`, t.lo, 0.04 * s, 0.6)
      // бивни
      h += vol(a, smooth([P(0.85, 0.6), P(1.2, 1.4), P(1.7, 1.55), P(2.0, 1.2), P(1.75, 1.35), P(1.35, 1.2), P(1.05, 0.55)], true), { hi: '#fffaf0', base: '#e8dcc0', lo: '#7a6a4a', tex: 'bone' }, 0.5)
      h += eyeAt(0.55, -0.05, 0.08)
      // шерсть
      h += line(`M${S(-0.4, -0.7)} l-0.4,1.2 M${S(0, -0.9)} l-0.2,1.2 M${S(0.4, -0.75)} l0,1.1`, t.lo, 0.05 * s, 0.6)
      break
    }
    case 'lizard': {
      const d = smooth([P(-0.4, 0.2), P(-0.2, -0.35), P(0.5, -0.4), P(1.3, -0.15), P(1.75, 0.15), P(1.6, 0.35), P(1.2, 0.4), P(1.6, 0.5), P(1.2, 0.65), P(0.4, 0.6), P(-0.2, 0.5)], true)
      h += vol(a, d, t, 0.7)
      h += fill(smooth([P(1.15, 0.4), P(1.6, 0.45), P(1.2, 0.55)], true), '#2a0a0c', 0.3)
      h += line(`M${S(1.25, 0.42)} l0,${n2(0.1 * s)} M${S(1.4, 0.43)} l0,${n2(0.1 * s)}`, '#efe6cc', 0.05 * s)
      h += eyeAt(0.6, -0.12, 0.1)
      h += line(`M${S(0.3, 0.1)} C${S(0.6, 0.2)} ${S(1.0, 0.2)} ${S(1.3, 0.12)}`, t.lo, 0.05 * s, 0.5)
      break
    }
    case 'eagle': {
      const feathers = sp.mane ?? t
      const d = smooth([P(-0.5, 0.3), P(-0.45, -0.4), P(0.1, -0.7), P(0.7, -0.5), P(0.9, -0.1), P(0.75, 0.4), P(0.2, 0.65), P(-0.3, 0.7)], true)
      h += vol(a, d, feathers, 0.7)
      // клюв
      h += vol(a, smooth([P(0.75, -0.25), P(1.3, -0.15), P(1.55, 0.15), P(1.4, 0.45), P(1.3, 0.2), P(0.85, 0.3)], true), { hi: '#fff0a0', base: '#e0a828', lo: '#6a4008' }, 0.5)
      h += line(`M${S(0.85, 0.12)} C${S(1.1, 0.12)} ${S(1.3, 0.14)} ${S(1.4, 0.3)}`, '#3a2008', 0.05 * s)
      h += eyeAt(0.5, -0.18, 0.11)
      h += line(`M${S(-0.3, -0.2)} l-0.5,0.3 M${S(-0.2, 0.1)} l-0.5,0.3 M${S(-0.1, 0.4)} l-0.4,0.3`, feathers.lo, 0.05 * s, 0.6)
      break
    }
  }
  if (sp.horn && sp.species === 'horse') h += vol(a, smooth([P(0.45, -0.55), P(0.75, -1.5), P(0.6, -0.5)], true), { hi: '#ffffff', base: '#e8dcff', lo: '#6a5a9a' }, 0.4) + line(`M${S(0.5, -0.65)} l0.4,-0.3 M${S(0.55, -0.9)} l0.4,-0.3 M${S(0.62, -1.15)} l0.3,-0.25`, '#9a8ac8', 0.04 * s)
  if (sp.extra?.head) h += sp.extra.head
  return h
}

/** Четвероногий с ригом */
export function quadruped(sp: QuadSpec): UnitSource {
  const a = new Art(sp.id)
  const B = BUILD[sp.species]
  const k = sp.scale ?? 1
  const ground = 92
  // многоголовой гидре нужно место под шеи справа
  const cx = (sp.heads ?? 1) > 3 ? 36 : 46
  const L = B.L * k
  const Hb = B.Hb * k
  const legLen = B.leg * k
  const by = ground - legLen - Hb * 0.42
  const t = sp.tone
  const far = (x: Tone): Tone => ({ ...x, hi: x.base, base: mix(x.base, x.lo, 0.38) })
  const layers: [Bone, string][] = []
  const pivots: Partial<Record<Bone, Pt>> = {}

  let back = groundShadow(a, cx, L * 0.62, 94)
  if (sp.aura) back += glow(a, cx, by, L, sp.aura.color, sp.aura.strength ?? 0.25)
  if (sp.extra?.back) back += sp.extra.back
  layers.push(['root', back])

  // крылья (за корпусом)
  if (sp.wings) {
    const root: Pt = [cx + L * 0.12, by - Hb * 0.35]
    const wingD = (x: number, y: number, s: number) =>
      sp.wings!.kind === 'feather'
        ? smooth([[x, y], [x - 6 * s, y - 18 * s], [x - 14 * s, y - 30 * s], [x - 24 * s, y - 34 * s], [x - 30 * s, y - 28 * s], [x - 26 * s, y - 18 * s], [x - 32 * s, y - 10 * s], [x - 24 * s, y - 4 * s], [x - 26 * s, y + 4 * s], [x - 14 * s, y + 4 * s]], true)
        : smooth([[x, y], [x - 8 * s, y - 24 * s], [x - 30 * s, y - 30 * s], [x - 24 * s, y - 18 * s], [x - 34 * s, y - 10 * s], [x - 24 * s, y - 4 * s], [x - 28 * s, y + 6 * s], [x - 12 * s, y + 4 * s]], true)
    const feath = (x: number, y: number, s: number, tone: Tone) => {
      let f = vol(a, wingD(x, y, s), tone, 0.6)
      for (let i = 0; i < 5; i++) f += line(`M${n2(x - 3 * s)},${n2(y - 20 * s + i * 6 * s)} C${n2(x - 12 * s)},${n2(y - 24 * s + i * 6 * s)} ${n2(x - 20 * s)},${n2(y - 22 * s + i * 6 * s)} ${n2(x - 28 * s + i * 2 * s)},${n2(y - 16 * s + i * 6 * s)}`, tone.lo, 0.5, 0.5)
      return f
    }
    layers.push(['wingFar', feath(root[0] + 4, root[1] - 2, k * 0.95, far(sp.wings.tone))])
    pivots.wingFar = [root[0] + 4, root[1] - 2]
    layers.push(['wingNear', feath(root[0], root[1], k, sp.wings.tone)])
    pivots.wingNear = root
  }

  // хвост
  const tb: Pt = [cx - L * 0.5, by - Hb * 0.15]
  pivots.tail = tb
  {
    let s = ''
    const tail = sp.tail ?? 'normal'
    if (tail === 'scorpion') {
      const pts: [number, number, number][] = [[tb[0], tb[1], 4 * k], [tb[0] - 8 * k, tb[1] - 8 * k, 3.4 * k], [tb[0] - 6 * k, tb[1] - 20 * k, 2.8 * k], [tb[0] + 4 * k, tb[1] - 26 * k, 2.2 * k]]
      s += vol(a, limbPath(pts), t, 0.6)
      for (const p of pts.slice(1)) s += `<ellipse cx="${n2(p[0])}" cy="${n2(p[1])}" rx="${n2(p[2] * 0.7)}" ry="${n2(p[2] * 0.5)}" fill="none" stroke="${t.lo}" stroke-width="0.5"/>`
      s += vol(a, smooth([[tb[0] + 4 * k, tb[1] - 28 * k], [tb[0] + 9 * k, tb[1] - 26 * k], [tb[0] + 12 * k, tb[1] - 20 * k], [tb[0] + 6 * k, tb[1] - 24 * k]], true), { hi: '#e6ffc4', base: C.venom, lo: '#2a5a14' }, 0.5)
    } else if (tail === 'flame') {
      s += glow(a, tb[0] - 6 * k, tb[1] + 4 * k, 12 * k, sp.fire ?? '#ff8a2a', 0.5)
      s += fill(smooth([[tb[0], tb[1] - 2], [tb[0] - 8 * k, tb[1]], [tb[0] - 16 * k, tb[1] + 10 * k], [tb[0] - 12 * k, tb[1] + 8 * k], [tb[0] - 14 * k, tb[1] + 16 * k], [tb[0] - 6 * k, tb[1] + 6 * k], [tb[0], tb[1] + 4]], true), a.rad('tflame', [tb[0] - 6 * k, tb[1] + 4 * k], 14 * k, [[0, '#ffffff'], [0.3, '#ffe070'], [0.7, sp.fire ?? '#ff7a1a'], [1, '#6a1404']]), 0)
    } else if (tail === 'feather') {
      s += vol(a, smooth([[tb[0], tb[1] - 2], [tb[0] - 14 * k, tb[1] - 4 * k], [tb[0] - 18 * k, tb[1] + 4 * k], [tb[0] - 6 * k, tb[1] + 4]], true), sp.mane ?? t, 0.6)
    } else if (tail === 'lizard') {
      s += vol(a, limbPath([[tb[0] + 2, tb[1], 7 * k], [tb[0] - 10 * k, tb[1] + 6 * k, 4.6 * k], [tb[0] - 22 * k, tb[1] + 12 * k, 2.4 * k], [tb[0] - 30 * k, tb[1] + 14 * k, 1 * k]]), t, 0.6)
    } else if (tail !== 'stub') {
      const hair = sp.species === 'horse' ? sp.mane ?? t : t
      const w = sp.species === 'horse' ? 4.4 : sp.species === 'wolf' ? 4 : 2
      s += vol(a, limbPath([[tb[0], tb[1], w * k], [tb[0] - 6 * k, tb[1] + 8 * k, w * 0.8 * k], [tb[0] - 8 * k, tb[1] + 18 * k, w * 0.5 * k]]), hair, 0.6)
      if (tail === 'tuft') s += vol(a, smooth([[tb[0] - 9 * k, tb[1] + 16 * k], [tb[0] - 5 * k, tb[1] + 18 * k], [tb[0] - 7 * k, tb[1] + 24 * k], [tb[0] - 11 * k, tb[1] + 22 * k]], true), sp.mane ?? t, 0.5)
    }
    layers.push(['tail', s])
  }

  // ноги
  const shoulder: Pt = [cx + L * 0.3, by + Hb * 0.05]
  const hip: Pt = [cx - L * 0.3, by]
  const lw = B.legW * k
  const legDraw = (top: Pt, front: boolean, dx: number, tone: Tone) => {
    const foot: Pt = [top[0] + dx, ground - 1.5]
    let s: string
    if (front) {
      // передняя: плечо → локоть → запястье, тонкое предплечье
      const elbow: Pt = [top[0] - 1 * k + dx * 0.2, top[1] + legLen * 0.4]
      const wrist: Pt = [foot[0] - 0.6 * k, foot[1] - legLen * 0.22]
      s = vol(a, limbPath([[top[0], top[1] - Hb * 0.15, lw * 2], [...lerp(top, elbow, 0.55), lw * 1.35], [elbow[0], elbow[1], lw * 0.95]]), tone, 0.6)
      s += vol(a, limbPath([[elbow[0], elbow[1], lw * 0.95], [...lerp(elbow, wrist, 0.5), lw * 0.7], [wrist[0], wrist[1], lw * 0.72]]), tone, 0.6)
      s += vol(a, limbPath([[wrist[0], wrist[1], lw * 0.7], [foot[0], foot[1] - 1.5 * k, lw * 0.62]]), tone, 0.6)
    } else {
      // задняя: бедро вперёд → скакательный сустав назад
      const knee: Pt = [top[0] + 3 * k, top[1] + legLen * 0.36]
      const hock: Pt = [top[0] - 3.5 * k + dx * 0.3, top[1] + legLen * 0.7]
      s = vol(a, limbPath([[top[0] - 1 * k, top[1] - Hb * 0.2, lw * 2.3], [...lerp(top, knee, 0.5), lw * 1.7], [knee[0], knee[1], lw * 1.05]]), tone, 0.6)
      s += vol(a, limbPath([[knee[0], knee[1], lw], [...lerp(knee, hock, 0.5), lw * 0.75], [hock[0], hock[1], lw * 0.72]]), tone, 0.6)
      s += vol(a, limbPath([[hock[0], hock[1], lw * 0.7], [foot[0], foot[1] - 1.5 * k, lw * 0.6]]), tone, 0.6)
    }
    if (B.paws) {
      s += vol(a, smooth([[foot[0] - lw * 0.7, foot[1] - 1.6 * k], [foot[0] + lw * 0.9, foot[1] - 1.8 * k], [foot[0] + lw * 1.3, foot[1] + 0.8], [foot[0] - lw * 0.8, foot[1] + 0.8]], true), tone, 0.5)
      s += line(`M${n2(foot[0] + lw * 0.6)},${n2(foot[1] - 0.4)} l${n2(lw * 0.5)},0.6 M${n2(foot[0] + lw * 0.2)},${n2(foot[1])} l${n2(lw * 0.5)},0.6`, '#e8dcc0', 0.4)
    } else {
      s += vol(a, smooth([[foot[0] - lw * 0.7, foot[1] - 2.4 * k], [foot[0] + lw * 0.8, foot[1] - 2.4 * k], [foot[0] + lw * 0.95, foot[1] + 0.8], [foot[0] - lw * 0.85, foot[1] + 0.8]], true, 0.4), { hi: '#5a4a3a', base: '#2a2018', lo: '#060504' }, 0.5)
    }
    return s
  }
  pivots.legFar = [shoulder[0] + 3 * k, shoulder[1]]
  pivots.legFar2 = [hip[0] + 3 * k, hip[1]]
  pivots.legNear = shoulder
  pivots.legNear2 = hip
  layers.push(['legFar', legDraw([shoulder[0] + 3 * k, shoulder[1] - 1], true, 3 * k, far(t))])
  layers.push(['legFar2', legDraw([hip[0] + 3 * k, hip[1] - 1], false, -4 * k, far(t))])

  // корпус
  const bodyD = smooth(
    [
      [cx - L * 0.5, by - Hb * 0.25],
      [cx - L * 0.38, by - Hb * 0.55],
      [cx - L * 0.05, by - Hb * 0.48],
      [cx + L * 0.25, by - Hb * 0.6],
      [cx + L * 0.46, by - Hb * 0.3],
      [cx + L * 0.5, by + Hb * 0.15],
      [cx + L * 0.36, by + Hb * 0.45],
      [cx, by + Hb * 0.5],
      [cx - L * 0.36, by + Hb * 0.45],
      [cx - L * 0.52, by + Hb * 0.15],
    ],
    true,
  )
  let body = vol(a, bodyD, t, 0.8)
  if (sp.belly) body += tint(smooth([[cx - L * 0.36, by + Hb * 0.3], [cx + L * 0.36, by + Hb * 0.3], [cx + L * 0.3, by + Hb * 0.47], [cx - L * 0.3, by + Hb * 0.44]], true), sp.belly.base, 0.7)
  body += tint(smooth([[cx - L * 0.3, by - Hb * 0.45], [cx + L * 0.2, by - Hb * 0.5], [cx + L * 0.1, by - Hb * 0.3], [cx - L * 0.3, by - Hb * 0.25]], true), t.hi, 0.35)
  // мускулатура плеча и бедра
  body += line(`M${n2(shoulder[0] - 4 * k)},${n2(by - Hb * 0.3)} C${n2(shoulder[0] - 6 * k)},${n2(by)} ${n2(shoulder[0] - 3 * k)},${n2(by + Hb * 0.3)} ${n2(shoulder[0] + 1 * k)},${n2(by + Hb * 0.42)}`, t.lo, 0.6 * k, 0.55)
  body += line(`M${n2(hip[0] + 5 * k)},${n2(by - Hb * 0.4)} C${n2(hip[0] + 8 * k)},${n2(by - Hb * 0.1)} ${n2(hip[0] + 6 * k)},${n2(by + Hb * 0.2)} ${n2(hip[0] + 2 * k)},${n2(by + Hb * 0.42)}`, t.lo, 0.6 * k, 0.55)
  if (sp.species === 'mammoth' || sp.species === 'bear')
    for (let i = 0; i < 9; i++) body += line(`M${n2(cx - L * 0.4 + i * L * 0.1)},${n2(by + Hb * 0.25)} l${n2(-1 * k)},${n2(Hb * 0.3)}`, t.lo, 0.7 * k, 0.6)
  if (sp.mane && (sp.species === 'horse' || sp.species === 'wolf'))
    body += vol(a, smooth([[cx + L * 0.2, by - Hb * 0.55], [cx + L * 0.38, by - Hb * 0.75], [cx + L * 0.45, by - Hb * 0.35], [cx + L * 0.3, by - Hb * 0.3]], true), sp.mane, 0.5)
  if (sp.barding) {
    const bd = sp.barding
    const d = smooth([[cx - L * 0.32, by - Hb * 0.5], [cx + L * 0.32, by - Hb * 0.56], [cx + L * 0.4, by + Hb * 0.2], [cx + L * 0.3, by + Hb * 0.42], [cx - L * 0.32, by + Hb * 0.4], [cx - L * 0.42, by + Hb * 0.1]], true)
    body += vol(a, d, bd.tone, 0.6)
    if (bd.trim) body += line(`M${n2(cx - L * 0.4)},${n2(by + Hb * 0.25)} C${n2(cx - L * 0.1)},${n2(by + Hb * 0.4)} ${n2(cx + L * 0.2)},${n2(by + Hb * 0.38)} ${n2(cx + L * 0.38)},${n2(by + Hb * 0.25)}`, bd.trim, 1.2 * k)
  }
  body += shade(a, smooth([[cx - L * 0.4, by + Hb * 0.2], [cx + L * 0.4, by + Hb * 0.2], [cx + L * 0.4, by + Hb * 0.5], [cx - L * 0.4, by + Hb * 0.5]], true), 0.3)
  if (sp.fire) body += glow(a, cx, by, L * 0.6, sp.fire, 0.18)
  layers.push(['root', body])

  // всадник
  let icon = { x: 0, y: 0, r: 0 }
  if (sp.rider) {
    const parts = humanoidParts(a, sp.rider, { seat: [cx + L * 0.02, by - Hb * 0.6], bare: true })
    for (const [bone, s] of parts.layers) layers.push([bone === 'head' || bone === 'legFar' || bone === 'legNear' ? 'root' : bone, s])
    pivots.armFar = parts.pivots.armFar!
    pivots.armNear = parts.pivots.armNear!
    if (parts.pivots.wingFar) pivots.wingFar = parts.pivots.wingFar
    if (parts.pivots.wingNear) pivots.wingNear = parts.pivots.wingNear
    icon = parts.head
  }

  // ближние ноги
  layers.push(['legNear2', legDraw([hip[0], hip[1]], false, -3 * k, t)])
  layers.push(['legNear', legDraw([shoulder[0], shoulder[1]], true, 4 * k, t)])

  // торс кентавра или шея с головой
  if (sp.centaur) {
    const parts = humanoidParts(a, { ...sp.centaur, height: (sp.centaur.height ?? 1) * k }, { seat: [cx + L * 0.4, by - Hb * 0.25], bare: true, legless: true })
    for (const [bone, s] of parts.layers) if (bone !== 'legFar' && bone !== 'legNear') layers.push([bone === 'head' ? 'head' : bone, s])
    pivots.armFar = parts.pivots.armFar!
    pivots.armNear = parts.pivots.armNear!
    pivots.head = parts.pivots.head!
    icon = parts.head
  } else {
    const heads = sp.heads ?? 1
    const nb: Pt = [cx + L * 0.4, by - Hb * 0.3]
    pivots.head = nb
    let s = ''
    const hs = B.head * k
    for (let i = heads - 1; i >= 0; i--) {
      // многоголовые: длинные шеи веером, чтобы головы не слипались
      const spread = heads === 1 ? 0 : (i - (heads - 1) / 2) * (heads > 3 ? 24 : 36)
      const ang = ((B.neckA - (heads > 3 ? 20 : 8) + spread) * Math.PI) / 180
      const neckL = B.neckL * (heads > 3 ? 2.6 : heads > 1 ? 1.5 : 1)
      const ne: Pt = [nb[0] + Math.cos(ang) * neckL * k, nb[1] + Math.sin(ang) * neckL * k]
      const tone = i === 0 || heads === 1 ? t : far(t)
      s += vol(a, limbPath([[nb[0] - 3 * k, nb[1] + 2 * k, B.neckW * k * 1.15], [...lerp(nb, ne, 0.6), B.neckW * k * 0.9], [ne[0], ne[1], B.neckW * k * 0.75]]), tone, 0.6)
      if (sp.species === 'horse' && sp.mane) s += vol(a, limbPath([[nb[0] - 4 * k, nb[1] - 4 * k, 3 * k], [ne[0] - 3 * k, ne[1] - 3 * k, 2.4 * k]]), sp.mane, 0.5)
      s += beastHead(a, { ...sp, tone }, ne[0] - hs * 0.2, ne[1] - hs * 0.1, heads > 3 ? hs * 0.7 : heads > 1 ? hs * 0.85 : hs, sp.eyes)
      if (i === 0 && !sp.rider) icon = { x: ne[0] + hs * 0.4, y: ne[1], r: hs * 0.8 }
    }
    if (sp.fire) s += glow(a, nb[0] + 6 * k, nb[1] - 8 * k, 10 * k, sp.fire, 0.35)
    layers.push(['head', s])
  }
  if (sp.extra?.front) layers.push(['root', sp.extra.front])

  const size = Math.max(30, icon.r * 5)
  return {
    rig: a.rig({ motion: sp.motion, attack: sp.attack, pivots }, layers),
    iconViewBox: `${n2(icon.x - size * 0.5)} ${n2(icon.y - size * 0.45)} ${n2(size)} ${n2(size)}`,
  }
}

/** Паук: брюшко, головогрудь, восемь ног (по две на кость), глаза и хелицеры */
export function spider(sp: { id: string; tone: Tone; mark?: string; eyes: string; motion: Motion; attack: Attack }): UnitSource {
  const a = new Art(sp.id)
  const t = sp.tone
  const layers: [Bone, string][] = []
  const pivots: Partial<Record<Bone, Pt>> = {}
  const cy = 66
  layers.push(['root', groundShadow(a, 50, 30, 94)])
  const legPair = (base: Pt, spread: number, tone: Tone, dirX: number) => {
    let s = ''
    for (const d of [0, 1]) {
      const knee: Pt = [base[0] + dirX * (10 + d * 4) + spread, base[1] - 14 + d * 3]
      const foot: Pt = [base[0] + dirX * (16 + d * 8) + spread, 91]
      s += vol(a, limbPath([[base[0], base[1], 3.4], [knee[0], knee[1], 2.6], [...lerp(knee, foot, 0.5), 1.8], [foot[0], foot[1], 1]]), tone, 0.5)
      s += line(`M${knee.map(n2)} l0.6,-1.4 M${lerp(knee, foot, 0.5).map(n2)} l1,-1`, tone.hi, 0.4, 0.6)
    }
    return s
  }
  const farT: Tone = { ...t, hi: t.base, base: mix(t.base, t.lo, 0.4) }
  pivots.legFar = [56, cy]
  pivots.legFar2 = [50, cy]
  pivots.legNear = [58, cy + 2]
  pivots.legNear2 = [52, cy + 2]
  layers.push(['legFar', legPair([58, cy - 2], 2, farT, 1)])
  layers.push(['legFar2', legPair([50, cy - 2], -2, farT, -1)])
  // брюшко
  const abd = smooth([[22, cy - 4], [28, cy - 18], [42, cy - 20], [50, cy - 10], [48, cy + 4], [36, cy + 8], [24, cy + 4]], true)
  let body = vol(a, abd, t, 0.8) + `<path d="${abd}" fill="${a.tex('leather')}"/>`
  if (sp.mark) body += fill(smooth([[32, cy - 14], [38, cy - 16], [40, cy - 8], [34, cy - 4], [30, cy - 8]], true), sp.mark, 0)
  body += fill('M22,' + (cy - 2) + ' l-3,1 l3,1 Z', t.lo, 0.3)
  // головогрудь
  const ceph = smooth([[48, cy - 6], [56, cy - 12], [66, cy - 10], [70, cy - 2], [66, cy + 4], [54, cy + 4]], true)
  body += vol(a, ceph, t, 0.8)
  layers.push(['root', body])
  layers.push(['legNear2', legPair([52, cy + 1], -1, t, -1)])
  layers.push(['legNear', legPair([60, cy + 1], 1, t, 1)])
  // голова: глаза и хелицеры
  pivots.head = [62, cy - 4]
  let h = ''
  for (const [x, y, r] of [[66, cy - 8, 1.2], [68.4, cy - 7, 1], [64, cy - 9, 0.8], [69.6, cy - 5.4, 0.8]] as const) h += eye(a, x, y, r, sp.eyes)
  for (const dx of [0, 3]) {
    const d = `M${n2(68 + dx * 0.4)},${n2(cy + 1)} q${n2(3 + dx * 0.3)},2 ${n2(2)},${n2(6)}`
    h += line(d, INK, 2.4) + line(d, t.hi, 1.2)
  }
  layers.push(['head', h])
  return { rig: a.rig({ motion: sp.motion, attack: sp.attack, pivots }, layers), iconViewBox: `46 ${cy - 22} 30 30` }
}

export { spec }
