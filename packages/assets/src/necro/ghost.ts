import { Art, C, T, boneHand, eye, fill, glow, groundShadow, line, skull, smooth, tatters, tint } from './kit.js'

const a = new Art('ghost')

const EDGE = '#3c9c86'
const G = T.ghost

/** Саван тает книзу: от плотного у плеч к прозрачному хвосту */
const shroud = a.lin('body', [62, 14], [34, 90], [[0, G.hi, 0.95], [0.35, G.base, 0.8], [0.75, '#5fbfa6', 0.35], [1, G.lo, 0]])
const sleeve = a.lin('sleeve', [62, 36], [86, 50], [[0, G.base, 0.85], [0.8, '#7fd9c2', 0.55], [1, G.lo, 0.1]])
const edge = (d: string, w = 0.7, op = 0.75) => `<path d="${d}" fill="none" stroke="${EDGE}" stroke-width="${w}" stroke-linejoin="round" opacity="${op}"/>`

const bodyD = smooth([[55, 30], [60.4, 30.6], [70, 33], [73, 40], [70.6, 50], [64, 60], [56, 70], [46, 78.6], [36, 85.6], [29.6, 84], [33.6, 80], [40.6, 72], [46, 62], [49.6, 50], [51.4, 38]], true)
const hoodD = smooth([[53.4, 28], [53.6, 19], [57.6, 12.6], [64, 9.6], [70, 10.6], [76.4, 14.6], [78.6, 18.4], [76.4, 22], [76.6, 28], [72.4, 33.6], [64, 34.4], [56.6, 32.4]], true)
const sleeveD = (y: number, len: number, seed: number) =>
  smooth([[60, y - 3.6], [68, y - 3.4], [76, y - 2], [60 + len, y - 1], ...tatters(60 + len, 66, y + 4.4, 3, 2, seed).slice(1), [60, y + 3.6]], true)

/** Призрак: полупрозрачный саван, тающий в дымку, парит над землёй и тянет костлявые руки */
export const ghost = a.rig(
  { motion: 'float', attack: 'claw', pivots: { armFar: [62, 40], armNear: [62, 46], head: [60, 32] } },
  [
    ['root',
    groundShadow(a, 52, 14) +
      glow(a, 60, 40, 34, C.glow, 0.22)],
    ['armFar',
      // дальний рукав и кисть
      `<path d="${sleeveD(41, 20, 3)}" fill="${sleeve}" opacity="0.7"/>` +
      edge(sleeveD(41, 20, 3), 0.6, 0.5) +
      `<g opacity="0.6">${boneHand(a, 79.6, 41.4, 8, 1.5, T.boneFar, 55)}</g>`],
    ['root',
      // тело-саван
      `<path d="${bodyD}" fill="${shroud}"/>` +
      edge(bodyD, 0.8) +
      // складки и струи дымки
      line('M57,36 C55,48 50,60 42,72 M63,38 C62,50 57,62 48,72 M68,40 C67,50 63,58 56,66', '#ffffff', 0.9, 0.35) +
      line('M60,36 C58,48 53,60 45,72 M66,40 C64,52 59,62 52,70', EDGE, 0.6, 0.35) +
      line('M36,84 C30,88 24,86 20,80 M44,78 C40,84 34,90 26,90 M30,84 C26,82 24,78 25,74', G.base, 0.7, 0.4)],
    ['head',
      // капюшон
      `<path d="${hoodD}" fill="${a.sph(G)}" opacity="0.92"/>` +
      edge(hoodD, 0.6, 0.55) +
      line('M56,20 C55,25 55.6,29 57.6,32 M59,15 C57.4,19 57,24 58,28 M62,11.4 C64,13 66,13.4 70,12.8 M71,11.6 C73.4,13.6 75.4,15.6 77.6,18', EDGE, 0.6, 0.45) +
      tint(smooth([[56, 18], [60.6, 12.6], [67, 11.6], [62, 15], [58, 22]], true), '#ffffff', 0.55) +
      // тёмный провал капюшона и лицо-маска
      fill(smooth([[61.6, 16.4], [69, 13.4], [75.4, 17.4], [76.4, 24], [74, 31], [66.4, 32.6], [61.6, 27]], true), a.rad('hollow', [69, 23], 10, [[0, '#0d2a26'], [0.7, '#174a42'], [1, '#2f7f70', 0.6]]), 0) +
      `<g opacity="0.88">${skull(a, 66.4, 20.4, 4.6, { tone: G, open: 0.9 })}</g>` +
      fill(smooth([[61, 15], [66, 13.4], [73, 15.4], [74, 18.6], [68, 17.4], [62, 19]], true), a.lin('hshade', [67, 13], [67, 20], [[0, '#0d2a26', 0.9], [1, '#0d2a26', 0]]), 0)],
    ['armNear',
      // ближний рукав и кисть
      `<path d="${sleeveD(47, 22, 7)}" fill="${sleeve}" opacity="0.9"/>` +
      edge(sleeveD(47, 22, 7), 0.7, 0.8) +
      line('M62,45 C68,45 74,46 80,47', '#ffffff', 0.7, 0.4) +
      `<g opacity="0.85">${boneHand(a, 81.4, 47.6, 14, 1.7, T.bone, 60)}</g>` +
      glow(a, 85, 48.6, 7, C.glow, 0.35)],
  ],
)
