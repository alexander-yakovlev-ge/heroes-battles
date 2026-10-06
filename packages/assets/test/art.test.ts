import { describe, expect, it } from 'vitest'
import { UNITS } from '@hb/game-core'
import { ILLUSTRATED_RACES, RACE_PALETTES, getUnitArt, unitIconSvg } from '../src/index.js'

describe('графика юнитов (§10.1)', () => {
  it('у каждого юнита есть спрайт 100×100 и иконка', () => {
    for (const u of UNITS) {
      const art = getUnitArt(u.id)
      expect(art.svg.startsWith('<svg'), u.id).toBe(true)
      expect(art.svg, u.id).toContain('viewBox="0 0 100 100"')
      expect(art.svg.trim().endsWith('</svg>'), u.id).toBe(true)
      expect(unitIconSvg(u.id), u.id).toContain(`viewBox="${art.iconViewBox}"`)
    }
  })

  it('нарисованные расы — без временных жетонов', () => {
    for (const u of UNITS.filter((x) => ILLUSTRATED_RACES.includes(x.raceId))) {
      expect(getUnitArt(u.id).placeholder, u.id).toBe(false)
    }
  })

  it('в SVG нет текста, скриптов и внешних ссылок (Skia рисует без шрифтов; ассеты безопасны)', () => {
    for (const u of UNITS) {
      const svg = getUnitArt(u.id).svg
      expect(svg, u.id).not.toMatch(/<text|<script|href=|<image|<foreignObject/)
    }
  })

  it('палитра задана для каждой расы', () => {
    for (const u of UNITS) expect(RACE_PALETTES[u.raceId]).toBeDefined()
  })
})
