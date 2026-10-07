import { Art, type Tone, C, INK, T, boneHand, fill, glow, groundShadow, limbPath, line, skull, smooth, tatters, tint, vol, shade, spec } from './kit.js'

const a = new Art('llord')

const ROBE = { hi: '#7e6aa8', base: '#4a3d66', lo: '#120e1e', tex: 'cloth' } satisfies Tone
const ROBE_FAR = { hi: '#5e4e80', base: '#2c2440', lo: '#08060e', tex: 'cloth' } satisfies Tone
const GOLD = T.gold

/** Языки зелёного пламени */
const flame = (x: number, y: number, s: number, key: string) =>
  glow(a, x, y, 10 * s, C.glow, 0.6) +
  fill(smooth([[x - 3.4 * s, y + 1.4 * s], [x - 3 * s, y - 3 * s], [x - 1.2 * s, y - 2 * s], [x - 0.4 * s, y - 7 * s], [x + 1.4 * s, y - 3 * s], [x + 3 * s, y - 5 * s], [x + 3.6 * s, y + 0.6 * s], [x + 0.2 * s, y + 3.4 * s]], true), a.rad(key, [x, y], 6 * s, [[0, '#ffffff'], [0.3, C.glowSoft], [0.75, C.glow], [1, C.glowDeep]]), 0)

/** Наплечник: золотая пластина с гравировкой и черепом */
const pauldron = (x: number, y: number, flip: number) =>
  vol(a, smooth([[x - 6.4 * flip, y + 3], [x - 5 * flip, y - 3], [x, y - 5], [x + 5.4 * flip, y - 2.4], [x + 6 * flip, y + 3], [x, y + 4.6]], true), GOLD, 0.7) +
  line(`M${x - 4.6 * flip},${y + 1.4} C${x - 2 * flip},${y - 2} ${x + 2 * flip},${y - 2} ${x + 4.6 * flip},${y + 1.2}`, GOLD.lo, 0.6, 0.8) +
  line(`M${x - 4 * flip},${y - 1.6} C${x - 1.6 * flip},${y - 4} ${x + 1.4 * flip},${y - 4} ${x + 4 * flip},${y - 1.8}`, GOLD.hi, 0.5, 0.8)

/** Повелитель личей: парящий архимаг в богатой мантии, посох с черепом, корона-рога, аура смерти */
export const lichLord = a.rig(
  { motion: 'float', attack: 'cast', pivots: { armFar: [40, 32], armNear: [62, 32], head: [52, 24] } },
  [
    ['root',
    groundShadow(a, 50, 22) +
      // аура
      glow(a, 52, 42, 44, C.glow, 0.16) +
      `<circle cx="52" cy="42" r="30" fill="none" stroke="${C.glow}" stroke-width="0.5" stroke-dasharray="1 2.4" opacity="0.6"/>` +
      `<circle cx="52" cy="42" r="34" fill="none" stroke="${C.glow}" stroke-width="0.3" opacity="0.35"/>`],
    ['armFar',
      // посох: тёмное древко в серебряных кольцах, череп-навершие в пламени
      vol(a, limbPath([[27.6, 16, 2.6], [28, 40, 2.4], [28.6, 64, 2.2], [29.4, 88, 2]]), { hi: '#5a4a5e', base: '#2a2030', lo: '#080508' }, 0.6) +
      [24, 46, 68].map((y) => fill(`M26,${y} h4.4 v2 h-4.4 Z`, a.cyl(T.metal, 90), 0.4)).join('') +
      flame(27.4, 5, 0.85, 'sflame') +
      skull(a, 26.6, 10.6, 3.6, { tone: T.boneOld }) +
      line('M23.4,15.6 C22,18 23,20 25.4,20.4 M31.4,15.6 C33,18 32,20 29.6,20.4', INK, 1.4) +
      line('M23.4,15.6 C22,18 23,20 25.4,20.4 M31.4,15.6 C33,18 32,20 29.6,20.4', GOLD.base, 0.7) +
      // дальний рукав и кисть на посохе
      vol(a, limbPath([[40, 32, 7], [34.6, 38, 7.4], [31.4, 41, 7.6]]), ROBE_FAR, 0.7) +
      line('M30,37.4 C31.6,40.6 32.6,42.4 33,44.6', GOLD.base, 0.9, 0.9) +
      boneHand(a, 29.4, 41.6, 200, 1, T.boneFar, -80)],
    ['root',
      // мантия: парит, подол истаивает дымкой
      vol(a, smooth([[38, 29], [52, 25.4], [66, 29], [70, 44], [74, 60], [78, 74], ...tatters(78, 28, 76, 6, 6, 4.1).slice(1), [30, 70], [34, 52], [36, 38]], true), ROBE, 0.8) +
      fill(smooth([[30, 74], [40, 79], [52, 81], [64, 80], [77, 76], [70, 86], [56, 90], [44, 90], [34, 84]], true), a.lin('mist', [52, 76], [52, 92], [[0, ROBE.base, 0.35], [1, ROBE.base, 0]]), 0) +
      line('M40,40 C38,52 35,64 32,76 M46,38 C45,52 43,66 41,80 M60,40 C62,54 65,66 68,80 M66,44 C68,56 71,66 74,76', ROBE.lo, 1.1, 0.55) +
      line('M42,40 C40,52 38,64 35.4,77 M62,42 C64,54 66.4,66 70,79', ROBE.hi, 0.7, 0.45) +
      tint(smooth([[37, 34], [44, 28], [42, 50], [38, 66], [31, 74], [33, 56]], true), ROBE.lo, 0.35) +
      // центральная золотая полоса с рунами
      vol(a, smooth([[49.6, 28], [55, 28], [56, 50], [57, 80], [50, 81], [49, 50]], true), { ...GOLD, base: '#b08a3a' }, 0.5) +
      [36, 46, 56, 66].map((y, i) => line(`M${51.4 + i * 0.2},${y} l2.4,0 M${52.6 + i * 0.2},${y - 1.6} l0,3.2`, GOLD.lo, 0.5, 0.9)).join('') +
      [41, 51, 61, 71].map((y, i) => `<circle cx="${52.8 + i * 0.25}" cy="${y}" r="0.9" fill="${C.glow}" stroke="${INK}" stroke-width="0.3"/>`).join('') +
      // пояс с черепами
      fill(smooth([[36.6, 50], [52, 52.4], [68.4, 50], [68.8, 54], [52, 56.4], [36.4, 54]], true), a.cyl({ hi: '#5a4a5e', base: '#2a2030', lo: '#080508' }, 90), 0.5) +
      skull(a, 44, 52.6, 1.8, { eyeColor: null, tone: T.boneOld }) +
      skull(a, 60, 52.6, 1.8, { eyeColor: null, tone: T.boneOld }) +
      // высокий воротник
      fill(smooth([[40, 28], [39, 16], [42, 10], [46, 20], [52, 24], [58, 20], [63, 10.6], [66, 17], [64.6, 28], [52, 30]], true), a.sph(ROBE_FAR), 0.7) +
      tint(smooth([[41.6, 14], [44.4, 18], [47, 23], [43, 24]], true), ROBE.hi, 0.35) +
      line('M40.6,27 C40,20 40.6,14 42,10.6 M64.4,27 C65,21 64.6,15 63,10.8', GOLD.base, 0.8, 0.9) +
      spec(a, 50.6, 30, 0.5, 0.8)],
    ['head',
      // голова: череп в рогатой короне
      skull(a, 52, 17, 5) +
      fill(smooth([[45, 13], [52, 10], [59.4, 11.6], [59.6, 13.6], [52, 12.4], [45.4, 15.4]], true), a.cyl(GOLD, 90), 0.5) +
      fill(smooth([[46.6, 12.4], [43, 6], [42.4, 0.6], [46, 5], [49.4, 11]], true), a.sph(GOLD), 0.5) +
      fill(smooth([[56.6, 10.8], [59, 4.6], [62.6, 0.6], [61.4, 5.4], [59.4, 11.4]], true), a.sph(GOLD), 0.5) +
      fill('M50,11 L51.4,6.4 L52.8,10.6 Z', a.sph(GOLD), 0.4) +
      `<circle cx="51.6" cy="10.8" r="0.9" fill="${C.glow}" stroke="${INK}" stroke-width="0.3"/>` +
      flame(51.4, 4.6, 0.4, 'cflame') +
      spec(a, 45.4, 4, 0.4, 0.9)],
    ['root',
      // наплечники
      pauldron(39, 30, 1) +
      pauldron(65, 30, -1) +
      skull(a, 64.4, 29.2, 2, { jaw: false, eyeColor: null, tone: T.boneOld }) +
      spec(a, 37.6, 27.6, 0.8, 0.85) +
      spec(a, 63.6, 27.4, 0.8, 0.85)],
    ['armNear',
      // ближний рукав и рука с пламенем
      vol(a, smooth([[62, 32], [68, 34], [74, 40], [78, 46], [72, 49], [67, 46], [63, 40]], true), ROBE, 0.7) +
      line('M72,49 C74,48 76.4,47 78,46', GOLD.base, 1.1, 0.9) +
      line('M65,36 C68,40 70.6,44 72,48', ROBE.lo, 0.8, 0.6) +
      vol(a, limbPath([[75.6, 45.6, 2.2], [79.6, 42.6, 1.8]]), T.bone, 0.5) +
      boneHand(a, 80.6, 41.6, -40, 1.1, T.bone, -40) +
      flame(87, 34.6, 1, 'hflame')],
  ],
)
