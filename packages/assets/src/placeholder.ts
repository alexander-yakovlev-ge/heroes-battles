import type { UnitTemplate } from '@hb/game-core'
import { RACE_PALETTES } from './palette.js'

/** Уровень юнита — точками (без текста: SVG-текст в Skia зависит от шрифтов платформы) */
function tierPips(tier: number, color: string): string {
  const gap = 6
  const x0 = 50 - ((tier - 1) * gap) / 2
  return Array.from({ length: tier }, (_, i) => `<circle cx="${x0 + i * gap}" cy="87" r="2.2" fill="${color}"/>`).join('')
}

/** Эмблема роли: лук (стрелок), щит (тяжёлый), стрела-рывок (мобильный) */
function roleEmblem(role: UnitTemplate['role'], color: string, stroke: string): string {
  switch (role) {
    case 'shooter':
      return `<path d="M40 30 Q62 50 40 70" fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round"/>
<line x1="40" y1="30" x2="40" y2="70" stroke="${color}" stroke-width="1.5"/>
<line x1="32" y1="50" x2="66" y2="50" stroke="${stroke}" stroke-width="2.5"/>
<path d="M66 50 l-6 -4 v8 z" fill="${stroke}"/>`
    case 'heavy':
      return `<path d="M50 28 L68 34 V50 Q68 64 50 72 Q32 64 32 50 V34 Z" fill="${color}" stroke="${stroke}" stroke-width="3"/>
<path d="M50 36 V64 M40 48 H60" stroke="${stroke}" stroke-width="3"/>`
    case 'mobile':
      return `<path d="M30 40 H54 L50 32 L70 50 L50 68 L54 60 H30 Z" fill="${color}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>`
  }
}

/**
 * Временный спрайт расы, для которой графика ещё не нарисована: жетон в цветах расы
 * с эмблемой роли и уровнем юнита. Заменяется настоящим спрайтом без изменения кода.
 */
export function placeholderSvg(unit: UnitTemplate): string {
  const p = RACE_PALETTES[unit.raceId]
  const wings = unit.isFlying
    ? `<path d="M22 46 Q4 30 10 18 Q20 30 30 34 Z" fill="${p.light}" opacity="0.85"/><path d="M78 46 Q96 30 90 18 Q80 30 70 34 Z" fill="${p.light}" opacity="0.85"/>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
<ellipse cx="50" cy="94" rx="30" ry="4" fill="#000" opacity="0.25"/>
${wings}
<circle cx="50" cy="50" r="36" fill="${p.primary}" stroke="${p.dark}" stroke-width="4"/>
<circle cx="50" cy="50" r="29" fill="none" stroke="${p.secondary}" stroke-width="2" opacity="0.8"/>
${roleEmblem(unit.role, p.secondary, p.light)}
<rect x="26" y="80" width="48" height="14" rx="4" fill="${p.dark}" stroke="${p.secondary}" stroke-width="1.5"/>
${tierPips(unit.tier, p.light)}
</svg>`
}
