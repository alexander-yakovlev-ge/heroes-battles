import { C, eye, shadow, shape, stroke, svg, tint } from './kit.js'

/** Зомби: сгорбленный, в лохмотьях, тянет руки вперёд */
export const zombie = svg(
  shadow(52, 22) +
    // дальняя рука
    stroke([[52, 40], [64, 46], [75, 45]], 6, C.rotDark, 2.4) +
    shape('M74,42 l6,1 l1,2 l-5,1 l4,2 l-1,1 l-6,-1 Z', C.rotDark, 1.2) +
    // ноги в штанах
    stroke([[47, 64], [44, 77], [42, 89]], 7, C.clothDark, 2.4) +
    stroke([[55, 64], [58, 77], [60, 88]], 7, C.cloth, 2.4) +
    shape('M37,88 L46,87 L47,92 L36,92 Z', C.rotDark, 1.4) +
    shape('M56,87 L66,88 L66,92 L55,92 Z', C.rot, 1.4) +
    // торс в рваной рубахе
    shape('M40,42 C41,34 52,31 60,35 C64,38 64,46 62,54 L62,64 L58,61 L55,66 L51,62 L47,67 L44,62 L40,65 C38,58 38,50 40,42 Z', C.purple) +
    tint('M40,44 C40,38 46,34 52,33 C46,37 43,44 43,56 L41,64 C39,58 39,50 40,44 Z', C.purpleDark, 0.6) +
    // дыра в рубахе: кожа и рёбра
    shape('M52,44 C55,42 59,44 59,49 C59,54 55,56 52,54 C50,51 50,46 52,44 Z', C.rot, 1.2) +
    `<path d="M52.5,47 h5 M52.5,50 h5.5 M53,53 h4" stroke="${C.rotDark}" stroke-width="1.2" stroke-linecap="round"/>` +
    // голова: вытянута вперёд
    shape('M57,30 C55,20 62,14 69,16 C75,18 77,25 75,31 L73,36 L66,38 C61,38 58,35 57,30 Z', C.rot) +
    tint('M58,29 C57,21 62,16 68,16 C63,19 61,25 62,33 C60,33 58,31 58,29 Z', C.rotDark, 0.55) +
    shape('M66,36 L74,34 L73,39 L67,40 Z', C.rotDark, 1.2) +
    `<path d="M67,36.5 h6" stroke="${C.ink}" stroke-width="1"/>` +
    `<path d="M60,17 C63,13 68,13 71,15 M62,18 L60,22 M66,16 L65,20" fill="none" stroke="${C.ink}" stroke-width="1.4" stroke-linecap="round"/>` +
    `<ellipse cx="70" cy="25" rx="2.6" ry="2.2" fill="${C.ink}"/>` +
    eye(70.5, 25, 1.1) +
    `<path d="M73,28 l2,3 l-2.5,0.3" fill="none" stroke="${C.ink}" stroke-width="1"/>` +
    // ближняя рука
    stroke([[56, 42], [68, 49], [79, 50]], 6, C.rot, 2.4) +
    shape('M78,47 l7,1 l1,2 l-6,1 l5,2 l-1,1.5 l-7,-1 Z', C.rot, 1.2) +
    stroke([[60, 44], [64, 47]], 3, C.purple, 1.6),
)
