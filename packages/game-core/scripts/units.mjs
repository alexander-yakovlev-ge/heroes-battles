#!/usr/bin/env node
// Эффективность юнитов: насколько юнит силён за свой вес по сравнению с юнитами того же уровня.
// Работает на собранном пакете: pnpm --filter @hb/game-core units [-- опции]
//
// Каждая пара юнитов одного уровня играет N боёв (стороны чередуются): у каждой стороны стак
// проверяемого юнита (40% веса армии) и общие для обеих сторон три стака-«наполнителя» по 20%
// (случайные базовые юниты того же уровня). Герои одинаковые, без маны — заклинания не влияют. Боты Normal.
// Вес берётся без поправки расы (RACE_POWER_CALIBRATION) — она подбирается отдельно по матрице рас.
//
// Опции:
//   --battles N   боёв на пару (по умолчанию 30)
//   --seed S      начальный seed (по умолчанию 1)
//   --stack K     размер стака в «средних существах уровня» (по умолчанию 20)
//   --roles       не отключать треугольник ролей (по умолчанию отключён — меряется цена характеристик)
//   --tiers LIST  уровни через запятую (по умолчанию все)
//   --workers W   потоков (по умолчанию ядра − 1)
//   --json FILE   сохранить эффективность юнитов

import { availableParallelism } from 'node:os'
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { isMainThread, parentPort, workerData } from 'node:worker_threads'
import {
  RACES,
  RACE_POWER_CALIBRATION,
  ROLE_ADVANTAGE,
  UNITS,
  applyAction,
  chooseBotAction,
  createBattle,
  createRng,
  deriveStats,
  getUnit,
} from '../dist/index.js'
import { runParallel } from './lib/parallel.mjs'

function hero(uid, race) {
  return {
    uid,
    level: 30,
    experience: 0,
    startingRace: race,
    stats: deriveStats([]),
    raceSkills: {},
    statHistory: [],
    raceSkillHistory: Array(10).fill(race),
    pendingStatPoints: 0,
    pendingRaceSkillPoints: 0,
    lastFreeRespecSeason: null,
  }
}

const FILLERS = 3
const TESTED_SHARE = 0.4

/** Бой: red — юнит a, blue — юнит b, у обоих наполнители f; размер армии — по весу budget */
function duel(t) {
  const rng = createRng(t.seed)
  const ua = getUnit(t.a)
  const ub = getUnit(t.b)
  const participants = [
    { hero: hero('red', ua.raceId), team: 'red', army: [ua.id, ...t.f].map((unitId) => ({ unitId, count: 1 })) },
    { hero: hero('blue', ub.raceId), team: 'blue', army: [ub.id, ...t.f].map((unitId) => ({ unitId, count: 1 })) },
  ]
  let { state } = createBattle({ mode: '1v1', participants }, rng)
  for (const h of Object.values(state.heroes)) h.mana = 0
  for (const u of state.units) {
    const tm = getUnit(u.templateId)
    const share = u.id.endsWith('#0') ? TESTED_SHARE : (1 - TESTED_SHARE) / FILLERS
    // Вес без поправки расы: здесь меряется цена самого юнита, а поправка расы — дело матрицы рас
    const weight = tm.weight / (RACE_POWER_CALIBRATION[tm.raceId] ?? 1)
    u.count = u.initialCount = Math.max(1, Math.round((t.budget * share * (t.scale?.[u.team] ?? 1)) / weight))
    u.topHp = tm.health
  }
  let actions = 0
  while (state.status === 'active') {
    const active = state.units.find((u) => u.id === state.activeUnitId)
    const action = chooseBotAction(state, active.owner, 'normal', rng)
    if (!action) throw new Error('bot returned no action')
    state = applyAction(state, action, active.owner, rng).state
    if (++actions > 3000) throw new Error('battle did not finish')
  }
  return state.winner
}

if (!isMainThread) {
  if (!workerData?.roles) for (const r of Object.values(ROLE_ADVANTAGE)) r.bonus = 0
  parentPort.on('message', (tasks) => {
    parentPort.postMessage(
      tasks.map((t) => {
        try {
          return { ...t, winner: duel(t) }
        } catch (error) {
          return { ...t, error: String(error?.message ?? error) }
        }
      }),
    )
  })
} else {
  await main()
}

function pickFillers(rng, pool) {
  const left = [...pool]
  return Array.from({ length: FILLERS }, () => left.splice(rng.int(0, left.length - 1), 1)[0].id)
}

async function main() {
  const { values: args } = parseArgs({
    options: {
      battles: { type: 'string', default: '30' },
      seed: { type: 'string', default: '1' },
      stack: { type: 'string', default: '20' },
      roles: { type: 'boolean', default: false },
      tiers: { type: 'string', default: '1,2,3,4,5,6,7' },
      workers: { type: 'string', default: String(Math.max(1, availableParallelism() - 1)) },
      json: { type: 'string' },
    },
  })
  const battles = Number(args.battles)
  const tiers = args.tiers.split(',').map(Number)
  const stack = Number(args.stack)

  const tasks = []
  let seed = Number(args.seed) * 1_000_003
  for (const tier of tiers) {
    const units = UNITS.filter((u) => u.tier === tier)
    const fillers = units.filter((u) => u.variant === 'base')
    const budget = (stack / TESTED_SHARE) * (units.reduce((s, u) => s + u.weight, 0) / units.length)
    for (let i = 0; i < units.length; i++) {
      for (let j = i + 1; j < units.length; j++) {
        for (let k = 0; k < battles; k++) {
          const s = seed++
          const pool = fillers.filter((f) => f.id !== units[i].id && f.id !== units[j].id)
          const f = pickFillers(createRng(`filler-${s}`), pool)
          const [a, b] = k % 2 === 0 ? [units[i].id, units[j].id] : [units[j].id, units[i].id]
          tasks.push({ kind: 'pair', seed: s, a, b, f, budget })
        }
      }
    }
    // Калибровка: тот же юнит, у red на 10% больше веса — во сколько п.п. побед это выливается
    for (const u of fillers) {
      for (let k = 0; k < battles; k++) {
        const s = seed++
        const pool = fillers.filter((f) => f.id !== u.id)
        const f = pickFillers(createRng(`filler-${s}`), pool)
        tasks.push({ kind: 'calib', seed: s, a: u.id, b: u.id, f, budget, scale: { red: 1.1, blue: 1 } })
      }
    }
  }

  const started = Date.now()
  const results = await runParallel(
    new URL(import.meta.url),
    tasks,
    Number(args.workers),
    { roles: args.roles },
  )
  const elapsed = (Date.now() - started) / 1000

  const score = Object.fromEntries(UNITS.map((u) => [u.id, { pts: 0, n: 0 }]))
  const calib = { pts: 0, n: 0 }
  const errors = []
  for (const r of results) {
    if (r.error) {
      errors.push(r)
      continue
    }
    const red = r.winner === 'red' ? 1 : r.winner === 'draw' ? 0.5 : 0
    if (r.kind === 'calib') {
      calib.pts += red
      calib.n++
      continue
    }
    score[r.a].pts += red
    score[r.a].n++
    score[r.b].pts += 1 - red
    score[r.b].n++
  }
  const eff = Object.fromEntries(Object.entries(score).filter(([, s]) => s.n).map(([id, s]) => [id, s.pts / s.n]))
  const pct = (x) => `${(100 * x).toFixed(0)}%`.padStart(4)

  console.log(`\n━━━ Эффективность юнитов: ${results.length} боёв за ${elapsed.toFixed(0)}s, роли ${args.roles ? 'вкл' : 'выкл'} ━━━`)
  console.log(`Калибровка: +10% веса → ${pct(calib.n ? calib.pts / calib.n : 0.5)} побед`)
  console.log(`Погрешность юнита ≈ ±${(100 * 1.96 * Math.sqrt(0.25 / (battles * 15))).toFixed(0)} п.п. (95%)\n`)

  for (const tier of tiers) {
    const units = UNITS.filter((u) => u.tier === tier).sort((a, b) => eff[b.id] - eff[a.id])
    console.log(`Уровень ${tier}:`)
    for (const u of units) {
      const tags = [u.role, u.size === 2 ? 'large' : '', u.isFlying ? 'fly' : '', ...u.abilities].filter(Boolean).join(' ')
      console.log(`  ${pct(eff[u.id])}  ${u.id.padEnd(28)} w=${String(u.weight).padEnd(5)} ${tags}`)
    }
  }

  console.log('\nСредняя эффективность юнитов расы:')
  for (const race of [...RACES].sort((a, b) => avg(b) - avg(a))) console.log(`  ${race.padEnd(10)} ${pct(avg(race))}`)
  function avg(race) {
    const us = UNITS.filter((u) => u.raceId === race && tiers.includes(u.tier))
    return us.reduce((s, u) => s + eff[u.id], 0) / us.length
  }

  // Признаки: средняя эффективность юнитов с признаком против остальных (того же набора уровней)
  const features = new Map()
  const add = (f, u) => features.set(f, [...(features.get(f) ?? []), u])
  for (const u of UNITS.filter((x) => tiers.includes(x.tier))) {
    add(`role:${u.role}`, u)
    if (u.ranged) add('ranged', u)
    if (u.isFlying) add('flying', u)
    if (u.size === 2) add('large', u)
    for (const a of u.abilities) add(a, u)
  }
  const all = UNITS.filter((x) => tiers.includes(x.tier))
  const mean = (us) => us.reduce((s, u) => s + eff[u.id], 0) / us.length
  console.log('\nПризнаки (эфф. с признаком − без, п.п.; число юнитов):')
  const rows = [...features].map(([f, us]) => {
    const rest = all.filter((u) => !us.includes(u))
    return [f, 100 * (mean(us) - mean(rest)), us.length]
  })
  for (const [f, d, n] of rows.sort((a, b) => b[1] - a[1])) console.log(`  ${(d >= 0 ? '+' : '') + d.toFixed(1)}`.padEnd(9) + ` ${f} (${n})`)

  if (errors.length) console.log(`\nСбоев: ${errors.length}; первый: ${errors[0].a} vs ${errors[0].b}: ${errors[0].error}`)
  if (args.json) writeFileSync(args.json, JSON.stringify({ args, eff, calib }, null, 2))
}
