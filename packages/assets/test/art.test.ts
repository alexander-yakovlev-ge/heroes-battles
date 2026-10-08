import { describe, expect, it } from 'vitest'
import { UNITS } from '@hb/game-core'
import { ILLUSTRATED_RACES, RACE_PALETTES, getUnitArt, rigSource, unitIconSvg } from '../src/index.js'
// @ts-expect-error — вспомогательный скрипт без типов
import { layerBox } from '../scripts/layer-box.mjs'

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

  it('id градиентов не пересекаются между юнитами (иконки рисуются в одном документе на web)', () => {
    const owner = new Map<string, string>()
    for (const u of UNITS) {
      const svg = getUnitArt(u.id).svg
      for (const [, id] of svg.matchAll(/\bid="([^"]+)"/g)) {
        expect(owner.get(id!) ?? u.id, `${id} в ${u.id}`).toBe(u.id)
        owner.set(id!, u.id)
        expect(svg, u.id).toContain(`url(#${id})`)
      }
      for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g)) expect(svg, u.id).toContain(`id="${ref}"`)
    }
  })

  it('у нарисованных юнитов есть риг: шарнир у каждой кости, границы слоёв актуальны', () => {
    for (const u of UNITS.filter((x) => ILLUSTRATED_RACES.includes(x.raceId))) {
      const rig = getUnitArt(u.id).rig
      expect(rig, `${u.id}: нет рига — запустите pnpm --filter @hb/assets bounds`).toBeDefined()
      const src = rigSource(u.id)!.rig
      rig!.layers.forEach((l, i) => {
        if (l.bone !== 'root') expect(rig!.pivots[l.bone], `${u.id}: шарнир ${l.bone}`).toBeDefined()
        expect(l.box, `${u.id}: слой ${i} — запустите pnpm --filter @hb/assets bounds`).toEqual(layerBox(src.layers[i]!.svg))
      })
    }
  }, 60_000)

  it('палитра задана для каждой расы', () => {
    for (const u of UNITS) expect(RACE_PALETTES[u.raceId]).toBeDefined()
  })
})
