#!/usr/bin/env node
// Лист предпросмотра графики расы для ревью (§10.1): спрайты на клетках поля и иконки.
// pnpm --filter @hb/assets preview [--race necro] [--out file.png]; размер клетки — PREVIEW_CELL (по умолчанию 120)
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { Resvg } from '@resvg/resvg-js'
import { unitsOfRace } from '@hb/game-core'
import { getUnitArt, unitIconSvg, RACE_PALETTES } from '../dist/index.js'

const { values: args } = parseArgs({
  options: { race: { type: 'string', default: 'necro' }, out: { type: 'string' }, only: { type: 'string' } },
})
const race = args.race
const out = args.out ?? `preview-${race}.png`
const only = args.only?.split(',').map((x) => `${race}_${x}`)
const units = unitsOfRace(race).filter((u) => !only || only.includes(u.id))
const pal = RACE_PALETTES[race]

const CELL = Number(process.env.PREVIEW_CELL ?? 120)
// Полный лист: столбец — уровень, строка — базовый/альтернативный; --only — подряд
const COLS = only ? Math.min(units.length, 4) : 7
const ROWS = only ? Math.ceil(units.length / 4) : 2
const W = COLS * 2 * CELL + 40
const ROW_H = 2 * CELL + 70
const H = ROWS * ROW_H + 40

const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
const viewBox = (svg) => svg.match(/viewBox="([^"]*)"/)[1]

let body = ''
units.forEach((u, i) => {
  const col = only ? i % 4 : u.tier - 1
  const row = only ? Math.floor(i / 4) : u.variant === 'base' ? 0 : 1
  const x0 = 20 + col * 2 * CELL
  const y0 = 20 + row * ROW_H
  const size = u.size * CELL
  // клетки поля под юнитом
  for (let cy = 0; cy < u.size; cy++)
    for (let cx = 0; cx < u.size; cx++)
      body += `<rect x="${x0 + cx * CELL}" y="${y0 + (2 - u.size) * CELL + cy * CELL}" width="${CELL}" height="${CELL}" fill="#4a5a3a" stroke="#2c3622"/>`
  const art = getUnitArt(u.id)
  body += `<svg x="${x0}" y="${y0 + (2 - u.size) * CELL}" width="${size}" height="${size}" viewBox="${viewBox(art.svg)}">${inner(art.svg)}</svg>`
  // иконка
  const icon = unitIconSvg(u.id)
  body += `<rect x="${x0 + 2 * CELL - 58}" y="${y0 + 2 * CELL + 6}" width="52" height="52" rx="8" fill="${pal.dark}" stroke="${pal.primary}" stroke-width="2"/>`
  body += `<svg x="${x0 + 2 * CELL - 56}" y="${y0 + 2 * CELL + 8}" width="48" height="48" viewBox="${viewBox(icon)}">${inner(icon)}</svg>`
  body += `<text x="${x0 + 4}" y="${y0 + 2 * CELL + 22}" font-family="sans-serif" font-size="12" fill="#ddd">${u.tier}${u.variant === 'alt' ? 'a' : ''} ${u.id.replace(race + '_', '')}</text>`
})

const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#22252a"/>${body}</svg>`
const png = new Resvg(sheet, { font: { loadSystemFonts: true } }).render().asPng()
writeFileSync(out, png)
console.log(`Лист предпросмотра: ${out}`)
