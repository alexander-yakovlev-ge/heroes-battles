import { C, bone, eye, shadow, shape, skull, stroke, svg, tint } from './kit.js'

const GOLD = '#c9a24a'

/** Лич: маг-скелет в мантии, посох с зелёной сферой */
export const lich = svg(
  shadow(50, 20) +
    // посох в дальней руке
    stroke([[34, 22], [36, 92]], 2.4, C.woodDark, 2) +
    shape('M30,16 C30,10 38,10 38,16 L36,22 L32,22 Z', C.boneShade, 1.2) +
    `<circle cx="34" cy="13" r="6" fill="${C.glow}" opacity="0.3"/>` +
    `<circle cx="34" cy="13" r="3.4" fill="${C.glowSoft}" stroke="${C.ink}" stroke-width="1"/>` +
    bone([[44, 38], [38, 44], [35, 42]], 2.8, C.boneShade) +
    // мантия
    shape('M40,34 C44,28 58,28 62,34 L68,88 C64,92 36,92 32,88 Z', C.purple) +
    tint('M40,36 C42,32 46,30 49,30 L44,90 L33,88 Z', C.purpleDark, 0.75) +
    `<path d="M51,32 L50,90" stroke="${GOLD}" stroke-width="2" opacity="0.9"/>` +
    shape('M32,86 C40,90 60,90 68,86 L69,90 C60,94 40,94 31,90 Z', GOLD, 1.1) +
    // пояс с черепком
    shape('M39,56 L63,56 L63,60 L39,60 Z', C.clothDark, 1) +
    `<circle cx="51" cy="58" r="2.4" fill="${C.bone}" stroke="${C.ink}" stroke-width="0.8"/>` +
    // капюшон
    shape('M41,30 C38,14 50,6 60,10 C68,13 68,24 64,32 L58,26 C54,20 47,22 46,30 Z', C.purpleDark) +
    skull(55, 21, 8) +
    // корона
    shape('M47,12 L49,6 L52,11 L55,4 L58,11 L61,6 L62,13 C57,11 52,11 47,12 Z', GOLD, 1.1) +
    // ближняя рука колдует
    bone([[58, 38], [66, 46], [74, 42]], 3) +
    `<circle cx="80" cy="40" r="7" fill="${C.glow}" opacity="0.25"/>` +
    `<path d="M76,40 C78,34 84,34 86,38 C84,36 80,37 80,40 C80,44 84,45 86,42 C84,47 76,46 76,40 Z" fill="${C.glow}" stroke="#2a5a54" stroke-width="0.8"/>` +
    eye(80.5, 40, 1),
)
