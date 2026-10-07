import { Art, C, INK, type Pt, type Tone, eye, fill, glow, groundShadow, limbPath, line, smooth, tint, vol, shade, spec } from './kit.js'

const a = new Art('wyv')

const BODY = { hi: '#7a68a0', base: '#3a2d52', lo: '#0e0a16', tex: 'scale' } satisfies Tone
const BODY_FAR = { hi: '#5a4a78', base: '#271e38', lo: '#07050c', tex: 'scale' } satisfies Tone
const BELLY = { hi: '#b0a0cc', base: '#6c5a8c', lo: '#2a2040', tex: 'leather' } satisfies Tone
const HORN = { hi: '#d8d0c0', base: '#8a8070', lo: '#2e2820', tex: 'bone' } satisfies Tone
const VENOM = C.venom

/** Крыло: плечевая кость до запястья, пальцы веером, перепонка с фестонами и прожилками */
function wing(shoulder: Pt, wrist: Pt, tips: Pt[], root: Pt, t: Tone, paint: string): string {
  const edge: string[] = []
  const pts = [wrist, ...tips, root]
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!
    const [x1, y1] = pts[i]!
    const mx = (x0 + x1) / 2
    const my = (y0 + y1) / 2
    // фестон прогибается к телу
    const k = i === 1 ? 0 : 0.34
    edge.push(`Q${(mx + (shoulder[0] - mx) * k).toFixed(2)},${(my + (shoulder[1] - my) * k).toFixed(2)} ${x1},${y1}`)
  }
  const membrane = `M${shoulder[0]},${shoulder[1]} L${wrist[0]},${wrist[1]} ${edge.slice(1).join(' ')} Z`
  let s = fill(membrane, paint, 0.7)
  // прожилки
  for (const tip of tips) s += line(`M${wrist[0]},${wrist[1]} Q${((wrist[0] + tip[0]) / 2 + 2).toFixed(2)},${((wrist[1] + tip[1]) / 2 + 2).toFixed(2)} ${tip[0]},${tip[1]}`, t.lo, 0.35, 0.6)
  // кости
  const arm = limbPath([[shoulder[0], shoulder[1], 3.4], [(shoulder[0] + wrist[0]) / 2, (shoulder[1] + wrist[1]) / 2, 2.4], [wrist[0], wrist[1], 2.2]])
  s += vol(a, arm, t, 0.6)
  for (const tip of tips) s += vol(a, limbPath([[wrist[0], wrist[1], 2], [tip[0], tip[1], 0.8]]), t, 0.5)
  s += `<circle cx="${wrist[0]}" cy="${wrist[1]}" r="1.6" fill="${a.sph(t)}" stroke="${INK}" stroke-width="0.5"/>`
  s += fill(`M${wrist[0]},${wrist[1] - 1} l-0.6,-3 l1.8,2.4 Z`, a.sph(HORN), 0.4)
  return s
}

/** Чешуя: ряды полукружий вдоль кривой */
const scales = (p: Pt[], r: number, color: string, op = 0.5) =>
  line(p.map(([x, y]) => `M${x - r},${y} a${r},${r * 0.8} 0 0,0 ${2 * r},0`).join(' '), color, 0.35, op)

/** Лапа: мускулистое бедро, голень, стопа с изогнутыми когтями */
function leg(hip: Pt, knee: Pt, ankle: Pt, w: number, t: Tone): string {
  const [x, y] = ankle
  const talon = (dx: number, dy: number) => {
    const d = `M${x},${y} q${dx * 0.7},${dy * 0.2} ${dx},${dy} q${dx * 0.1},${dy * 0.5} ${dx * -0.2},${dy * 0.9}`
    return line(d, INK, 1.2) + line(d, HORN.hi, 0.55)
  }
  return (
    vol(a, limbPath([[hip[0], hip[1], w * 1.7], [(hip[0] + knee[0]) / 2 + 0.6, (hip[1] + knee[1]) / 2, w * 1.4], [knee[0], knee[1], w * 0.8]]), t, 0.6) +
    vol(a, limbPath([[knee[0], knee[1], w * 0.8], [(knee[0] + x) / 2 - 0.6, (knee[1] + y) / 2, w * 0.6], [x, y, w * 0.5]]), t, 0.6) +
    talon(-1.6, 2.6) + talon(1.2, 3) + talon(3.4, 1.6)
  )
}

/** Теневая виверна: перепончатые крылья, ядовитое жало на хвосте, крупный летающий юнит 2×2 */
export const shadowWyvern = a.rig(
  { motion: 'fly', attack: 'bite', pivots: { wingFar: [46, 40], wingNear: [50, 42], tail: [34, 56], legFar: [39, 57], legNear: [45, 57], head: [58, 46] } },
  [
    ['root',
    groundShadow(a, 50, 24)],
    ['wingFar',
      // дальнее крыло
      wing([46, 40], [30, 14], [[6, 8], [8, 24], [16, 34]], [36, 44], BODY_FAR, a.lin('wfar', [30, 14], [20, 40], [[0, '#3a2c56', 0.95], [1, '#1a1228', 0.95]]))],
    ['tail',
      // хвост с жалом
      vol(a, limbPath([[36, 56, 9], [26, 64, 6.4], [16, 64, 4.4], [9, 57, 3.2], [6.4, 50, 2.4]]), BODY, 0.7) +
      scales([[30, 61], [24, 64], [18, 63.6], [12, 60]], 1.2, BODY.hi, 0.45) +
      line('M34,61 C28,66 20,67.6 13,63', BELLY.base, 0.9, 0.6) +
      fill('M6.4,51 L2,41.6 L5.4,44 L9.4,40.6 L8.6,48 Z', a.sph({ hi: '#e6ffc4', base: VENOM, lo: '#2a5a14' }), 0.6) +
      glow(a, 5, 43, 5, VENOM, 0.5)],
    ['legFar',
      // дальняя лапа
      leg([39, 57], [45, 66], [43, 75], 4.4, BODY_FAR)],
    ['root',
      // тело
      vol(a, smooth([[30, 56], [33, 49], [40, 44], [50, 40], [58, 39.4], [64.6, 43], [66.4, 50], [63, 57], [56, 61], [46, 62], [37, 61.6]], true), BODY, 0.8) +
      vol(a, smooth([[38, 60.4], [46, 60.6], [55, 59], [62, 55], [65.6, 49.6], [64.6, 55.6], [58.4, 60.6], [47, 62.4], [38.6, 62.2]], true), BELLY, 0.5) +
      [[41, 60.6], [45, 60.8], [49, 60.6], [53, 59.8], [57, 58.4], [60.6, 56.2], [63.2, 53]].map(([x, y]) => line(`M${x},${y} l0.6,1.8`, BELLY.lo, 0.45, 0.8)).join('') +
      scales([[38, 46], [43, 43], [48, 42], [53, 42], [58, 44], [40, 51], [45, 49], [50, 48], [55, 48.4], [60, 50]], 1.4, BODY.hi, 0.4) +
      // гребень на хребте
      [[36, 44], [41, 40.6], [46.4, 38.6], [52, 38.4], [57.4, 40]].map(([x, y]) => fill(`M${x! - 1.4},${y! + 0.8} L${x! - 0.6},${y! - 2.8} L${x! + 1.4},${y! + 0.6} Z`, a.sph(HORN), 0.4)).join('') +
      spec(a, 56, 56, 0.9, 0.35) +
      shade(a, smooth([[44, 40], [58, 38], [60, 44], [44, 46]], true), 0.5)],
    ['head',
      // шея
      vol(a, limbPath([[58, 46, 10], [64, 38, 7.4], [69, 31, 6.2], [73.4, 25.4, 5.8]]), BODY, 0.7) +
      line('M60.6,48 C64.6,43 68,37 71.6,30.4', BELLY.base, 2, 0.75) +
      [0, 1, 2, 3].map((i) => line(`M${62.4 + i * 2.4},${45 - i * 4.2} l2.4,0.8`, BELLY.lo, 0.45, 0.8)).join('') +
      scales([[62, 40], [65.6, 35], [69, 30]], 1.2, BODY.hi, 0.4) +
      // голова: длинная морда, рога, пасть с клыками
      vol(a, smooth([[70, 22.6], [73, 17.4], [79, 15], [85, 16.6], [91, 19], [96.6, 21.6], [96, 23.6], [90, 24.4], [95, 26.6], [94, 28.6], [87, 29.4], [80, 29.4], [74, 28]], true), BODY, 0.8) +
      fill(smooth([[84, 24.4], [95.4, 23.4], [94.6, 26.4], [86.6, 27.4]], true), '#1a0a1e', 0.4) +
      line('M86,24.4 l0.6,1.8 M88.4,24.2 l0.5,1.8 M90.8,24 l0.4,1.6 M93,23.8 l0.3,1.4', '#f0ead8', 0.6) +
      line('M87,27 l0.4,-1.4 M90,26.6 l0.3,-1.2', '#f0ead8', 0.55) +
      tint(smooth([[73, 20], [77, 16.6], [83, 16.4], [78, 18.6], [74.6, 22.6]], true), BODY.hi, 0.6) +
      fill(smooth([[80.6, 18.6], [84.4, 18.2], [85, 20.6], [81.6, 21.4]], true), '#0a0610', 0) +
      eye(a, 82.8, 19.8, 0.85, VENOM) +
      line('M80,17.8 C82,16.8 84.6,17 86.6,18.4', BODY.lo, 0.7) +
      fill(smooth([[74.4, 18.4], [68.6, 10], [66.4, 5.4], [70.6, 9.4], [77, 16.6]], true), a.sph(HORN), 0.5) +
      fill(smooth([[78.6, 16], [76, 8.4], [76, 4], [79, 8.6], [81.4, 15.4]], true), a.sph(HORN), 0.5) +
      fill('M93,19.6 l1.6,-1 l0.2,1.6 Z', '#0a0610', 0) +
      // капающий яд
      line('M92,28.8 C92.2,31.4 91.6,33 92,35', VENOM, 1) +
      `<circle cx="92" cy="36" r="0.9" fill="${VENOM}"/>` +
      glow(a, 92, 34, 3.4, VENOM, 0.5) +
      spec(a, 81, 18.4, 0.6, 0.8) +
      spec(a, 68.6, 9.4, 0.4, 0.8)],
    ['legNear',
      // ближняя лапа
      leg([45, 57], [52, 65], [50.6, 75], 5, BODY)],
    ['wingNear',
      // ближнее крыло
      wing([50, 42], [54, 10], [[70, 1], [69, 15], [63, 28]], [56, 44], BODY, a.lin('wnear', [60, 10], [66, 40], [[0, '#4a3a6c', 0.95], [0.6, '#2e2246', 0.95], [1, '#1a1228', 0.95]])) +
      tint(smooth([[55, 14], [66, 5], [67, 15], [60, 26]], true), BELLY.hi, 0.15)],
  ],
)
