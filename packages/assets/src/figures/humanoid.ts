/**
 * Конструктор гуманоида с ригом: пропорции, одежда/доспех, голова, оружие и поза по типу боя,
 * плащ, крылья, хвост. Юнит смотрит вправо, земля — y = 92. Слои раскладываются по костям:
 * root (корпус, плащ), armFar/armNear, legFar/legNear, head, wingFar/wingNear, tail.
 */
import type { Attack, Motion } from '../types.js'
import { Art, C, INK, T, type Bone, type Pt, type RigSource, type Tone, glow, groundShadow, lerp, limbPath, line, mix, shade, smooth, spec, tatters, tint, vol } from '../kit.js'
import { type OffItem, type Weapon, offhand, weapon } from './gear.js'
import { type HeadSpec, head } from './head.js'

export type Outfit = 'tunic' | 'robe' | 'leather' | 'chain' | 'plate' | 'bare' | 'fur' | 'stone' | 'metal' | 'bark'
export type Pose = 'melee' | 'twohand' | 'spear' | 'bow' | 'crossbow' | 'throw' | 'cast' | 'claws'

export interface HumanoidSpec {
  id: string
  /** Рост: 1 — человек, 0.75 — гоблин, 1.15 — огр */
  height?: number
  /** Комплекция (ширина) */
  bulk?: number
  headScale?: number
  skin: Tone
  head: Omit<HeadSpec, 'skin'> & { skin?: Tone }
  torso: { kind: Outfit; tone: Tone; trim?: Tone; belt?: Tone; tabard?: { tone: Tone; emblem?: string }; skirt?: 'short' | 'long' | 'robe'; pauldrons?: Tone }
  legs: { kind: 'pants' | 'bare' | 'plate' | 'snake' | 'smoke' | 'hooves'; tone?: Tone; boots?: Tone }
  arms?: { sleeve?: Tone; gauntlet?: Tone }
  pose: Pose
  weapon?: Weapon
  off?: OffItem
  cape?: Tone
  wings?: { kind: 'feather' | 'bat' | 'insect' | 'fire'; tone: Tone; span?: number }
  tail?: { kind: 'demon' | 'lizard' | 'snake'; tone: Tone }
  aura?: { color: string; strength?: number }
  /** Парит над землёй */
  hover?: number
  /** Глоу в руке при касте */
  castGlow?: string
  motion: Motion
  attack: Attack
  /** Дополнительные слои поверх стандартных */
  extra?: { back?: string; front?: string; torso?: string; head?: string; armNear?: string }
}

export interface UnitSource {
  rig: RigSource
  iconViewBox: string
}

const n2 = (v: number) => Math.round(v * 100) / 100

/** Кисть: кулак (или латная рукавица) */
const fist = (a: Art, x: number, y: number, r: number, t: Tone) =>
  vol(a, smooth([[x - r, y - r * 0.7], [x + r * 0.6, y - r], [x + r * 1.1, y], [x + r * 0.4, y + r], [x - r * 0.9, y + r * 0.7]], true), t, 0.5) +
  line(`M${n2(x)},${n2(y - r * 0.9)} l${n2(r * 0.3)},${n2(r * 0.8)} M${n2(x + r * 0.6)},${n2(y - r * 0.6)} l${n2(r * 0.2)},${n2(r * 0.8)}`, t.lo, 0.3, 0.7)

/** Когти раскрытой кисти */
function claws(a: Art, x: number, y: number, r: number, t: Tone, angle = 0): string {
  let s = vol(a, smooth([[x - r, y - r * 0.8], [x + r * 0.8, y - r], [x + r * 1.2, y], [x + r * 0.5, y + r], [x - r, y + r * 0.7]], true), t, 0.5)
  for (let i = 0; i < 4; i++) {
    const ang = ((angle - 30 + i * 20) * Math.PI) / 180
    const b: Pt = [x + r * 0.8, y + (i - 1.5) * r * 0.45]
    const tip: Pt = [b[0] + Math.cos(ang) * r * 2.2, b[1] + Math.sin(ang) * r * 2.2 + r * 0.6]
    s += line(`M${b.map(n2)} Q${n2(b[0] + Math.cos(ang) * r * 1.4)},${n2(b[1] + Math.sin(ang) * r * 1.4 - r * 0.3)} ${tip.map(n2)}`, INK, r * 0.5) + line(`M${b.map(n2)} Q${n2(b[0] + Math.cos(ang) * r * 1.4)},${n2(b[1] + Math.sin(ang) * r * 1.4 - r * 0.3)} ${tip.map(n2)}`, t.base, r * 0.28)
  }
  return s
}

/** Крыло: перьевое, перепончатое, стрекозиное, огненное. root — плечо, span — размах */
function wing(a: Art, kind: NonNullable<HumanoidSpec['wings']>['kind'], root: Pt, span: number, t: Tone, far: boolean): string {
  const [x, y] = root
  const k = span
  const tt = far ? { ...t, hi: t.base, base: mix(t.base, t.lo, 0.35) } : t
  if (kind === 'feather') {
    const shape = smooth([[x, y], [x - 6 * k, y - 16 * k], [x - 14 * k, y - 26 * k], [x - 22 * k, y - 28 * k], [x - 26 * k, y - 22 * k], [x - 24 * k, y - 12 * k], [x - 26 * k, y - 4 * k], [x - 20 * k, y + 2 * k], [x - 22 * k, y + 10 * k], [x - 14 * k, y + 12 * k], [x - 12 * k, y + 22 * k], [x - 6 * k, y + 14 * k]], true)
    let s = vol(a, shape, tt, 0.6)
    for (let i = 0; i < 6; i++) {
      const fy = y - 20 * k + i * 6 * k
      s += line(`M${n2(x - 4 * k)},${n2(fy + 4 * k)} C${n2(x - 12 * k)},${n2(fy)} ${n2(x - 18 * k)},${n2(fy + 2 * k)} ${n2(x - 24 * k + i * 1.6 * k)},${n2(fy + 6 * k)}`, tt.lo, 0.5, 0.55)
    }
    return s + tint(smooth([[x - 2 * k, y - 4 * k], [x - 10 * k, y - 20 * k], [x - 18 * k, y - 24 * k], [x - 10 * k, y - 12 * k]], true), '#ffffff', far ? 0.15 : 0.35)
  }
  if (kind === 'bat') {
    const tips: Pt[] = [[x - 26 * k, y - 22 * k], [x - 30 * k, y - 4 * k], [x - 22 * k, y + 12 * k]]
    const wrist: Pt = [x - 10 * k, y - 20 * k]
    let edge = `M${n2(x)},${n2(y)} L${wrist.map(n2)} L${tips[0]!.map(n2)}`
    let prev = tips[0]!
    for (const tp of tips.slice(1)) {
      edge += ` Q${n2((prev[0] + tp[0]) / 2 + 3 * k)},${n2((prev[1] + tp[1]) / 2)} ${tp.map(n2)}`
      prev = tp
    }
    edge += ` Q${n2(x - 10 * k)},${n2(y + 6 * k)} ${n2(x)},${n2(y + 6 * k)} Z`
    let s = vol(a, edge, tt, 0.6)
    s += vol(a, limbPath([[x, y, 2 * k], [wrist[0], wrist[1], 1.4 * k]]), tt, 0.4)
    for (const tp of tips) s += line(`M${wrist.map(n2)} L${tp.map(n2)}`, mix(tt.lo, INK, 0.3), 0.9 * k)
    return s
  }
  if (kind === 'insect') {
    return [-30, 10].map((ang) => {
      const r = (ang * Math.PI) / 180
      const ex = x - Math.cos(r) * 12 * k
      const ey = y + Math.sin(r) * 12 * k - 6 * k
      return `<ellipse cx="${n2(ex)}" cy="${n2(ey)}" rx="${n2(10 * k)}" ry="${n2(4.4 * k)}" transform="rotate(${ang - 30} ${n2(ex)} ${n2(ey)})" fill="${a.halo(tt.hi, 0.9)}" stroke="${tt.base}" stroke-width="0.4" opacity="0.8"/>`
    }).join('')
  }
  // огненные крылья
  return glow(a, x - 12 * k, y - 10 * k, 22 * k, '#ff9a2a', 0.45) + vol(a, smooth([[x, y], [x - 8 * k, y - 20 * k], [x - 20 * k, y - 30 * k], [x - 16 * k, y - 18 * k], [x - 28 * k, y - 16 * k], [x - 18 * k, y - 6 * k], [x - 26 * k, y + 4 * k], [x - 10 * k, y + 6 * k]], true), tt, 0.4)
}

/** Посадка гуманоида: в седле (бёдра в точке seat) или стоя на земле */
export interface Placement {
  cx?: number
  /** Точка седла: бёдра всадника; ноги — согнутая ближняя, дальняя скрыта */
  seat?: Pt
  /** Без тени и фона — фигура входит в составной юнит */
  bare?: boolean
  /** Без ног (торс кентавра) */
  legless?: boolean
}

export interface HumanoidParts {
  layers: [Bone, string][]
  pivots: Partial<Record<Bone, Pt>>
  head: { x: number; y: number; r: number }
}

/** Гуманоид с ригом */
export function humanoid(sp: HumanoidSpec): UnitSource {
  const a = new Art(sp.id)
  const { layers, pivots, head: h } = humanoidParts(a, sp)
  const iconSize = Math.max(26, h.r * 5.4)
  return {
    rig: a.rig({ motion: sp.motion, attack: sp.attack, pivots }, layers),
    iconViewBox: `${n2(h.x - iconSize * 0.48)} ${n2(h.y - iconSize * 0.42)} ${n2(iconSize)} ${n2(iconSize)}`,
  }
}

/** Слои гуманоида на заданном холсте (для составных юнитов: всадник, кентавр) */
export function humanoidParts(a: Art, sp: HumanoidSpec, place: Placement = {}): HumanoidParts {
  const H = sp.height ?? 1.08
  const b = sp.bulk ?? 1
  const ground = 92 - (sp.hover ?? 0)
  const cx = place.seat ? place.seat[0] : place.cx ?? 50
  const legLen = 32 * H
  const hipY = place.seat ? place.seat[1] : ground - legLen - H
  const TH = 26 * H
  const sY = hipY - TH
  const hr = 5.6 * H * (sp.headScale ?? 1)
  const hx = cx + 2.6 * H
  const hy = sY - 3 * H - hr * 0.9
  const skin = sp.skin
  const sleeve = sp.arms?.sleeve ?? (sp.torso.kind === 'bare' || sp.torso.kind === 'fur' ? skin : sp.torso.tone)
  const hand = sp.arms?.gauntlet ?? skin
  const legTone = sp.legs.tone ?? (sp.legs.kind === 'bare' ? skin : sp.torso.tone)
  const far = (t: Tone): Tone => ({ ...t, hi: t.base, base: mix(t.base, t.lo, 0.35) })

  const layers: [Bone, string][] = []
  const pivots: Partial<Record<Bone, Pt>> = {}

  // ——— фон: тень, аура, крылья, плащ, хвост ———
  let back = place.bare ? '' : groundShadow(a, cx, 18 * b * H, 94)
  if (sp.aura) back += glow(a, cx, (sY + ground) / 2, 40 * H, sp.aura.color, sp.aura.strength ?? 0.25)
  if (sp.extra?.back) back += sp.extra.back
  layers.push(['root', back])
  const wingRoot: Pt = [cx - 3 * b * H, sY + 9 * H]
  if (sp.wings) {
    const span = (sp.wings.span ?? 1) * H
    layers.push(['wingFar', wing(a, sp.wings.kind, [wingRoot[0] + 3, wingRoot[1] - 1], span * 0.9, sp.wings.tone, true)])
    layers.push(['wingNear', wing(a, sp.wings.kind, wingRoot, span, sp.wings.tone, false)])
    pivots.wingFar = [wingRoot[0] + 3, wingRoot[1] - 1]
    pivots.wingNear = wingRoot
  }
  if (sp.cape) {
    const capeD = smooth([[cx - 1, sY - 1], [cx - 7 * b * H, sY + 2], [cx - 12 * b * H, hipY - 4], [cx - 14 * b * H, ground - 10], ...tatters(cx - 14 * b * H, cx - 2, ground - 6, 4, 4, 2.7).slice(1), [cx - 2, hipY]], true)
    layers.push(['root', vol(a, capeD, sp.cape, 0.7) + line(`M${n2(cx - 5 * b * H)},${n2(sY + 4)} C${n2(cx - 9 * b * H)},${n2(hipY - 6)} ${n2(cx - 11 * b * H)},${n2(ground - 16)} ${n2(cx - 12 * b * H)},${n2(ground - 8)}`, sp.cape.lo, 0.8, 0.6)])
  }
  if (sp.tail && sp.tail.kind !== 'snake') {
    const t = sp.tail.tone
    const tp: Pt = [cx - 3 * b * H, hipY + 1]
    const pts: [number, number, number][] =
      sp.tail.kind === 'demon'
        ? [[tp[0], tp[1], 2.4 * H], [tp[0] - 8 * H, tp[1] + 8 * H, 1.6 * H], [tp[0] - 16 * H, tp[1] + 4 * H, 1.2 * H], [tp[0] - 20 * H, tp[1] - 6 * H, 1 * H]]
        : [[tp[0], tp[1], 7 * H], [tp[0] - 9 * H, tp[1] + 12 * H, 5 * H], [tp[0] - 18 * H, tp[1] + 22 * H, 3 * H], [tp[0] - 26 * H, tp[1] + 24 * H, 1.4 * H]]
    let s = vol(a, limbPath(pts), t, 0.6)
    if (sp.tail.kind === 'demon') {
      const [ex, ey] = pts[3]!
      s += vol(a, smooth([[ex, ey + 1], [ex - 3 * H, ey - 2 * H], [ex - 1 * H, ey - 6 * H], [ex + 2 * H, ey - 2 * H]], true), t, 0.5)
    }
    layers.push(['tail', s])
    pivots.tail = tp
  }

  // ——— позы рук ———
  const fs: Pt = [cx - 5.6 * b * H, sY + 2.6 * H]
  const ns: Pt = [cx + 4.4 * b * H, sY + 3 * H]
  pivots.armFar = fs
  pivots.armNear = ns
  let fe: Pt, fh: Pt, ne: Pt, nh: Pt
  let wAngle = -60
  switch (sp.pose) {
    case 'melee':
      fe = [fs[0] - 1 * H, fs[1] + 10 * H]
      fh = [fs[0] + 3 * H, fs[1] + 17 * H]
      ne = [ns[0] + 5 * H, ns[1] + 9 * H]
      nh = [ns[0] + 12 * H, ns[1] + 7 * H]
      wAngle = -62
      break
    case 'twohand':
      fe = [fs[0] + 6 * H, fs[1] + 10 * H]
      fh = [cx + 7 * H, sY + 15 * H]
      ne = [ns[0] + 3 * H, ns[1] + 10 * H]
      nh = [cx + 10 * H, sY + 13 * H]
      wAngle = -70
      break
    case 'spear':
      ne = [ns[0] + 4 * H, ns[1] + 9 * H]
      nh = [ns[0] + 11 * H, ns[1] + 8 * H]
      wAngle = -28
      fe = [fs[0] + 5 * H, fs[1] + 9 * H]
      fh = [nh[0] - Math.cos((wAngle * Math.PI) / 180) * 9 * H, nh[1] - Math.sin((wAngle * Math.PI) / 180) * 9 * H]
      break
    case 'bow':
      fe = [fs[0] + 8 * H, fs[1] + 1 * H]
      fh = [fs[0] + 17 * H, fs[1] + 0.5 * H]
      ne = [ns[0] - 7 * H, ns[1] + 1 * H]
      nh = [cx + 2 * H, sY - 0.5 * H]
      break
    case 'crossbow':
      fe = [fs[0] + 7 * H, fs[1] + 6 * H]
      fh = [cx + 13 * H, sY + 7 * H]
      ne = [ns[0] + 1 * H, ns[1] + 8 * H]
      nh = [cx + 5 * H, sY + 8.5 * H]
      break
    case 'throw':
      fe = [fs[0] + 8 * H, fs[1] + 4 * H]
      fh = [fs[0] + 16 * H, fs[1] + 3 * H]
      ne = [ns[0] - 4 * H, ns[1] - 8 * H]
      nh = [ns[0] - 2 * H, ns[1] - 16 * H]
      wAngle = -100
      break
    case 'cast':
      fe = [fs[0] - 1 * H, fs[1] + 9 * H]
      fh = [fs[0] + 1 * H, fs[1] + 16 * H]
      ne = [ns[0] + 6 * H, ns[1] + 5 * H]
      nh = [ns[0] + 13 * H, ns[1] + 1 * H]
      wAngle = -90
      break
    case 'claws':
      fe = [fs[0] + 7 * H, fs[1] + 6 * H]
      fh = [fs[0] + 15 * H, fs[1] + 5 * H]
      ne = [ns[0] + 6 * H, ns[1] + 7 * H]
      nh = [ns[0] + 14 * H, ns[1] + 5 * H]
      break
  }
  const armW = 5.9 * b * H
  const arm = (s: Pt, e: Pt, h: Pt, t: Tone, ht: Tone) =>
    vol(a, limbPath([[s[0], s[1], armW], [...lerp(s, e, 0.5), armW * 0.92], [e[0], e[1], armW * 0.78]]), t, 0.6) +
    vol(a, limbPath([[e[0], e[1], armW * 0.78], [...lerp(e, h, 0.45), armW * 0.74], [h[0], h[1], armW * 0.58]]), sp.arms?.gauntlet && t !== skin ? ht : t, 0.6)

  // ——— дальняя рука и предмет в ней ———
  const offIsFront = sp.off && (sp.off.kind === 'bow' || sp.off.kind === 'crossbow')
  {
    let s = arm(fs, fe, fh, far(sleeve), far(hand))
    if (sp.pose === 'claws') s += claws(a, fh[0], fh[1], 1.8 * H, far(hand))
    else s += fist(a, fh[0], fh[1], 2 * H, far(hand))
    if (sp.off && !offIsFront) s += offhand(a, sp.off, fh[0] - 1 * H, fh[1] + (sp.off.kind.startsWith('shield') ? 0 : -2 * H), H)
    if (sp.pose === 'cast' && sp.weapon?.kind === 'staff') s += weapon(a, sp.weapon, fh[0], fh[1], -88, H)
    layers.push(['armFar', s])
  }

  // ——— ноги ———
  const ft: Tone = legTone
  const boots = sp.legs.boots ?? (sp.legs.kind === 'bare' ? skin : { hi: '#7a6450', base: '#3e3024', lo: '#120c08', tex: 'leather' as const })
  const legFarHip: Pt = [cx - 2.6 * b * H, hipY]
  const legNearHip: Pt = [cx + 2.2 * b * H, hipY]
  pivots.legFar = legFarHip
  pivots.legNear = legNearHip
  const legW = 8.2 * b * H
  const leg = (hip: Pt, knee: Pt, ank: Pt, t: Tone, bt: Tone) => {
    let s = vol(a, limbPath([[hip[0], hip[1], legW], [...lerp(hip, knee, 0.5), legW * 0.85], [knee[0], knee[1], legW * 0.66]]), t, 0.6)
    s += vol(a, limbPath([[knee[0], knee[1], legW * 0.64], [...lerp(knee, ank, 0.4), legW * 0.6], [ank[0], ank[1], legW * 0.46]]), t, 0.6)
    if (sp.legs.kind === 'plate') s += `<ellipse cx="${n2(knee[0] + 0.6)}" cy="${n2(knee[1])}" rx="${n2(legW * 0.42)}" ry="${n2(legW * 0.36)}" fill="${a.sph(t)}" stroke="${INK}" stroke-width="0.4"/>`
    if (sp.legs.kind === 'hooves')
      s += vol(a, smooth([[ank[0] - 2 * H, ank[1]], [ank[0] + 2.4 * H, ank[1] - 0.4], [ank[0] + 3 * H, ank[1] + 3.6 * H], [ank[0] - 2.4 * H, ank[1] + 3.6 * H]], true), { hi: '#5a4a3a', base: '#2a2018', lo: '#080604' }, 0.5)
    else
      s += vol(a, smooth([[ank[0] - 2.4 * H, ank[1] - 1.6 * H], [ank[0] + 1.6 * H, ank[1] - 2 * H], [ank[0] + 6 * H, ank[1] + 0.8 * H], [ank[0] + 6 * H, ank[1] + 2.6 * H], [ank[0] - 2.4 * H, ank[1] + 2.6 * H]], true), bt, 0.6)
    return s
  }
  const snake = sp.legs.kind === 'snake'
  const smoke = sp.legs.kind === 'smoke'
  if (snake) {
    const t = ft
    const pts: [number, number, number][] = [
      [cx, hipY - 2, 11 * b * H],
      [cx + 5 * H, hipY + 10 * H, 10 * b * H],
      [cx - 2 * H, ground - 6, 8.4 * b * H],
      [cx - 16 * H, ground - 3, 6 * H],
      [cx - 26 * H, ground - 8, 3.4 * H],
      [cx - 30 * H, ground - 16, 1.4 * H],
    ]
    layers.push(['tail', vol(a, limbPath(pts), t, 0.7) + `<path d="${limbPath(pts)}" fill="${a.tex('scale')}"/>` + line(smooth(pts.slice(0, 4).map(([x, y, w]) => [x + w * 0.2, y + w * 0.38] as Pt)), t.hi, 1.6 * H, 0.5)])
    pivots.tail = [cx, hipY]
  } else if (smoke) {
    const t = ft
    const d = smooth([[cx - 7 * b * H, hipY - 2], [cx + 6 * b * H, hipY - 2], [cx + 6 * H, hipY + 10 * H], [cx - 2 * H, ground - 12], [cx - 14 * H, ground - 4], [cx - 18 * H, ground - 10], [cx - 8 * H, ground - 16], [cx - 6 * H, hipY + 10 * H]], true)
    layers.push(['tail', `<path d="${d}" fill="${a.lin(`smk`, [cx, hipY], [cx - 16, ground], [[0, t.base, 0.95], [0.6, t.hi, 0.6], [1, t.hi, 0]])}"/>` + line(`M${n2(cx - 2)},${n2(hipY + 6)} C${n2(cx - 2)},${n2(ground - 20)} ${n2(cx - 10)},${n2(ground - 10)} ${n2(cx - 16)},${n2(ground - 8)}`, t.hi, 1, 0.4)])
    pivots.tail = [cx, hipY]
  } else if (place.legless) {
    // торс кентавра: ниже пояса — корпус коня
  } else if (place.seat) {
    // в седле: ближняя нога согнута, стопа в стремени; дальняя скрыта корпусом коня
    const knee: Pt = [cx + 7 * H, hipY + 5 * H]
    const ank: Pt = [cx + 5 * H, hipY + 17 * H]
    let s = vol(a, limbPath([[legNearHip[0], legNearHip[1], legW], [...lerp(legNearHip, knee, 0.5), legW * 0.85], [knee[0], knee[1], legW * 0.66]]), ft, 0.6)
    s += vol(a, limbPath([[knee[0], knee[1], legW * 0.64], [ank[0], ank[1], legW * 0.46]]), ft, 0.6)
    s += vol(a, smooth([[ank[0] - 2.4 * H, ank[1] - 1.6 * H], [ank[0] + 1.6 * H, ank[1] - 2 * H], [ank[0] + 6 * H, ank[1] + 0.8 * H], [ank[0] + 6 * H, ank[1] + 2.6 * H], [ank[0] - 2.4 * H, ank[1] + 2.6 * H]], true), boots, 0.6)
    layers.push(['root', s])
  } else {
    layers.push(['legFar', leg(legFarHip, [cx - 4.6 * H, hipY + legLen * 0.5], [cx - 8.6 * H, ground - 2.4 * H], far(ft), far(boots))])
    layers.push(['legNear', leg(legNearHip, [cx + 6.2 * H, hipY + legLen * 0.48], [cx + 6.8 * H, ground - 2.4 * H], ft, boots)])
  }

  // ——— корпус ———
  const hw = 7.2 * b * H
  const torsoD = smooth(
    [
      [cx - 2, sY - 1],
      [cx - hw, sY + 1.4 * H],
      [cx - hw * 1.04, sY + TH * 0.45],
      [cx - hw * 0.84, hipY - 2],
      [cx - hw * 0.9, hipY + 3],
      [cx + 0.6, hipY + 4],
      [cx + hw * 0.84, hipY + 2],
      [cx + hw * 0.92, sY + TH * 0.62],
      [cx + hw * 0.98, sY + TH * 0.24],
      [cx + hw * 0.72, sY + 0.6],
      [cx + 2.4, sY - 1],
    ],
    true,
  )
  const tt = sp.torso.tone
  let torso = ''
  // неск: шея
  torso += vol(a, limbPath([[cx + 0.4, sY + 2, 5 * b * H], [hx - 0.8 * H, hy + hr * 0.8, 4 * b * H]]), skin, 0.6)
  torso += vol(a, torsoD, tt, 0.8)
  const kind = sp.torso.kind
  if (kind === 'plate') {
    for (let i = 1; i <= 3; i++) {
      const y = sY + TH * (0.45 + i * 0.13)
      torso += line(`M${n2(cx - hw * 0.9)},${n2(y)} C${n2(cx - 2)},${n2(y + 1.6)} ${n2(cx + 3)},${n2(y + 1.6)} ${n2(cx + hw * 0.88)},${n2(y - 0.4)}`, tt.lo, 0.7, 0.85)
      torso += line(`M${n2(cx - hw * 0.9)},${n2(y - 0.6)} C${n2(cx - 2)},${n2(y + 1)} ${n2(cx + 3)},${n2(y + 1)} ${n2(cx + hw * 0.88)},${n2(y - 1)}`, tt.hi, 0.4, 0.6)
    }
    torso += line(`M${n2(cx + 1.6)},${n2(sY + 1)} C${n2(cx + 3)},${n2(sY + TH * 0.3)} ${n2(cx + 2.6)},${n2(sY + TH * 0.5)} ${n2(cx + 1.6)},${n2(sY + TH * 0.55)}`, tt.hi, 0.7, 0.7)
    torso += spec(a, cx + hw * 0.4, sY + TH * 0.2, 1.1 * H, 0.75)
  } else if (kind === 'chain') {
    torso += `<path d="${torsoD}" fill="${a.tex('scale')}"/>`
  } else if (kind === 'leather') {
    torso += line(`M${n2(cx - hw * 0.7)},${n2(sY + 2)} L${n2(cx + hw * 0.7)},${n2(hipY - 2)}`, mix(tt.lo, INK, 0.3), 1.6 * H, 0.9)
    torso += line(`M${n2(cx - hw * 0.7)},${n2(sY + 2)} L${n2(cx + hw * 0.7)},${n2(hipY - 2)}`, tt.hi, 0.4, 0.6)
  } else if (kind === 'bare' || kind === 'fur') {
    // мышцы: грудь, пресс
    torso += line(`M${n2(cx - 1)},${n2(sY + TH * 0.32)} C${n2(cx + 2)},${n2(sY + TH * 0.42)} ${n2(cx + hw * 0.6)},${n2(sY + TH * 0.4)} ${n2(cx + hw * 0.9)},${n2(sY + TH * 0.3)}`, tt.lo, 0.8, 0.6)
    torso += line(`M${n2(cx + 2)},${n2(sY + TH * 0.5)} l${n2(3 * H)},0 M${n2(cx + 2)},${n2(sY + TH * 0.62)} l${n2(3 * H)},0 M${n2(cx + 2)},${n2(sY + TH * 0.74)} l${n2(3 * H)},0 M${n2(cx + 3.6 * H)},${n2(sY + TH * 0.45)} l0,${n2(TH * 0.36)}`, tt.lo, 0.5, 0.45)
    if (kind === 'fur') torso += vol(a, smooth([[cx - hw, sY + 1], [cx + hw * 0.8, sY + 0.6], [cx + hw * 0.9, sY + TH * 0.24], [cx - hw * 1.04, sY + TH * 0.36]], true), { hi: '#c8a882', base: '#7a5a3a', lo: '#2a1c10', tex: 'cloth' }, 0.5)
  } else if (kind === 'stone' || kind === 'metal' || kind === 'bark') {
    torso += line(`M${n2(cx - hw * 0.6)},${n2(sY + TH * 0.3)} L${n2(cx + hw * 0.4)},${n2(sY + TH * 0.35)} L${n2(cx + hw * 0.6)},${n2(sY + TH * 0.7)} M${n2(cx - hw * 0.4)},${n2(sY + TH * 0.75)} L${n2(cx + hw * 0.2)},${n2(hipY)}`, tt.lo, 0.8, 0.8)
    if (kind === 'metal') for (const [x, y] of [[cx - hw * 0.5, sY + 3], [cx + hw * 0.5, sY + 3], [cx - hw * 0.5, hipY - 3], [cx + hw * 0.5, hipY - 3]] as const) torso += `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(0.8 * H)}" fill="${a.sph(tt)}" stroke="${INK}" stroke-width="0.3"/>`
  } else {
    // туника/роба: складки
    torso += line(`M${n2(cx - hw * 0.5)},${n2(sY + 4)} C${n2(cx - hw * 0.6)},${n2(sY + TH * 0.5)} ${n2(cx - hw * 0.5)},${n2(hipY - 4)} ${n2(cx - hw * 0.4)},${n2(hipY + 2)} M${n2(cx + hw * 0.4)},${n2(sY + TH * 0.4)} C${n2(cx + hw * 0.5)},${n2(sY + TH * 0.7)} ${n2(cx + hw * 0.4)},${n2(hipY)} ${n2(cx + hw * 0.3)},${n2(hipY + 3)}`, tt.lo, 0.6, 0.6)
  }
  if (sp.torso.tabard) {
    const tb = sp.torso.tabard
    const d = smooth([[cx - hw * 0.45, sY + 1], [cx + hw * 0.55, sY + 0.8], [cx + hw * 0.6, hipY + 10 * H], [cx + 1, hipY + 12 * H], [cx - hw * 0.5, hipY + 10 * H]], true, 0.4)
    torso += vol(a, d, tb.tone, 0.6)
    if (tb.emblem) torso += line(`M${n2(cx + 0.5)},${n2(sY + TH * 0.25)} L${n2(cx + 0.5)},${n2(sY + TH * 0.7)} M${n2(cx - hw * 0.3)},${n2(sY + TH * 0.42)} L${n2(cx + hw * 0.36)},${n2(sY + TH * 0.42)}`, tb.emblem, 1.6 * H, 0.95)
  }
  if (sp.torso.skirt) {
    const long = sp.torso.skirt === 'robe' ? ground - 1 : sp.torso.skirt === 'long' ? hipY + legLen * 0.75 : hipY + legLen * 0.38
    const d = smooth([[cx - hw * 0.92, hipY - 3], [cx + hw * 0.88, hipY - 3], [cx + hw * 1.2, long - 2], ...tatters(cx + hw * 1.2, cx - hw * 1.25, long, 2.4, 4, 1.3).slice(1), [cx - hw * 0.96, hipY + 4]], true)
    torso += vol(a, d, sp.torso.skirt === 'robe' ? tt : mix(tt.base, tt.lo, 0.2) === tt.base ? tt : tt, 0.7)
    torso += line(`M${n2(cx - hw * 0.4)},${n2(hipY + 2)} L${n2(cx - hw * 0.6)},${n2(long - 3)} M${n2(cx + hw * 0.3)},${n2(hipY + 2)} L${n2(cx + hw * 0.5)},${n2(long - 3)}`, tt.lo, 0.7, 0.55)
  }
  if (sp.torso.trim) torso += line(`M${n2(cx - hw * 0.4)},${n2(sY + 0.4)} C${n2(cx)},${n2(sY + 3)} ${n2(cx + 2)},${n2(sY + 3)} ${n2(cx + hw * 0.66)},${n2(sY + 0.6)}`, sp.torso.trim.base, 1.2 * H)
  if (sp.torso.belt) {
    const bt = sp.torso.belt
    const d = smooth([[cx - hw * 0.92, hipY - 4], [cx + hw * 0.86, hipY - 3], [cx + hw * 0.88, hipY - 0.2], [cx - hw * 0.94, hipY - 1]], true, 0.3)
    torso += vol(a, d, bt, 0.5) + vol(a, smooth([[cx + 1, hipY - 4.4], [cx + 3.4, hipY - 4.2], [cx + 3.4, hipY - 0.4], [cx + 1, hipY - 0.6]], true, 0.2), T.gold, 0.4)
  }
  if (sp.torso.pauldrons) {
    const pt = sp.torso.pauldrons
    torso += vol(a, smooth([[cx - hw * 1.3, sY + 4 * H], [cx - hw * 1.1, sY - 1 * H], [cx - hw * 0.3, sY - 1.6 * H], [cx - hw * 0.2, sY + 3 * H]], true), far(pt), 0.6)
  }
  torso += shade(a, smooth([[cx - hw, sY + TH * 0.7], [cx + hw, sY + TH * 0.7], [cx + hw, hipY + 2], [cx - hw, hipY + 2]], true), 0.25)
  if (sp.extra?.torso) torso += sp.extra.torso
  layers.push(['root', torso])

  // ——— голова ———
  pivots.head = [cx + 1, sY]
  layers.push(['head', head(a, hx, hy, hr, { ...sp.head, skin: sp.head.skin ?? skin }) + (sp.extra?.head ?? '')])

  // ——— ближняя рука с оружием ———
  {
    let s = ''
    const wpn = sp.weapon && !(sp.pose === 'cast' && sp.weapon.kind === 'staff') ? sp.weapon : undefined
    // оружие за кистью (двуручное — между руками)
    if (wpn && sp.pose !== 'bow' && sp.pose !== 'crossbow') s += weapon(a, wpn, nh[0], nh[1], wAngle, H)
    if (sp.pose === 'twohand') s += arm(fs, fe, fh, sleeve, hand) + fist(a, fh[0], fh[1], 2 * H, hand)
    s += arm(ns, ne, nh, sleeve, hand)
    if (sp.torso.pauldrons) s += vol(a, smooth([[ns[0] - 4.4 * H, ns[1] + 3 * H], [ns[0] - 3 * H, ns[1] - 3 * H], [ns[0] + 3 * H, ns[1] - 3.4 * H], [ns[0] + 4.4 * H, ns[1] + 2 * H], [ns[0], ns[1] + 4.4 * H]], true), sp.torso.pauldrons, 0.6) + spec(a, ns[0] - 1, ns[1] - 1.6 * H, 0.8 * H, 0.7)
    if (sp.pose === 'claws') s += claws(a, nh[0], nh[1], 2 * H, hand)
    else s += fist(a, nh[0], nh[1], 2.1 * H, hand)
    if (sp.pose === 'cast') s += glow(a, nh[0] + 3 * H, nh[1] - 2 * H, 9 * H, sp.castGlow ?? '#8ad8ff', 0.75) + `<circle cx="${n2(nh[0] + 3 * H)}" cy="${n2(nh[1] - 2 * H)}" r="${n2(1.6 * H)}" fill="#ffffff"/>`
    if (sp.extra?.armNear) s += sp.extra.armNear
    layers.push(['armNear', s])
  }

  // ——— лук/арбалет и стрела — перед корпусом, на дальней руке ———
  if (offIsFront && sp.off) {
    let s = ''
    if (sp.off.kind === 'bow') {
      s += offhand(a, sp.off, fh[0], fh[1], H)
      s += line(`M${n2(nh[0])},${n2(nh[1])} L${n2(fh[0] + 14 * H)},${n2(fh[1] + 0.3)}`, INK, 1.1) + line(`M${n2(nh[0])},${n2(nh[1])} L${n2(fh[0] + 14 * H)},${n2(fh[1] + 0.3)}`, '#c8a878', 0.5)
      s += line(`M${n2(fh[0] - 3 * H)},${n2(fh[1] - 22 * H)} L${n2(nh[0])},${n2(nh[1])} L${n2(fh[0] - 3 * H)},${n2(fh[1] + 22 * H)}`, '#e0d8c4', 0.35, 0.9)
      s += fist(a, fh[0], fh[1], 2 * H, far(hand))
    } else {
      s += offhand(a, sp.off, (fh[0] + nh[0]) / 2, (fh[1] + nh[1]) / 2 - 1, H)
      s += fist(a, fh[0], fh[1], 2 * H, far(hand))
    }
    layers.push(['armFar', s])
  }

  if (sp.extra?.front) layers.push(['root', sp.extra.front])

  return { layers, pivots, head: { x: hx, y: hy, r: hr } }
}

export { C }
