/**
 * Драконы и большие птицы с ригом: крылья (wingFar/wingNear), шея с головой (head),
 * хвост (tail), лапы (legFar/legNear). Смотрят вправо.
 */
import type { Attack, Motion } from '../types.js'
import { Art, INK, type Bone, type Pt, type Tone, eye, fill, glow, groundShadow, lerp, limbPath, line, mix, shade, smooth, spec, tint, vol } from '../kit.js'
import type { UnitSource } from './humanoid.js'

const n2 = (v: number) => Math.round(v * 100) / 100
const far = (x: Tone): Tone => ({ ...x, hi: x.base, base: mix(x.base, x.lo, 0.38) })

export interface DragonSpec {
  id: string
  tone: Tone
  belly: Tone
  wing: Tone
  horn: Tone
  eyes: string
  /** Цвет дыхания (огонь, яд, тень); без него — пасть закрыта */
  breath?: string
  aura?: { color: string; strength?: number }
  /** Стоит на земле (магмовый дракон) — крылья сложены, motion walk */
  grounded?: boolean
  spikes?: boolean
  motion: Motion
  attack: Attack
}

/** Перепончатое крыло: плечевая кость, пальцы веером, фестоны */
function membraneWing(a: Art, root: Pt, span: number, t: Tone, wingT: Tone, folded: boolean): string {
  const [x, y] = root
  const k = span
  const wrist: Pt = folded ? [x - 6 * k, y - 18 * k] : [x - 6 * k, y - 30 * k]
  const tips: Pt[] = folded
    ? [[x - 18 * k, y - 20 * k], [x - 22 * k, y - 8 * k], [x - 16 * k, y + 2 * k]]
    : [[x - 32 * k, y - 36 * k], [x - 36 * k, y - 16 * k], [x - 22 * k, y - 2 * k]]
  const pts = [wrist, ...tips]
  let edge = `M${n2(x)},${n2(y)} L${wrist.map(n2)} L${tips[0]!.map(n2)}`
  for (let i = 1; i < tips.length; i++) {
    const p0 = tips[i - 1]!
    const p1 = tips[i]!
    edge += ` Q${n2((p0[0] + p1[0]) / 2 + (x - (p0[0] + p1[0]) / 2) * 0.35)},${n2((p0[1] + p1[1]) / 2 + (y - (p0[1] + p1[1]) / 2) * 0.35)} ${p1.map(n2)}`
  }
  edge += ` Q${n2((tips[2]![0] + x) / 2)},${n2((tips[2]![1] + y) / 2 + 2 * k)} ${n2(x - 4 * k)},${n2(y + 2 * k)} Z`
  let s = fill(edge, a.lin(`wm${n2(x)}${n2(y)}${folded ? 'f' : ''}`, wrist, [x, y], [[0, wingT.hi, 0.95], [0.6, wingT.base, 0.95], [1, wingT.lo, 0.95]]), 0.6)
  for (const tp of tips) s += line(`M${wrist.map(n2)} Q${n2((wrist[0] + tp[0]) / 2 + 2)},${n2((wrist[1] + tp[1]) / 2 + 2)} ${tp.map(n2)}`, wingT.lo, 0.35, 0.6)
  s += vol(a, limbPath([[x, y, 3.6 * k], [...lerp([x, y], wrist, 0.5), 2.6 * k], [wrist[0], wrist[1], 2.2 * k]]), t, 0.6)
  for (const tp of pts.slice(1)) s += vol(a, limbPath([[wrist[0], wrist[1], 1.8 * k], [tp[0], tp[1], 0.7 * k]]), t, 0.5)
  return s
}

export function dragon(sp: DragonSpec): UnitSource {
  const a = new Art(sp.id)
  const t = sp.tone
  const layers: [Bone, string][] = []
  const pivots: Partial<Record<Bone, Pt>> = {}
  const lift = sp.grounded ? 0 : 8
  const by = 56 - lift

  let back = groundShadow(a, 50, 28, 94)
  if (sp.aura) back += glow(a, 50, by - 6, 46, sp.aura.color, sp.aura.strength ?? 0.25)
  layers.push(['root', back])

  // дальнее крыло
  const wf: Pt = [46, by - 10]
  pivots.wingFar = wf
  layers.push(['wingFar', membraneWing(a, wf, 0.95, far(t), far(sp.wing), !!sp.grounded)])

  // хвост
  const tb: Pt = [30, by + 2]
  pivots.tail = tb
  const tailPts: [number, number, number][] = [[tb[0] + 2, tb[1], 10], [tb[0] - 8, tb[1] + 10, 7], [tb[0] - 18, tb[1] + 12, 4.6], [tb[0] - 26, tb[1] + 4, 2.8], [tb[0] - 30, tb[1] - 6, 1.4]]
  let tail = vol(a, limbPath(tailPts), t, 0.7) + `<path d="${limbPath(tailPts)}" fill="${a.tex('scale')}"/>`
  tail += line(smooth(tailPts.slice(0, 4).map(([x, y, w]) => [x + w * 0.1, y + w * 0.4] as Pt)), sp.belly.base, 2, 0.7)
  tail += vol(a, smooth([[tb[0] - 30, tb[1] - 6], [tb[0] - 36, tb[1] - 12], [tb[0] - 30, tb[1] - 14], [tb[0] - 27, tb[1] - 9]], true), sp.horn, 0.5)
  layers.push(['tail', tail])

  // дальние лапы
  const leg = (top: Pt, foot: Pt, w: number, tone: Tone) => {
    const knee: Pt = [lerp(top, foot, 0.5)[0] + 3, lerp(top, foot, 0.5)[1]]
    let s = vol(a, limbPath([[top[0], top[1], w * 1.6], [knee[0], knee[1], w], [foot[0], foot[1], w * 0.7]]), tone, 0.6)
    for (const [dx, dy] of [[-2, 3], [1.4, 3.6], [3.6, 2]] as const) {
      const d = `M${foot.map(n2)} q${n2(dx * 0.6)},${n2(dy * 0.3)} ${n2(dx)},${n2(dy)}`
      s += line(d, INK, 1.4) + line(d, sp.horn.hi, 0.7)
    }
    return s
  }
  const legGround = sp.grounded ? 90 : 82
  pivots.legFar = [60, by + 4]
  layers.push(['legFar', leg([60, by + 4], [64, legGround], 4.6, far(t)) + leg([38, by + 6], [36, legGround], 5, far(t))])

  // тело
  const bodyD = smooth([[28, by + 4], [34, by - 6], [46, by - 12], [60, by - 12], [70, by - 4], [70, by + 8], [60, by + 14], [44, by + 14], [32, by + 12]], true)
  let body = vol(a, bodyD, t, 0.8) + `<path d="${bodyD}" fill="${a.tex('scale')}"/>`
  const bellyD = smooth([[34, by + 10], [46, by + 12.6], [60, by + 12], [68, by + 6], [66, by + 11], [58, by + 15], [44, by + 15.4], [34, by + 13]], true)
  body += vol(a, bellyD, sp.belly, 0.5)
  for (let i = 0; i < 7; i++) body += line(`M${n2(37 + i * 4.6)},${n2(by + 12.4 + Math.sin(i * 0.6) * 0.8)} l0.5,2.4`, sp.belly.lo, 0.45, 0.8)
  if (sp.spikes !== false) for (let i = 0; i < 6; i++) {
    const x = 34 + i * 6
    const y = by - 7 - Math.sin((i / 5) * Math.PI) * 5
    body += fill(`M${n2(x - 1.6)},${n2(y + 1)} L${n2(x - 0.6)},${n2(y - 3.6)} L${n2(x + 1.6)},${n2(y + 0.8)} Z`, a.sph(sp.horn), 0.4)
  }
  body += shade(a, smooth([[36, by + 6], [66, by + 4], [66, by + 14], [36, by + 14]], true), 0.3)
  layers.push(['root', body])

  // ближние лапы
  pivots.legNear = [62, by + 6]
  layers.push(['legNear', leg([42, by + 8], [42, legGround + 1], 5.6, t) + leg([62, by + 6], [68, legGround + 1], 5, t)])

  // шея и голова
  const nb: Pt = [64, by - 4]
  pivots.head = nb
  const ne: Pt = [78, by - 32]
  let h = vol(a, limbPath([[nb[0], nb[1], 13], [70, by - 18, 9.6], [ne[0], ne[1], 8]]), t, 0.7)
  h += line(`M${n2(nb[0] + 4)},${n2(nb[1] + 4)} C${n2(72)},${n2(by - 14)} ${n2(76)},${n2(by - 24)} ${n2(ne[0] + 3)},${n2(ne[1] + 4)}`, sp.belly.base, 3, 0.75)
  for (let i = 0; i < 4; i++) h += line(`M${n2(66 + i * 3.2)},${n2(by - 4 - i * 6.6)} l2.6,1`, sp.belly.lo, 0.45, 0.8)
  const hx = ne[0] - 2
  const hy = ne[1] - 4
  const H = (dx: number, dy: number): Pt => [hx + dx, hy + dy]
  // рога
  h += vol(a, smooth([H(0, -2), H(-8, -10), H(-12, -12), H(-6, -6), H(2, 1)], true), sp.horn, 0.5)
  h += vol(a, smooth([H(4, -3), H(0, -12), H(1, -14), H(6, -4)], true), sp.horn, 0.5)
  // голова: длинная морда
  const headD = smooth([H(-3, 3), H(-1, -3), H(6, -5), H(14, -3), H(21, 0), H(22, 2.4), H(16, 3.6), H(21, 5.6), H(17, 8), H(8, 8), H(1, 7)], true)
  h += vol(a, headD, t, 0.8)
  h += fill(smooth([H(9, 4.4), H(21, 3.4), H(17, 6.6), H(10, 6.6)], true), '#1a080a', 0.4)
  h += line(`M${H(10, 4.4).map(n2)} l0.6,1.6 M${H(12.6, 4.2).map(n2)} l0.5,1.6 M${H(15.2, 3.9).map(n2)} l0.4,1.4 M${H(17.6, 3.6).map(n2)} l0.3,1.2`, '#f4ecd8', 0.6)
  h += tint(smooth([H(1, -1), H(6, -4), H(12, -3.4), H(6, -2)], true), t.hi, 0.6)
  h += fill(smooth([H(6, -1.6), H(9.4, -2), H(10, 0.2), H(7, 0.6)], true), '#0a0608', 0)
  h += eye(a, hx + 8.2, hy - 0.8, 0.9, sp.eyes)
  h += line(`M${H(5.4, -2.6).map(n2)} C${H(7.6, -3.6).map(n2)} ${H(10, -3.4).map(n2)} ${H(12, -2).map(n2)}`, t.lo, 0.7)
  h += fill(`M${H(19.6, -0.6).map(n2)} l1.4,0.6 l-1.2,0.8 Z`, '#0a0608', 0)
  if (sp.breath) {
    h += glow(a, hx + 26, hy + 8, 14, sp.breath, 0.55)
    h += fill(smooth([H(18, 5), H(26, 3), H(34, 6), H(30, 9), H(36, 12), H(26, 12), H(20, 8)], true), a.rad(`br${sp.id}`, H(22, 7), 14, [[0, '#ffffff'], [0.3, mix(sp.breath, '#ffffff', 0.6)], [0.8, sp.breath], [1, sp.breath, 0]]), 0)
  }
  h += spec(a, hx + 3, hy - 3, 0.7, 0.7)
  layers.push(['head', h])

  // ближнее крыло
  const wn: Pt = [52, by - 8]
  pivots.wingNear = wn
  layers.push(['wingNear', membraneWing(a, [wn[0] + 6, wn[1] - 2], 1.0, t, sp.wing, !!sp.grounded)])

  return { rig: a.rig({ motion: sp.motion, attack: sp.attack, pivots }, layers), iconViewBox: `${n2(hx - 10)} ${n2(hy - 16)} 34 34` }
}

export interface BirdSpec {
  id: string
  tone: Tone
  wing: Tone
  beak: Tone
  eyes?: string
  /** Огненная (феникс) или грозовая (громовая птица) аура */
  fire?: string
  lightning?: string
  crest?: Tone
  motion: Motion
  attack: Attack
  scale?: number
}

/** Большая птица: феникс, громовая птица, рух */
export function bird(sp: BirdSpec): UnitSource {
  const a = new Art(sp.id)
  const t = sp.tone
  const layers: [Bone, string][] = []
  const pivots: Partial<Record<Bone, Pt>> = {}
  const k = sp.scale ?? 1
  const cx = 48
  const by = 52
  let back = groundShadow(a, cx, 22, 94)
  if (sp.fire) back += glow(a, cx, by - 6, 46, sp.fire, 0.35)
  if (sp.lightning) back += glow(a, cx, by - 6, 44, sp.lightning, 0.25)
  layers.push(['root', back])

  const wingD = (x: number, y: number, s: number) =>
    smooth([[x, y], [x - 4 * s, y - 16 * s], [x + 2 * s, y - 32 * s], [x + 12 * s, y - 44 * s], [x + 14 * s, y - 36 * s], [x + 20 * s, y - 38 * s], [x + 18 * s, y - 28 * s], [x + 22 * s, y - 24 * s], [x + 16 * s, y - 16 * s], [x + 18 * s, y - 10 * s], [x + 10 * s, y - 4 * s]], true)
  const wingDraw = (x: number, y: number, s: number, tone: Tone) => {
    let w = vol(a, wingD(x, y, s), tone, 0.6)
    for (let i = 0; i < 6; i++) w += line(`M${n2(x + 2 * s)},${n2(y - 6 * s - i * 5 * s)} C${n2(x + 8 * s)},${n2(y - 10 * s - i * 5 * s)} ${n2(x + 14 * s)},${n2(y - 12 * s - i * 5 * s)} ${n2(x + 18 * s)},${n2(y - 12 * s - i * 4.6 * s)}`, tone.lo, 0.6, 0.55)
    if (sp.fire) w += `<path d="${wingD(x, y, s)}" fill="${a.halo(sp.fire, 0.5)}"/>`
    return w
  }
  pivots.wingFar = [cx - 2, by - 8]
  layers.push(['wingFar', wingDraw(cx - 2, by - 8, 0.95 * k, far(sp.wing))])

  // хвост — длинные перья
  pivots.tail = [cx - 12 * k, by + 4]
  let tail = ''
  for (let i = 0; i < 4; i++) {
    const pts: [number, number, number][] = [[cx - 10 * k, by + 4, 4], [cx - 22 * k, by + 10 + i * 3, 3], [cx - 34 * k, by + 16 + i * 5, 1.4]]
    tail += vol(a, limbPath(pts), i % 2 ? sp.wing : t, 0.5)
  }
  if (sp.fire) tail += glow(a, cx - 30 * k, by + 20, 10, sp.fire, 0.6)
  layers.push(['tail', tail])

  // лапы
  const legD = (x: number, tone: Tone) => {
    let s = vol(a, limbPath([[x, by + 10, 4.4 * k], [x + 1, by + 24 * k, 2.4 * k], [x + 2, 88, 1.8 * k]]), sp.beak, 0.5)
    for (const [dx, dy] of [[-3, 3], [2, 3.6], [4.4, 2]] as const) {
      const d = `M${n2(x + 2)},88 q${n2(dx * 0.5)},${n2(dy * 0.4)} ${n2(dx)},${n2(dy)}`
      s += line(d, INK, 1.4) + line(d, mix(sp.beak.base, '#ffffff', 0.3), 0.7)
    }
    void tone
    return s
  }
  pivots.legFar = [cx - 4, by + 10]
  layers.push(['legFar', legD(cx - 4, far(t))])

  // тело
  const bodyD = smooth([[cx - 14 * k, by + 4], [cx - 8 * k, by - 8], [cx + 6 * k, by - 12], [cx + 16 * k, by - 6], [cx + 16 * k, by + 8], [cx + 6 * k, by + 16], [cx - 8 * k, by + 14]], true)
  let body = vol(a, bodyD, t, 0.8)
  for (let i = 0; i < 4; i++) body += line(`M${n2(cx - 6 + i * 5)},${n2(by - 6 + i * 2)} q2,3 0,6`, t.lo, 0.5, 0.5)
  if (sp.fire) body += `<path d="${bodyD}" fill="${a.halo('#ffe080', 0.5)}"/>`
  layers.push(['root', body])
  pivots.legNear = [cx + 4, by + 10]
  layers.push(['legNear', legD(cx + 4, t)])

  // шея и голова
  const nb: Pt = [cx + 12 * k, by - 6]
  pivots.head = nb
  const hx = cx + 22 * k
  const hy = by - 24 * k
  const H = (dx: number, dy: number): Pt => [hx + dx * k, hy + dy * k]
  let h = vol(a, limbPath([[nb[0], nb[1], 11 * k], [hx - 2 * k, hy + 6 * k, 7 * k]]), t, 0.6)
  if (sp.crest) h += vol(a, smooth([H(-4, -2), H(-10, -12), H(-4, -8), H(-6, -16), H(0, -8), H(2, -14), H(4, -5)], true), sp.crest, 0.5)
  h += vol(a, smooth([H(-6, 2), H(-4, -5), H(3, -6), H(7, -2), H(6, 4), H(0, 7), H(-5, 6)], true), t, 0.7)
  h += vol(a, smooth([H(5, -3), H(11, -2), H(14, 2), H(12, 5), H(11, 2), H(6, 2)], true), sp.beak, 0.5)
  h += line(`M${H(6, 1).map(n2)} C${H(9, 1.4).map(n2)} ${H(11, 1.6).map(n2)} ${H(12, 3.6).map(n2)}`, mix(sp.beak.lo, INK, 0.4), 0.5)
  h += sp.eyes ? eye(a, hx + 2.6 * k, hy - 1.8 * k, 0.8 * k, sp.eyes) : `<circle cx="${n2(hx + 2.6 * k)}" cy="${n2(hy - 1.8 * k)}" r="${n2(0.9 * k)}" fill="#1a1008"/><circle cx="${n2(hx + 2.9 * k)}" cy="${n2(hy - 2.1 * k)}" r="${n2(0.3 * k)}" fill="#fff"/>`
  if (sp.lightning) h += line(`M${H(-2, -10).map(n2)} l3,4 l-3,1 l4,5`, sp.lightning, 0.8)
  layers.push(['head', h])

  pivots.wingNear = [cx + 2, by - 6]
  let wn = wingDraw(cx + 2, by - 6, 1.05 * k, sp.wing)
  if (sp.lightning) wn += line(`M${n2(cx + 12)},${n2(by - 40)} l-4,8 l5,-1 l-5,10`, sp.lightning, 1.1) + glow(a, cx + 10, by - 32, 8, sp.lightning, 0.6)
  layers.push(['wingNear', wn])

  return { rig: a.rig({ motion: sp.motion, attack: sp.attack, pivots }, layers), iconViewBox: `${n2(hx - 14)} ${n2(hy - 15)} 30 30` }
}
