import { C, bone, eye, shadow, shape, svg, tint } from './kit.js'

const MEMBRANE = '#5b4b7a'

/** Костяной дракон: скелет с рваными перепонками крыльев, крупный летающий юнит 2×2 */
export const boneDragon = svg(
  shadow(50, 26) +
    // дальнее крыло: кости-пальцы и рваная перепонка
    `<path d="M46,40 L30,14 L14,6 L18,20 L8,22 L16,32 L6,40 L22,42 Z" fill="${MEMBRANE}" opacity="0.55" stroke="${C.ink}" stroke-width="1.2" stroke-linejoin="round"/>` +
    bone([[46, 40], [30, 14], [14, 6]], 2.6, C.boneShade) +
    bone([[30, 14], [16, 32]], 1.8, C.boneShade) +
    bone([[30, 14], [8, 22]], 1.8, C.boneShade) +
    // хвост — позвонки
    bone([[34, 58], [24, 66], [14, 66], [6, 58]], 3, C.boneShade) +
    `<path d="M24,64 l-1,-4 M18,66 l-1,-4 M12,65 l-2,-3" stroke="${C.ink}" stroke-width="2.6" stroke-linecap="round"/>` +
    shape('M6,58 L1,52 L9,54 Z', C.bone, 1.1) +
    // дальние лапы
    bone([[42, 62], [38, 72], [42, 80]], 2.6, C.boneShade) +
    // позвоночник и рёбра
    bone([[30, 54], [42, 46], [56, 46], [64, 42]], 3.4) +
    `<path d="M40,48 C38,56 40,62 44,64 M46,47 C44,56 46,62 50,65 M52,47 C51,55 53,61 56,63 M58,46 C58,52 59,57 61,59" fill="none" stroke="${C.ink}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M40,48 C38,56 40,62 44,64 M46,47 C44,56 46,62 50,65 M52,47 C51,55 53,61 56,63 M58,46 C58,52 59,57 61,59" fill="none" stroke="${C.bone}" stroke-width="1.8" stroke-linecap="round"/>` +
    // зелёное «сердце» нежити
    `<circle cx="50" cy="56" r="5" fill="${C.glow}" opacity="0.25"/><circle cx="50" cy="56" r="2" fill="${C.glowSoft}"/>` +
    // ближняя лапа
    bone([[56, 60], [58, 72], [62, 80]], 3) +
    `<path d="M62,80 l4,1 M62,80 l2,3.5 M62,80 l-1,3.6" stroke="${C.ink}" stroke-width="2" stroke-linecap="round"/>` +
    // шея
    bone([[64, 42], [70, 32], [74, 24]], 3.4) +
    `<path d="M66,38 l3,-1 M69,33 l3,-1 M72,28 l3,-1" stroke="${C.ink}" stroke-width="2.2" stroke-linecap="round"/>` +
    // череп
    shape('M70,20 C72,14 80,12 86,15 L97,19 L96,23 L88,23 L95,27 L89,29 C82,31 74,30 71,26 Z', C.bone) +
    tint('M71,22 C72,16 77,14 81,14 C77,17 76,22 78,28 C74,28 71,25 71,22 Z', C.boneShade, 0.7) +
    shape('M74,15 L66,6 L77,13 Z', C.boneShade, 1.1) +
    shape('M79,13 L76,3 L83,13 Z', C.boneShade, 1.1) +
    `<ellipse cx="82" cy="19" rx="2.6" ry="2.1" fill="${C.ink}"/>` +
    eye(82.4, 19, 1.1) +
    `<path d="M88,23 l1,2 l1,-2 l1,2 l1,-2 l1,2" fill="none" stroke="${C.ink}" stroke-width="0.8"/>` +
    // ближнее крыло
    `<path d="M54,42 L56,10 L68,0 L64,12 L74,10 L66,20 L70,26 L60,30 Z" fill="${MEMBRANE}" opacity="0.6" stroke="${C.ink}" stroke-width="1.2" stroke-linejoin="round"/>` +
    bone([[54, 42], [56, 10], [68, 0]], 2.8) +
    bone([[56, 10], [74, 10]], 2) +
    bone([[56, 10], [66, 20]], 2),
)
