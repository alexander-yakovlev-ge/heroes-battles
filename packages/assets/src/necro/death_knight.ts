import { C, bone, eye, shadow, shape, skull, stroke, svg, tint } from './kit.js'

const ARMOR = '#3b3f4c'
const ARMOR_LIGHT = '#6a7184'
const ARMOR_DARK = '#22252e'

/** Рыцарь смерти: всадник в чёрных латах на скелете коня, крупный юнит 2×2 */
export const deathKnight = svg(
  shadow(50, 34) +
    // фигура чуть уменьшена, чтобы поднятый меч и рога не выходили за спрайт
    `<g transform="translate(5 9) scale(0.9)">` +
    // дальние ноги коня
    bone([[34, 64], [28, 76], [22, 90]], 3, C.boneShade) +
    bone([[66, 62], [74, 74], [80, 88]], 3, C.boneShade) +
    // туловище коня: рёбра под попоной
    shape('M24,50 C26,42 40,40 54,41 C66,42 72,46 72,54 C72,62 64,66 52,66 C40,66 26,64 24,58 Z', C.bone) +
    `<path d="M34,48 C36,56 36,60 34,64 M40,47 C42,55 42,60 40,65 M46,46 C48,55 48,60 46,66 M52,46 C54,55 54,60 52,66" fill="none" stroke="${C.boneDark}" stroke-width="1.6"/>` +
    // попона
    shape('M30,44 C40,40 56,40 66,44 L64,56 L60,52 L56,58 L52,52 L48,58 L44,52 L40,58 L36,52 L32,56 Z', C.purple) +
    tint('M30,44 C38,41 46,40 52,40 L44,52 L40,58 L36,52 L32,56 Z', C.purpleDark, 0.6) +
    // хвост
    `<path d="M24,50 C16,48 10,54 8,62 C14,58 18,58 22,60" fill="none" stroke="${C.glow}" stroke-width="2.2" stroke-linecap="round" opacity="0.8"/>` +
    // ближние ноги коня
    bone([[38, 64], [40, 77], [36, 90]], 3.4) +
    bone([[62, 62], [68, 72], [66, 86]], 3.4) +
    shape('M32,89 L39,89 L39,92 L31,92 Z', C.ink, 1) +
    shape('M62,85 L69,85 L69,89 L62,89 Z', C.ink, 1) +
    // шея и череп коня
    bone([[66, 46], [74, 36], [78, 30]], 5) +
    shape('M74,22 C78,18 86,20 90,26 L94,32 C94,35 92,36 89,35 L82,34 C78,33 74,30 74,26 Z', C.bone) +
    tint('M75,26 C76,21 80,20 84,21 C80,24 79,28 80,33 C77,32 75,29 75,26 Z', C.boneShade, 0.7) +
    `<ellipse cx="82" cy="26" rx="2.4" ry="2" fill="${C.ink}"/>` +
    eye(82.4, 26, 1) +
    `<path d="M86,33.5 h7 M88,31 v3 M91,31 v3" stroke="${C.ink}" stroke-width="0.8"/>` +
    // грива — зелёное пламя
    `<path d="M70,38 C68,32 72,28 70,22 C74,26 76,24 76,20 C78,24 78,28 76,32" fill="${C.glow}" stroke="#2a5a54" stroke-width="0.9" opacity="0.85"/>` +
    // всадник: нога
    stroke([[50, 46], [52, 56], [48, 62]], 5, ARMOR, 2.2) +
    shape('M44,60 L51,60 L51,64 L44,64 Z', ARMOR_DARK, 1.1) +
    // торс
    shape('M42,22 C46,18 56,18 58,22 L58,44 C54,48 46,48 42,44 Z', ARMOR) +
    tint('M43,24 C45,21 48,20 50,20 L48,46 L43,44 Z', ARMOR_LIGHT, 0.5) +
    shape('M40,20 C40,16 46,15 48,18 L46,24 L40,24 Z', ARMOR_LIGHT, 1.2) +
    // плащ
    shape('M42,22 C34,26 28,34 26,44 C30,42 33,43 35,45 C37,40 40,34 44,30 Z', C.clothDark, 1.2) +
    // шлем с рогами
    shape('M45,12 C45,5 55,3 58,9 L59,16 C57,19 49,20 46,17 Z', ARMOR) +
    `<path d="M50,11 L58,11" stroke="${C.ink}" stroke-width="1.8"/>` +
    eye(55, 11, 0.9) +
    shape('M46,9 C42,6 40,2 41,-1 C44,2 46,4 48,6 Z', C.bone, 1.1) +
    // меч поднят
    stroke([[56, 28], [64, 26], [68, 20]], 4.4, ARMOR, 2.2) +
    shape('M66,22 L70,18 L95,-4 L97,-2 L74,22 Z', C.metal, 1.2) +
    `<path d="M70,19 L94,-2" stroke="${C.metalLight}" stroke-width="0.8"/>` +
    stroke([[64, 17], [73, 24]], 2, ARMOR_DARK, 1.4) +
    `</g>`,
)
