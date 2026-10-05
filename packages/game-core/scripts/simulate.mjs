#!/usr/bin/env node
// Массовый прогон боёв бот против бота для оценки стабильности и баланса.
// Работает на собранном пакете: pnpm --filter @hb/game-core simulate [-- опции]
//
// Опции:
//   --battles N   боёв на каждый режим в каждой серии (по умолчанию 100)
//   --seed S      начальный seed; при одинаковом seed результат повторяется (по умолчанию 1)
//   --modes LIST  режимы через запятую (по умолчанию 1v1,2v2,3v3)
//   --min-normal X  минимальная доля побед Normal над Easy (по умолчанию 0.7)
//
// Серии:
//   1. Normal против Normal — стабильность движка и равенство сторон (red/blue).
//   2. Normal против Easy — сила ботов; стороны чередуются.
// Код выхода 1, если был хоть один сбой или не выполнен критерий.

import { parseArgs } from 'node:util'
import { RACES, createRng, simulateBattle } from '../dist/index.js'

const { values: args } = parseArgs({
  options: {
    battles: { type: 'string', default: '100' },
    seed: { type: 'string', default: '1' },
    modes: { type: 'string', default: '1v1,2v2,3v3' },
    'min-normal': { type: 'string', default: '0.7' },
  },
})

const battles = Number(args.battles)
const baseSeed = Number(args.seed)
const modes = args.modes.split(',')
const minNormal = Number(args['min-normal'])
const MAX_LEVEL = 30

/** Уровни героев боя: один общий уровень на бой, чтобы стороны были в равных условиях */
function levelFor(seed) {
  return createRng(`level-${seed}`).int(1, MAX_LEVEL)
}

function run(seed, mode, difficulty) {
  const level = levelFor(seed)
  try {
    return { ok: true, seed, level, ...simulateBattle(seed, mode, [level], difficulty) }
  } catch (error) {
    return { ok: false, seed, level, error }
  }
}

const pct = (a, b) => (b === 0 ? '—' : `${((100 * a) / b).toFixed(1)}%`)
const failures = []
const verdicts = []

function check(name, passed, detail) {
  verdicts.push({ name, passed, detail })
}

function printTable(rows) {
  const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)))
  for (const r of rows) console.log(r.map((c, i) => String(c).padEnd(widths[i])).join('  '))
}

const started = Date.now()
let seedCounter = baseSeed

// ── Серия 1: Normal vs Normal ───────────────────────────────────────────────
console.log(`\n━━━ Normal vs Normal: ${battles} боёв на режим, seed ${baseSeed} ━━━`)
const sideRows = [['режим', 'red', 'blue', 'ничья', 'сбоев', 'ср. раундов', 'ср. действий', 'окончания']]
const raceStats = Object.fromEntries(RACES.map((r) => [r, { wins: 0, games: 0 }]))
let totalRed = 0
let totalBlue = 0

for (const mode of modes) {
  let red = 0, blue = 0, draw = 0, errors = 0, rounds = 0, actions = 0
  const reasons = {}
  for (let i = 0; i < battles; i++) {
    const r = run(seedCounter++, mode, { red: 'normal', blue: 'normal' })
    if (!r.ok) {
      errors++
      failures.push({ series: 'normal-vs-normal', mode, seed: r.seed, level: r.level, error: r.error })
      continue
    }
    const { state } = r
    if (state.winner === 'red') red++
    else if (state.winner === 'blue') blue++
    else draw++
    rounds += state.round
    actions += r.actions
    reasons[state.endReason] = (reasons[state.endReason] ?? 0) + 1
    if (mode === '1v1') {
      for (const p of r.participants) {
        const s = raceStats[p.hero.startingRace]
        s.games++
        if (state.winner === p.team) s.wins++
      }
    }
  }
  const done = battles - errors
  totalRed += red
  totalBlue += blue
  sideRows.push([
    mode,
    `${red} (${pct(red, done)})`,
    `${blue} (${pct(blue, done)})`,
    draw,
    errors,
    done ? (rounds / done).toFixed(1) : '—',
    done ? (actions / done).toFixed(0) : '—',
    Object.entries(reasons).map(([k, v]) => `${k}:${v}`).join(' '),
  ])
}
printTable(sideRows)

// Равенство сторон: биномиальный z-тест среди решённых боёв, |z| < 2 ≈ 95%
const decided = totalRed + totalBlue
const z = decided ? (totalRed - decided / 2) / Math.sqrt(decided / 4) : 0
check(
  'стороны равны (|z| < 2)',
  Math.abs(z) < 2,
  `red ${totalRed} / blue ${totalBlue}, z = ${z.toFixed(2)}`,
)

if (modes.includes('1v1')) {
  console.log('\nПобеды по расе героя (1v1, Normal vs Normal):')
  const rows = [['раса', 'боёв', 'побед', 'доля']]
  for (const [race, s] of Object.entries(raceStats).sort((a, b) => b[1].wins / (b[1].games || 1) - a[1].wins / (a[1].games || 1))) {
    rows.push([race, s.games, s.wins, pct(s.wins, s.games)])
  }
  printTable(rows)
}

// ── Серия 2: Normal vs Easy ─────────────────────────────────────────────────
console.log(`\n━━━ Normal vs Easy: ${battles} боёв на режим, стороны чередуются ━━━`)
const botRows = [['режим', 'Normal побед', 'Easy побед', 'ничья', 'сбоев']]
for (const mode of modes) {
  let normal = 0, easy = 0, draw = 0, errors = 0
  for (let i = 0; i < battles; i++) {
    const normalTeam = i % 2 === 0 ? 'red' : 'blue'
    const difficulty = normalTeam === 'red' ? { red: 'normal', blue: 'easy' } : { red: 'easy', blue: 'normal' }
    const r = run(seedCounter++, mode, difficulty)
    if (!r.ok) {
      errors++
      failures.push({ series: 'normal-vs-easy', mode, seed: r.seed, level: r.level, error: r.error })
      continue
    }
    if (r.state.winner === normalTeam) normal++
    else if (r.state.winner === 'draw') draw++
    else easy++
  }
  const done = battles - errors
  botRows.push([mode, `${normal} (${pct(normal, done)})`, `${easy} (${pct(easy, done)})`, draw, errors])
  check(`${mode}: Normal ≥ ${pct(minNormal, 1)} против Easy`, done > 0 && normal / done >= minNormal, pct(normal, done))
}
printTable(botRows)

// ── Итог ────────────────────────────────────────────────────────────────────
check('бои без сбоев', failures.length === 0, `${failures.length} сбоев`)

if (failures.length) {
  console.log('\nСбои (повторить: simulateBattle(seed, mode, [level], …)):')
  for (const f of failures.slice(0, 20)) {
    console.log(`  ${f.series} ${f.mode} seed=${f.seed} level=${f.level}: ${f.error?.message ?? f.error}`)
  }
  if (failures.length > 20) console.log(`  … и ещё ${failures.length - 20}`)
}

const total = battles * modes.length * 2
console.log(`\n━━━ Итог: ${total} боёв за ${((Date.now() - started) / 1000).toFixed(0)}s ━━━`)
for (const v of verdicts) console.log(`${v.passed ? 'PASS' : 'FAIL'}  ${v.name} — ${v.detail}`)
process.exit(verdicts.every((v) => v.passed) ? 0 : 1)
