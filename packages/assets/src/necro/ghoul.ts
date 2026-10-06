import { C, eye, shadow, shape, stroke, svg, tint } from './kit.js'

/** Упырь: пригнувшийся падальщик с длинными когтями */
export const ghoul = svg(
  shadow(50, 26) +
    // дальние конечности
    stroke([[40, 66], [34, 78], [38, 90]], 4.5, C.fleshDark, 2.2) +
    stroke([[56, 58], [64, 72], [70, 88]], 4.5, C.fleshDark, 2.2) +
    `<path d="M70,88 l5,2 M70,88 l3,4 M70,88 l1,4.5" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round"/>` +
    // туловище, выгнутая спина
    shape('M30,64 C28,52 36,40 50,38 C60,37 66,42 66,50 C66,58 58,64 48,66 C40,68 33,68 30,64 Z', C.flesh) +
    tint('M31,62 C30,52 37,42 49,39 C40,45 36,54 38,66 C35,66 32,65 31,62 Z', C.fleshDark, 0.6) +
    // позвонки
    `<path d="M36,46 l2,-3 l2,3 M42,42 l2,-3 l2,3 M48,40 l2,-3 l2,3" fill="${C.bone}" stroke="${C.ink}" stroke-width="1"/>` +
    // рёбра на боку
    `<path d="M44,52 C48,50 52,51 55,54 M43,56 C47,54 51,55 54,58" fill="none" stroke="${C.fleshDark}" stroke-width="1.3"/>` +
    // ближняя задняя нога
    stroke([[38, 64], [46, 76], [42, 89]], 5, C.flesh, 2.2) +
    shape('M36,88 L46,88 L46,92 L35,92 Z', C.fleshDark, 1.2) +
    // голова
    shape('M60,40 C60,31 67,26 74,28 C80,30 83,36 81,42 L84,46 L76,48 C70,50 62,48 60,40 Z', C.flesh) +
    shape('M66,30 L62,22 L70,28 Z', C.fleshDark, 1.2) +
    tint('M61,40 C61,33 66,29 72,28 C67,32 65,37 67,46 C63,45 61,43 61,40 Z', C.fleshDark, 0.5) +
    `<path d="M74,45 L84,45.5" stroke="${C.ink}" stroke-width="1.4"/>` +
    `<path d="M76,45 l1,2 l1,-2 l1,2 l1,-2 l1,2" fill="${C.bone}" stroke="${C.ink}" stroke-width="0.7"/>` +
    `<ellipse cx="74" cy="36" rx="2.6" ry="2" fill="${C.ink}"/>` +
    eye(74.5, 36, 1.1, '#e2f27c') +
    // ближняя передняя лапа с когтями
    stroke([[60, 50], [70, 62], [80, 64]], 5, C.flesh, 2.2) +
    `<path d="M80,64 C84,62 87,62 89,64 M80,64 C84,65 87,66 88,69 M80,64 C83,67 85,70 85,73" fill="none" stroke="${C.ink}" stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M80,64 C84,62 87,62 89,64 M80,64 C84,65 87,66 88,69 M80,64 C83,67 85,70 85,73" fill="none" stroke="${C.bone}" stroke-width="1.6" stroke-linecap="round"/>`,
)
