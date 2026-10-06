import { C, blade, bone, foot, pelvis, ribcage, shadow, shape, skull, svg, tint } from './kit.js'

/** Скелет: ржавый меч и круглый деревянный щит */
export const skeleton = svg(
  shadow(50, 20) +
    // дальняя рука со щитом
    bone([[46, 37], [38, 45], [35, 50]], 3.2, C.boneShade) +
    shape('M24,50 a11,11 0 1,0 22,0 a11,11 0 1,0 -22,0 Z', C.wood) +
    shape('M27.5,50 a7.5,7.5 0 1,0 15,0 a7.5,7.5 0 1,0 -15,0 Z', C.woodDark, 1) +
    `<circle cx="35" cy="50" r="2.6" fill="${C.metal}" stroke="${C.ink}" stroke-width="1"/>` +
    tint('M26,46 a10,10 0 0,1 8,-6 l1,2 a8,8 0 0,0 -6,5 Z', C.metalLight, 0.35) +
    // ноги
    bone([[47, 62], [43, 75], [44, 89]], 3.4, C.boneShade) +
    foot(44, 90, 6) +
    bone([[52, 62], [57, 75], [56, 89]]) +
    foot(56, 90, 7) +
    pelvis(50, 61) +
    ribcage(50, 34, 56, 9) +
    // ближняя рука с мечом
    bone([[54, 37], [61, 47], [69, 45]]) +
    blade(70, 44, -55, 30, 3.6, C.metal) +
    skull(54, 22, 9.5),
)
