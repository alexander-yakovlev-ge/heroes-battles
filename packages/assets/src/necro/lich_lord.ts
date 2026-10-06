import { C, bone, eye, shadow, shape, skull, stroke, svg, tint } from './kit.js'

const GOLD = '#c9a24a'
const ROBE = '#4a3d66'
const ROBE_DARK = '#2c2440'

/** Повелитель личей: парящий маг в богатой мантии, посох с черепом, крупный юнит 2×2 */
export const lichLord = svg(
  shadow(50, 22) +
    // аура
    `<circle cx="52" cy="40" r="34" fill="${C.glow}" opacity="0.08"/>` +
    `<circle cx="52" cy="40" r="26" fill="none" stroke="${C.glow}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.5"/>` +
    // посох
    stroke([[28, 14], [30, 86]], 3, C.woodDark, 2) +
    skull(28, 10, 6, { jaw: true }) +
    `<path d="M22,4 C24,0 26,2 27,-1 C29,2 31,0 33,3 C34,5 33,6 32,6 L23,6 Z" fill="${C.glow}" opacity="0.8"/>` +
    bone([[40, 36], [33, 40], [30, 38]], 3, C.boneShade) +
    // мантия, рваный низ — парит
    shape('M38,30 C42,22 62,22 66,30 L76,74 L70,70 L66,78 L60,72 L54,80 L48,72 L42,78 L38,70 L30,74 Z', ROBE) +
    tint('M38,32 C40,26 45,23 50,23 L44,72 L42,78 L38,70 L31,73 Z', ROBE_DARK, 0.75) +
    `<path d="M52,26 L52,76" stroke="${GOLD}" stroke-width="2.4"/>` +
    `<path d="M47,38 h10 M46,48 h12 M45,58 h14" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>` +
    // наплечники с черепами
    shape('M34,30 C34,24 44,22 46,28 L44,34 L36,36 Z', GOLD, 1.2) +
    shape('M58,28 C60,22 70,24 70,30 L68,36 L60,34 Z', GOLD, 1.2) +
    skull(66, 27, 3.6, { jaw: false }) +
    // высокий воротник
    shape('M42,24 L46,12 L50,20 L54,20 L58,12 L62,24 Z', ROBE_DARK, 1.3) +
    // голова и корона-рога
    skull(55, 16, 7.5) +
    shape('M48,8 C46,4 47,0 50,-1 C49,3 51,5 52,7 Z', GOLD, 1) +
    shape('M60,7 C62,3 64,1 66,1 C64,4 63,6 62,9 Z', GOLD, 1) +
    `<path d="M50,6 C52,2 54,4 56,0 C57,3 59,3 60,5" fill="none" stroke="${C.glow}" stroke-width="1.6" stroke-linecap="round" opacity="0.9"/>` +
    // ближняя рука с зелёным пламенем
    bone([[64, 36], [74, 44], [82, 40]], 3.2) +
    `<circle cx="88" cy="36" r="8" fill="${C.glow}" opacity="0.25"/>` +
    `<path d="M83,38 C82,32 86,30 86,24 C89,28 92,28 92,32 C94,34 94,40 88,42 C85,42 83,40 83,38 Z" fill="${C.glow}" stroke="#2a5a54" stroke-width="0.9"/>` +
    eye(88, 36, 1.2),
)
