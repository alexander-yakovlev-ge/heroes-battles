import { C, eye, shadow, shape, stroke, svg, tint } from './kit.js'

const SKIN = '#a99bb0'
const SKIN_DARK = '#7a6b84'
const STITCH = '#2a2230'

/** Мерзость: сшитый из плоти великан с тесаком и крюком, крупный юнит 2×2 */
const stitches = (d: string) =>
  `<path d="${d}" fill="none" stroke="${STITCH}" stroke-width="1.2" stroke-linecap="round" stroke-dasharray="1.5 2"/>`

export const abomination = svg(
  shadow(50, 34) +
    // дальняя рука с крюком на цепи
    stroke([[32, 40], [22, 52], [20, 64]], 9, SKIN_DARK, 2.6) +
    stroke([[20, 64], [20, 74]], 1.4, C.metalDark, 1) +
    `<path d="M20,74 C14,74 12,80 16,84 C19,86 23,84 22,80" fill="none" stroke="${C.ink}" stroke-width="4.4" stroke-linecap="round"/>` +
    `<path d="M20,74 C14,74 12,80 16,84 C19,86 23,84 22,80" fill="none" stroke="${C.metal}" stroke-width="2.4" stroke-linecap="round"/>` +
    // ноги
    shape('M30,70 L42,70 L42,88 L28,88 Z', SKIN_DARK) +
    shape('M56,70 L70,70 L72,88 L58,88 Z', SKIN) +
    shape('M26,86 L44,86 L44,93 L25,93 Z', C.clothDark, 1.4) +
    shape('M56,86 L75,86 L75,93 L55,93 Z', C.clothDark, 1.4) +
    // раздутое тело
    shape('M26,46 C24,30 36,20 52,20 C68,20 80,30 80,48 C80,64 70,76 52,76 C34,76 26,62 26,46 Z', SKIN) +
    tint('M28,48 C27,32 37,23 50,21 C40,28 36,40 38,58 C40,66 44,72 48,75 C36,73 28,62 28,48 Z', SKIN_DARK, 0.55) +
    stitches('M52,22 C50,34 52,46 50,58 M38,30 C46,36 60,36 70,30 M56,50 C62,54 70,54 76,50') +
    // рана с ядом
    shape('M58,58 C62,56 68,58 68,62 C66,66 60,66 58,62 Z', C.rotDark, 1.2) +
    `<path d="M62,64 C62,68 61,70 62,73 M65,64 C66,67 66,69 65,71" stroke="${C.glow}" stroke-width="1.6" stroke-linecap="round"/>` +
    // пояс
    shape('M30,64 C40,70 64,70 76,62 L77,66 C64,74 40,74 29,68 Z', C.wood, 1.2) +
    // маленькая голова
    shape('M50,12 C50,5 58,2 63,6 C67,9 67,15 64,19 C60,22 53,21 51,18 Z', SKIN) +
    stitches('M52,9 C56,11 60,10 64,8') +
    `<path d="M58,17 L65,16" stroke="${C.ink}" stroke-width="1.4"/>` +
    `<path d="M59,17 l0.8,1.6 l0.8,-1.6 M62,16.6 l0.8,1.6 l0.8,-1.6" fill="#fff" stroke="${C.ink}" stroke-width="0.5"/>` +
    eye(61, 11.5, 1.1) +
    // ближняя рука с тесаком
    stroke([[72, 34], [82, 44], [86, 54]], 10, SKIN, 2.6) +
    stitches('M76,38 L80,36') +
    stroke([[86, 54], [86, 46]], 3, C.woodDark, 1.6) +
    shape('M84,30 L98,30 L98,47 L86,47 C84,44 83,36 84,30 Z', C.metal, 1.4) +
    tint('M86,32 L97,32 L97,36 L86,36 Z', C.metalLight, 0.6) +
    tint('M88,40 l3,0 l-1,6 l-2,0 Z', C.blood, 0.8),
)
