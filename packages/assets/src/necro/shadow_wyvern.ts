import { C, eye, shadow, shape, stroke, svg, tint } from './kit.js'

const BODY = '#3a2d52'
const BODY_DARK = '#251c36'
const BELLY = '#6c5a8c'
const WING = '#2a2040'
const VENOM = '#9be86a'

/** Теневая виверна: ядовитый хвост, крылья-перепонки, крупный летающий юнит 2×2 */
export const shadowWyvern = svg(
  shadow(50, 22) +
    // дальнее крыло
    shape('M44,40 C36,22 24,10 8,8 C14,16 14,22 12,28 C18,26 22,30 22,36 C28,34 32,38 32,44 Z', BODY_DARK) +
    `<path d="M44,40 C36,24 24,12 8,8 M40,40 C30,30 20,26 12,28 M36,42 C30,38 26,36 22,36" fill="none" stroke="${C.ink}" stroke-width="1.2"/>` +
    // хвост с жалом
    stroke([[34, 58], [22, 66], [12, 62], [6, 52]], 5, BODY, 2.4) +
    shape('M6,52 L2,44 L10,48 Z', VENOM, 1.2) +
    // дальняя лапа
    stroke([[44, 64], [42, 74], [46, 80]], 3.6, BODY_DARK, 2) +
    `<path d="M46,80 l3,2 M46,80 l1,3.5 M46,80 l-2,3" stroke="${C.ink}" stroke-width="1.6" stroke-linecap="round"/>` +
    // тело
    shape('M30,52 C30,42 42,36 54,38 C64,40 68,48 66,56 C64,64 54,68 44,66 C36,64 30,60 30,52 Z', BODY) +
    shape('M38,62 C46,64 58,62 64,54 C62,62 54,66 44,66 C41,65 39,64 38,62 Z', BELLY, 1) +
    `<path d="M44,63 l1,-3 M50,63 l1,-3.4 M56,61 l1,-3" stroke="${BODY_DARK}" stroke-width="1"/>` +
    // шея и голова
    stroke([[60, 44], [68, 34], [74, 26]], 7, BODY, 2.4) +
    `<path d="M66,38 l3,-3 M70,32 l3,-3" stroke="${BELLY}" stroke-width="1.6" stroke-linecap="round"/>` +
    shape('M70,22 C72,16 80,14 86,18 L96,22 L94,26 L86,26 L94,30 L88,32 C82,34 74,32 71,28 Z', BODY) +
    shape('M74,18 L68,10 L78,16 Z', BODY_DARK, 1.2) +
    shape('M79,16 L76,8 L84,16 Z', BODY_DARK, 1.2) +
    `<path d="M86,26.5 l1.2,2 l1.2,-2 l1.2,2 l1.2,-2" fill="#fff" stroke="${C.ink}" stroke-width="0.5"/>` +
    `<ellipse cx="82" cy="21" rx="2.2" ry="1.6" fill="${C.ink}"/>` +
    eye(82.3, 21, 1, VENOM) +
    // ядовитая слюна
    `<path d="M90,31 C90,34 89,36 90,38" stroke="${VENOM}" stroke-width="1.4" stroke-linecap="round"/>` +
    // ближняя лапа
    stroke([[52, 64], [54, 74], [58, 80]], 4, BODY, 2.2) +
    `<path d="M58,80 l4,1 M58,80 l2,3.5 M58,80 l-1,3.6" stroke="${C.ink}" stroke-width="1.8" stroke-linecap="round"/>` +
    // ближнее крыло
    shape('M50,42 C52,24 60,8 74,2 C70,10 70,16 72,22 C66,22 62,26 62,32 C58,32 56,36 56,42 Z', WING) +
    tint('M52,40 C54,26 60,14 70,6 C66,14 64,22 64,30 C60,32 58,36 57,40 Z', BELLY, 0.35) +
    `<path d="M50,42 C52,26 60,10 74,2 M54,42 C58,32 64,26 72,22 M56,42 C58,38 60,34 62,32" fill="none" stroke="${C.ink}" stroke-width="1.3"/>`,
)
