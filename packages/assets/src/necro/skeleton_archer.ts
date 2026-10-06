import { C, bone, foot, pelvis, ribcage, shadow, shape, skull, stroke, svg, tint } from './kit.js'

/** Скелет-лучник: рваный капюшон, костяной лук, колчан за спиной */
export const skeletonArcher = svg(
  shadow(50, 20) +
    // колчан
    shape('M36,30 L44,28 L46,52 L39,54 Z', C.woodDark) +
    stroke([[38, 29], [36, 22]], 1.4, C.bone, 1.2) +
    stroke([[41, 28], [40, 20]], 1.4, C.bone, 1.2) +
    stroke([[43, 28], [44, 21]], 1.4, C.bone, 1.2) +
    `<path d="M35,21 l2,-3 l1,3 Z M39,19 l2,-3 l1,3 Z M43,20 l2,-3 l1,3 Z" fill="${C.purpleLight}" stroke="${C.ink}" stroke-width="0.8"/>` +
    // дальняя рука, держит лук
    bone([[52, 38], [62, 43], [71, 45]], 3.2, C.boneShade) +
    // ноги
    bone([[47, 62], [42, 75], [41, 89]], 3.4, C.boneShade) +
    foot(41, 90, 6) +
    bone([[52, 62], [56, 75], [57, 89]]) +
    foot(57, 90, 7) +
    pelvis(50, 61) +
    ribcage(50, 34, 56, 9) +
    // лук и стрела
    `<path d="M70,22 C80,30 80,60 70,68" fill="none" stroke="${C.ink}" stroke-width="5.2" stroke-linecap="round"/>` +
    `<path d="M70,22 C80,30 80,60 70,68" fill="none" stroke="${C.boneShade}" stroke-width="3" stroke-linecap="round"/>` +
    `<path d="M70,22 L58,45 L70,68" fill="none" stroke="${C.bandage}" stroke-width="0.8"/>` +
    stroke([[57, 45], [86, 45]], 1.3, C.wood, 1.2) +
    `<path d="M86,45 l-4,-2.6 v5.2 Z" fill="${C.metalLight}" stroke="${C.ink}" stroke-width="0.8"/>` +
    `<path d="M58,45 l-3,-2.5 M58,45 l-3,2.5" stroke="${C.purpleLight}" stroke-width="1.6"/>` +
    // ближняя рука натягивает тетиву
    bone([[54, 38], [50, 46], [57, 45]]) +
    // капюшон
    shape('M43,24 C42,12 52,8 60,11 C66,14 66,20 64,23 L60,20 C56,16 48,17 47,26 L48,34 L42,36 L44,30 Z', C.cloth) +
    skull(55, 23, 8.5) +
    tint('M47,14 C51,10 57,10 61,12 C56,12 51,14 48,18 Z', C.purpleLight, 0.5),
)
