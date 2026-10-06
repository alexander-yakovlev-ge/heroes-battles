import { C, eye, shadow, svg } from './kit.js'

const OUT = '#2a5a54'

/** Призрак: полупрозрачный саван с хвостом-дымкой, парит над землёй */
export const ghost = svg(
  shadow(52, 14) +
    `<g opacity="0.88">` +
    // хвост
    `<path d="M40,58 C30,66 26,76 32,86 C34,80 38,78 42,80 C40,74 44,70 48,70 Z" fill="${C.ghost}" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
    // тело-саван
    `<path d="M38,40 C38,24 50,14 62,16 C74,18 80,30 78,44 C77,54 72,62 64,68 L60,74 L56,68 L50,76 L47,68 L40,72 C40,64 38,52 38,40 Z" fill="${C.ghost}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M41,44 C41,30 49,20 60,18 C52,24 47,34 48,50 C48,58 46,64 43,68 C41,60 41,52 41,44 Z" fill="#7fd9c2" opacity="0.5"/>` +
    // руки-лохмотья тянутся вперёд
    `<path d="M66,44 C74,44 82,46 88,50 L84,52 L87,55 L81,55 L82,58 C76,56 70,54 64,54 Z" fill="${C.ghost}" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M60,50 C66,52 72,56 76,62 L72,62 L73,66 L68,63 C64,60 60,58 57,56 Z" fill="#9fe8d4" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `</g>` +
    // лицо: пустые глазницы и рот
    `<ellipse cx="63" cy="31" rx="3" ry="4" fill="${C.ink}"/>` +
    `<ellipse cx="72" cy="31" rx="2.4" ry="3.6" fill="${C.ink}"/>` +
    `<ellipse cx="68.5" cy="41" rx="2.6" ry="3.6" fill="${C.ink}"/>` +
    eye(63.3, 31.5, 1.1) +
    eye(72.2, 31.5, 0.9),
)
