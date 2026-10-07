import { Art, C, INK, T, type Pt, type Tone, bone, eye, fill, glow, groundShadow, line, ribcage, smooth, spine, tatters, tint, vol, shade, spec } from './kit.js'

const a = new Art('bdrag')

const MEMBRANE = (id: string) =>
  a.lin(id, [40, 0], [40, 44], [[0, '#7a68a0', 0.7], [1, '#3a2c56', 0.6]])

/** Крыло-скелет: плечо, запястье, пальцы; между ними — рваная перепонка с дырами */
function wing(shoulder: Pt, wrist: Pt, tips: Pt[], root: Pt, t: Tone, key: string, seed: number): string {
  const ring: Pt[] = [shoulder, wrist]
  const pts = [...tips, root]
  for (let i = 0; i < pts.length; i++) {
    const from = i === 0 ? wrist : pts[i - 1]!
    const to = pts[i]!
    if (i > 0) {
      // рваный край между пальцами
      const mid = tatters(from[0], to[0], 0, 3, 2, seed + i)
      mid.forEach(([x, dy], j) => {
        const f = j / (mid.length - 1)
        const y = from[1] + (to[1] - from[1]) * f
        const mx = x + (shoulder[0] - x) * 0.18 * Math.sin(f * Math.PI)
        const my = y + (shoulder[1] - y) * 0.18 * Math.sin(f * Math.PI) + dy * 0.6
        if (j > 0 && j < mid.length - 1) ring.push([mx, my])
      })
    }
    ring.push(to)
  }
  let s = fill(smooth(ring, true, 0.4), MEMBRANE(key), 0.5)
  s += bone(a, shoulder, wrist, 1.9, t)
  for (const tip of tips) s += bone(a, wrist, tip, 1.1, t)
  return s + fill(`M${wrist[0]},${wrist[1] - 1} l-0.4,-3.4 l1.8,2.8 Z`, a.sph(t), 0.4)
}

/** Костяной дракон: скелет с рваными перепонками, в груди горит сердце нежити */
export const boneDragon = a.rig(
  { motion: 'fly', attack: 'bite', pivots: { wingFar: [44, 42], wingNear: [52, 43], tail: [32, 54], legFar: [42, 58], legNear: [56, 56], head: [62, 44] } },
  [
    ['root',
    groundShadow(a, 50, 26)],
    ['wingFar',
      // дальнее крыло
      wing([44, 42], [28, 14], [[6, 6], [6, 24], [16, 34]], [36, 46], T.boneFar, 'mfar', 1.3)],
    ['tail',
      // хвост — позвонки с шипами, костяной наконечник
      spine(a, [[32, 54], [24, 62], [16, 64], [9, 58], [6, 50]], 1.8, T.boneOld) +
      [[24, 60.6], [18.6, 62.4], [13, 61], [8.6, 55]].map(([x, y]) => fill(`M${x! - 0.8},${y!} l0,-2.6 l1.6,2.2 Z`, a.sph(T.boneOld), 0.35)).join('') +
      fill('M6.4,51 L2.4,43 L6,45.6 L8,40.6 L9.2,48.6 Z', a.sph(T.bone), 0.6)],
    ['legFar',
      // дальние лапы
      bone(a, [42, 58], [38, 68], 2, T.boneFar) +
      bone(a, [38, 68], [42, 77], 1.6, T.boneFar) +
      line('M42,77 l-2.4,2.6 M42,77 l0.4,3.6 M42,77 l3,2.4', INK, 1.2) +
      line('M42,77 l-2.4,2.6 M42,77 l0.4,3.6 M42,77 l3,2.4', T.boneFar.base, 0.55)],
    ['root',
      // хребет, рёбра, таз
      spine(a, [[30, 52], [40, 46], [52, 45], [62, 43]], 2.2) +
      `<g transform="translate(40 46) scale(1 1.25) translate(-40 -46)">${ribcage(a, 40, 46, 58, 22)}</g>` +
      // сердце нежити в грудной клетке
      glow(a, 52, 54, 10, C.glow, 0.8) +
      `<circle cx="52" cy="54" r="2.6" fill="${a.rad('heart', [51.4, 53.4], 3, [[0, '#ffffff'], [0.4, C.glowSoft], [1, C.glow]])}"/>` +
      vol(a, smooth([[29.4, 51], [32.4, 48.4], [36, 49], [36.6, 52.6], [33.6, 55.6], [30.4, 54.6]], true), T.bone, 0.6) +
      fill('M33,52 a1,1 0 1,0 0.01,0 Z', '#120d0a', 0)],
    ['legNear',
      // ближняя лапа
      bone(a, [56, 56], [59, 67], 2.4) +
      bone(a, [59, 67], [62.6, 77], 1.9) +
      line('M62.6,77 l-1.4,3.6 M62.6,77 l1.4,3.4 M62.6,77 l3.6,1.8', INK, 1.4) +
      line('M62.6,77 l-1.4,3.6 M62.6,77 l1.4,3.4 M62.6,77 l3.6,1.8', T.bone.hi, 0.6)],
    ['root',
      vol(a, smooth([[54, 47], [59.6, 46], [61, 52], [57, 56], [54, 53]], true), T.boneOld, 0.6)],
    ['head',
      // шея — S-образная цепочка позвонков
      spine(a, [[62, 44], [67, 38], [70, 32], [73, 26]], 2.4) +
      [[64.4, 41.4], [68.4, 35.4], [71.4, 29.4]].map(([x, y]) => fill(`M${x! - 0.8},${y!} l-1.6,-2 l2.6,0.8 Z`, a.sph(T.bone), 0.35)).join('') +
      // череп: длинная морда, глазница, ноздря, частокол зубов, рога назад
      fill(smooth([[73.4, 22.4], [66, 15.4], [60, 9], [67.4, 12.6], [76.4, 18.6]], true), a.sph(T.boneOld), 0.6) +
      vol(a, smooth([[84, 25.4], [95.6, 26.2], [95, 28.4], [87, 29.4], [82, 28]], true), { ...T.bone, hi: T.bone.base, base: T.bone.lo }, 0.6) +
      vol(a, smooth([[70.6, 22], [73.4, 16.4], [79, 14], [85, 15.4], [91.4, 18], [97.4, 21.2], [97.4, 23.4], [93, 24.6], [86, 25], [79, 25.4], [74, 25]], true), T.bone, 0.8) +
      tint(smooth([[73, 19.4], [77, 15.6], [83, 15.4], [78, 17.6], [75, 21.6]], true), T.bone.hi, 0.75) +
      fill(smooth([[78.4, 17.6], [82.6, 17], [83.6, 20.2], [80.6, 22], [78, 20.4]], true), a.rad('dsock', [80.8, 19.6], 3, [[0, '#000000'], [0.65, '#140c0a'], [1, T.bone.lo]]), 0.4) +
      eye(a, 80.8, 19.6, 0.95) +
      fill(smooth([[86, 20.6], [90, 20.6], [89, 22.6], [86.4, 22.6]], true), '#120d0a', 0) +
      fill('M93.4,19.6 l1.6,0.4 l-0.6,1.2 Z', '#120d0a', 0) +
      line('M84.6,25 L97,23.4', INK, 0.5) +
      line(Array.from({ length: 7 }, (_, i) => `M${85 + i * 1.7},${24.9 - i * 0.2} l0.3,1.6`).join(' '), '#f6f0e0', 0.55) +
      line(Array.from({ length: 6 }, (_, i) => `M${85.6 + i * 1.7},${27.4 - i * 0.1} l0.2,-1.4`).join(' '), '#f6f0e0', 0.5) +
      line('M77,24 C79,22.6 82,22.4 84.6,23.6', T.bone.lo, 0.5, 0.8) +
      fill(smooth([[77, 15.4], [72.6, 8], [68.4, 2.4], [74.4, 6], [80.6, 14.4]], true), a.sph(T.bone), 0.6) +
      line('M73,8.2 l1.2,-1 M75,10.8 l1.4,-1', T.bone.lo, 0.45) +
      spec(a, 78, 16.4, 0.6, 0.7) +
      spec(a, 71, 6, 0.4, 0.8) +
      shade(a, smooth([[74, 25], [86, 25], [86, 29], [74, 29]], true), 0.4)],
    ['wingNear',
      // ближнее крыло
      wing([52, 43], [56, 10], [[72, 1], [70, 15], [64, 27]], [58, 45], T.bone, 'mnear', 2.7)],
  ],
)
