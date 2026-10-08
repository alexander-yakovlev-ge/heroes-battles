#!/usr/bin/env node
// Границы слоёв ригов (§10.1): клиент растрирует каждый слой только в его рамке, а не весь холст.
// pnpm --filter @hb/assets bounds — запускать после любых правок графики (тест сверяет файл с рисунками).
import { writeFileSync } from 'node:fs'
import { ILLUSTRATED_UNITS, rigSource } from '../dist/index.js'
import { layerBox } from './layer-box.mjs'

const out = [...ILLUSTRATED_UNITS]
  .sort((a, b) => a.localeCompare(b))
  .map((id) => [id, rigSource(id)])
  .map(([id, { rig }]) => `  ${id}: [\n${rig.layers.map((l) => `    [${layerBox(l.svg).join(', ')}],`).join('\n')}\n  ],`)
writeFileSync(
  new URL('../src/bounds.generated.ts', import.meta.url),
  `// Сгенерировано: pnpm --filter @hb/assets bounds — не править вручную\nexport const RIG_BOUNDS: Record<string, readonly (readonly [number, number, number, number])[]> = {\n${out.join('\n')}\n}\n`,
)
console.log(`Границы слоёв: ${out.length} юнитов`)
