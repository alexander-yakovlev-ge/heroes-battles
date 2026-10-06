import type { RaceId } from '@hb/game-core'
import { RACE_PALETTES } from './palette.js'

/**
 * Портрет героя для шкалы очереди и панели героя: шлем с плюмажем и плащ в цветах стартовой расы.
 * Герой не стоит на поле (§4.4), поэтому нужен только портрет. viewBox 0 0 100 100.
 */
export function heroIconSvg(race: RaceId): string {
  const p = RACE_PALETTES[race]
  const ink = '#1a1622'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<rect width="100" height="100" fill="${p.dark}"/>
<path d="M14,100 C16,78 30,66 50,66 C70,66 84,78 86,100 Z" fill="${p.primary}" stroke="${ink}" stroke-width="2.5"/>
<path d="M30,100 C32,84 40,76 50,76 C60,76 68,84 70,100 Z" fill="${p.secondary}" stroke="${ink}" stroke-width="2"/>
<path d="M50,6 C58,10 64,18 62,28 C70,22 72,14 70,8 C80,16 78,30 66,34" fill="${p.accent}" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>
<path d="M30,44 C30,26 40,18 50,18 C60,18 70,26 70,44 L70,58 C70,66 62,72 50,72 C38,72 30,66 30,58 Z" fill="#9aa3b2" stroke="${ink}" stroke-width="2.5"/>
<path d="M33,44 C33,30 40,22 47,20 C42,28 40,38 41,56 L41,68 C36,66 33,62 33,58 Z" fill="#c9d0db" opacity="0.7"/>
<path d="M36,44 L64,44 L64,50 L54,50 L54,62 L46,62 L46,50 L36,50 Z" fill="${ink}"/>
<path d="M50,18 L50,44" stroke="${p.secondary}" stroke-width="3"/>
<circle cx="42" cy="47" r="1.6" fill="${p.accent}"/><circle cx="58" cy="47" r="1.6" fill="${p.accent}"/>
</svg>`
}
