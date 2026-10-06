import { C, eye, shadow, shape, stroke, svg, tint } from './kit.js'

/** Мумия: в бинтах, с золотым амулетом и проклятым взглядом */
const wraps = (d: string) => `<path d="${d}" fill="none" stroke="${C.bandageShade}" stroke-width="1.1" stroke-linecap="round"/>`

export const mummy = svg(
  shadow(50, 20) +
    // дальняя рука
    stroke([[46, 38], [40, 50], [42, 60]], 6, C.bandageShade, 2.4) +
    // ноги
    stroke([[46, 62], [44, 76], [44, 89]], 7, C.bandageShade, 2.4) +
    stroke([[54, 62], [56, 76], [57, 89]], 7, C.bandage, 2.4) +
    wraps('M41,70 l6,2 M41,78 l6,1 M41,84 l6,2 M53,70 l6,2 M53,78 l6,1 M54,84 l6,2') +
    shape('M39,88 L48,88 L48,92 L38,92 Z', C.bandageShade, 1.3) +
    shape('M53,88 L63,88 L63,92 L52,92 Z', C.bandage, 1.3) +
    // торс
    shape('M41,36 C44,31 56,31 60,35 L61,63 C55,66 46,66 40,63 Z', C.bandage) +
    tint('M41,38 C42,34 45,33 48,33 L46,64 L40,63 Z', C.bandageShade, 0.7) +
    wraps('M41,41 L60,44 M41,47 L61,50 M40,53 L61,56 M40,59 L61,61 M43,36 L59,39') +
    // амулет
    `<path d="M45,36 L50,44 L56,36" fill="none" stroke="${C.ink}" stroke-width="1"/>` +
    shape('M50,43 l3,3 l-3,4 l-3,-4 Z', '#e2b84a', 1.1) +
    `<circle cx="50" cy="46.5" r="1" fill="${C.glow}"/>` +
    // голова
    shape('M45,22 C44,13 50,9 56,10 C62,11 65,16 64,22 L65,28 C62,33 55,34 50,32 C46,30 45,26 45,22 Z', C.bandage) +
    tint('M46,24 C45,15 50,11 54,10 C50,14 49,20 50,31 C47,29 46,27 46,24 Z', C.bandageShade, 0.7) +
    wraps('M45,17 L64,20 M45,23 L64,25 M46,28 L64,30') +
    `<path d="M55,19 L64,21 L64,24 L55,23 Z" fill="${C.ink}"/>` +
    eye(60, 22, 1.1) +
    // ближняя рука вытянута вперёд, свисающий бинт
    stroke([[56, 38], [66, 44], [77, 44]], 6, C.bandage, 2.4) +
    wraps('M62,40 l-1,6 M68,42 l-0.5,5 M73,41 l0,5') +
    shape('M76,41 l6,1 l1,2 l-5,1 l4,2 l-1,1 l-5,-1 Z', C.bandage, 1.2) +
    stroke([[64, 46], [62, 54], [65, 60]], 2, C.bandage, 1.4) +
    stroke([[42, 64], [36, 72], [37, 78]], 2, C.bandageShade, 1.4),
)
