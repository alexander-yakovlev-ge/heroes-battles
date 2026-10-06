#!/usr/bin/env node
// Баланс рас: матрица «раса против расы» в боях бот против бота (Normal vs Normal).
// Работает на собранном пакете: pnpm --filter @hb/game-core balance [-- опции]
//
// Опции:
//   --battles N   боёв на каждую пару рас (по умолчанию 200; стороны чередуются)
//   --seed S      начальный seed (по умолчанию 1)
//   --levels A-B  диапазон уровней героев, уровень боя случайный в нём (по умолчанию 1-30)
//   --mode M      1v1 (по умолчанию), 2v2 или 3v3 — в командных режимах вся команда одной расы
//   --role-scale K  множитель бонусов треугольника ролей для экспериментов (по умолчанию 1; 0 — без ролей)
//   --workers W   число потоков (по умолчанию число ядер − 1)
//   --json FILE   сохранить сырые результаты
//
// Критерии (код выхода 1, если не выполнен хоть один):
//   1. разброс средней доли побед рас (макс − мин) ≤ 20 п.п.;
//   2. самая слабая раса в среднем обыгрывает самую сильную (> 50% в личной встрече);
//   3. «по кругу»: есть цикл через все расы, где каждая обыгрывает следующую.
// Ничья считается как пол-победы.

import { availableParallelism } from 'node:os'
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { isMainThread, parentPort, workerData } from 'node:worker_threads'
import { RACES, ROLE_ADVANTAGE, UNITS, createRng, simulateBattle } from '../dist/index.js'
import { runParallel } from './lib/parallel.mjs'

const PER_TEAM = { '1v1': 1, '2v2': 2, '3v3': 3 }

if (!isMainThread) {
  for (const r of Object.values(ROLE_ADVANTAGE)) r.bonus *= workerData.roleScale
  parentPort.on('message', (tasks) => {
    const out = []
    for (const t of tasks) {
      const perTeam = PER_TEAM[t.mode]
      const races = [...Array(perTeam).fill(t.red), ...Array(perTeam).fill(t.blue)]
      try {
        const { state } = simulateBattle(t.seed, t.mode, [t.level], { red: 'normal', blue: 'normal' }, races)
        out.push({ ...t, winner: state.winner, rounds: state.round })
      } catch (error) {
        out.push({ ...t, error: String(error?.message ?? error) })
      }
    }
    parentPort.postMessage(out)
  })
} else {
  await main()
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      battles: { type: 'string', default: '200' },
      seed: { type: 'string', default: '1' },
      levels: { type: 'string', default: '1-30' },
      mode: { type: 'string', default: '1v1' },
      workers: { type: 'string', default: String(Math.max(1, availableParallelism() - 1)) },
      'role-scale': { type: 'string', default: '1' },
      json: { type: 'string' },
    },
  })
  const roleScale = Number(args['role-scale'])
  const battles = Number(args.battles)
  const baseSeed = Number(args.seed)
  const [minLevel, maxLevel] = args.levels.split('-').map(Number)
  const mode = args.mode
  const workers = Number(args.workers)

  // Задачи: каждая пара рас, стороны чередуются; уровень боя детерминирован seed-ом
  const tasks = []
  let seed = baseSeed * 1_000_003
  for (let i = 0; i < RACES.length; i++) {
    for (let j = i + 1; j < RACES.length; j++) {
      for (let k = 0; k < battles; k++) {
        const s = seed++
        const level = createRng(`level-${s}`).int(minLevel, maxLevel ?? minLevel)
        const [red, blue] = k % 2 === 0 ? [RACES[i], RACES[j]] : [RACES[j], RACES[i]]
        tasks.push({ seed: s, level, mode, red, blue })
      }
    }
  }

  const started = Date.now()
  const results = await runParallel(new URL(import.meta.url), tasks, workers, { roleScale })
  const elapsed = (Date.now() - started) / 1000

  // score[a][b] — очки a против b (победа 1, ничья 0.5)
  const score = {}
  const games = {}
  for (const a of RACES) {
    score[a] = Object.fromEntries(RACES.map((b) => [b, 0]))
    games[a] = Object.fromEntries(RACES.map((b) => [b, 0]))
  }
  const errors = []
  for (const r of results) {
    if (r.error) {
      errors.push(r)
      continue
    }
    games[r.red][r.blue]++
    games[r.blue][r.red]++
    const red = r.winner === 'red' ? 1 : r.winner === 'draw' ? 0.5 : 0
    score[r.red][r.blue] += red
    score[r.blue][r.red] += 1 - red
  }
  const rate = (a, b) => (games[a][b] ? score[a][b] / games[a][b] : 0.5)
  const overall = Object.fromEntries(
    RACES.map((a) => [a, RACES.filter((b) => b !== a).reduce((s, b) => s + rate(a, b), 0) / (RACES.length - 1)]),
  )
  const ranking = [...RACES].sort((a, b) => overall[b] - overall[a])
  const pct = (x) => `${(100 * x).toFixed(0)}`.padStart(3)

  console.log(`\n━━━ Баланс рас: ${mode}, уровни ${args.levels}, ${battles} боёв на пару, seed ${baseSeed}${roleScale === 1 ? '' : `, роли ×${roleScale}`} ━━━`)
  console.log(`${results.length} боёв за ${elapsed.toFixed(0)}s, потоков ${workers}\n`)
  console.log('Доля побед строки против столбца, % (рас отсортированы по силе):\n')
  const short = (r) => r.slice(0, 5).padStart(5)
  console.log(`${''.padEnd(10)} ${ranking.map(short).join(' ')}   средн  +/−`)
  for (const a of ranking) {
    const cells = ranking.map((b) => (a === b ? '    ·' : `  ${pct(rate(a, b))}`))
    const wins = RACES.filter((b) => b !== a && rate(a, b) > 0.5).length
    const losses = RACES.filter((b) => b !== a && rate(a, b) < 0.5).length
    console.log(`${a.padEnd(10)} ${cells.join(' ')}   ${pct(overall[a])}%  ${wins}/${losses}`)
  }
  // Стандартная ошибка доли в одной паре — чтобы было видно, где различие на уровне шума
  console.log('\nРоли юнитов расы (стрелки / тяжёлые / мобильные):')
  for (const a of ranking) {
    const units = UNITS.filter((u) => u.raceId === a)
    const n = (role) => units.filter((u) => u.role === role).length
    console.log(`  ${a.padEnd(10)} ${n('shooter')} / ${n('heavy')} / ${n('mobile')}`)
  }
  console.log(`\nПогрешность одной клетки ≈ ±${(100 * 1.96 * Math.sqrt(0.25 / battles)).toFixed(0)} п.п. (95%)`)

  const verdicts = []
  const spread = overall[ranking[0]] - overall[ranking.at(-1)]
  verdicts.push([
    spread <= 0.2,
    `разброс ≤ 20 п.п.: ${(100 * spread).toFixed(1)} п.п. (${ranking[0]} ${pct(overall[ranking[0]])}% … ${ranking.at(-1)} ${pct(overall[ranking.at(-1)])}%)`,
  ])
  const weak = ranking.at(-1)
  const strong = ranking[0]
  verdicts.push([rate(weak, strong) > 0.5, `слабейшая (${weak}) бьёт сильнейшую (${strong}): ${pct(rate(weak, strong))}%`])
  const cycle = findCycle((a, b) => rate(a, b) > 0.5)
  verdicts.push([!!cycle, `цикл через все расы: ${cycle ? [...cycle, cycle[0]].join(' > ') : 'нет'}`])
  verdicts.push([errors.length === 0, `бои без сбоев: ${errors.length}`])
  for (const e of errors.slice(0, 10)) console.log(`  сбой seed=${e.seed} ${e.red} vs ${e.blue} level=${e.level}: ${e.error}`)

  console.log('\n━━━ Итог ━━━')
  for (const [ok, text] of verdicts) console.log(`${ok ? 'PASS' : 'FAIL'}  ${text}`)

  if (args.json) writeFileSync(args.json, JSON.stringify({ args, overall, score, games, errors }, null, 2))
  process.exit(verdicts.every(([ok]) => ok) ? 0 : 1)
}

/** Гамильтонов цикл в графе «a обыгрывает b» (8 рас — полный перебор) */
function findCycle(beats) {
  const [first, ...rest] = RACES
  const path = [first]
  const used = new Set(path)
  const dfs = () => {
    if (path.length === RACES.length) return beats(path.at(-1), first)
    for (const r of rest) {
      if (used.has(r) || !beats(path.at(-1), r)) continue
      path.push(r)
      used.add(r)
      if (dfs()) return true
      path.pop()
      used.delete(r)
    }
    return false
  }
  return dfs() ? path : null
}
