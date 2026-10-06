import { C, eye, shadow, svg } from './kit.js'

const OUT = '#3a2f52'
const HAIR = '#8f86a8'
const SKIN = '#d9e9f0'
const ROBE = '#a9b8d6'

/** Банши: призрачная дева с развевающимися волосами и криком */
export const banshee = svg(
  shadow(52, 14) +
    `<g opacity="0.9">` +
    // волосы, развеваются назад
    `<path d="M58,18 C46,14 32,20 22,30 C30,30 34,32 36,34 C26,40 20,48 18,58 C26,52 32,52 36,52 C32,60 32,66 34,72 C40,62 46,56 52,50 Z" fill="${HAIR}" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
    // платье-дымка
    `<path d="M50,40 C58,38 66,42 68,52 C70,62 66,70 60,76 L58,84 L54,78 L48,86 L46,78 L40,82 C42,72 42,62 44,52 C45,46 47,42 50,40 Z" fill="${ROBE}" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>` +
    `<path d="M47,48 C49,44 53,42 56,42 C52,48 50,58 50,70 L46,78 C45,68 45,56 47,48 Z" fill="#8094bd" opacity="0.6"/>` +
    // руки раскинуты
    `<path d="M56,46 C64,40 72,36 82,34 L80,37 L85,38 L79,40 C72,42 66,46 60,52 Z" fill="${SKIN}" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `<path d="M50,48 C46,44 40,42 34,42 L36,45 L31,46 L37,48 C42,49 46,52 48,54 Z" fill="#b9cbd8" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>` +
    `</g>` +
    // голова
    `<path d="M54,28 C54,20 60,16 66,17 C72,19 74,25 72,31 C71,36 67,40 62,40 C57,39 54,34 54,28 Z" fill="${SKIN}" stroke="${OUT}" stroke-width="1.6"/>` +
    `<path d="M55,22 C58,14 68,12 72,18 C66,16 60,18 57,26 Z" fill="${HAIR}" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>` +
    // крик
    `<ellipse cx="67" cy="34" rx="2.6" ry="3.6" fill="${C.ink}"/>` +
    `<path d="M71,30 C76,28 80,26 84,22 M72,34 C78,34 82,34 87,33 M71,37 C76,39 80,41 84,45" fill="none" stroke="${C.glow}" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>` +
    `<ellipse cx="67.5" cy="25" rx="2" ry="1.5" fill="${C.ink}"/>` +
    eye(68, 25, 0.9),
)
