import { balanceArmy } from '../army.js'
import {
  BALANCE_VERSION,
  DRAW_THRESHOLD,
  FIRE_AURA_RATIO,
  MAX_CONSECUTIVE_TIMEOUTS,
  MAX_ROUNDS,
  MODE_CONFIG,
} from '../constants.js'
import { getSpell } from '../data/spells.js'
import { getUnit } from '../data/units.js'
import { generateGrid, key, obstacleSet, rectCells, rectFree, rectsAdjacent } from '../grid.js'
import { balanceHero, heroQueueId, heroUidOf, isHeroQueueId } from '../hero.js'
import type { Rng } from '../rng.js'
import type {
  Action,
  ArmySlot,
  BattleEndReason,
  BattleEvent,
  BattleState,
  Hero,
  Mode,
  Team,
  UnitState,
} from '../types.js'
import { applyDamage, canRetaliate, heal, removeEffects, strike } from './combat.js'
import {
  IllegalActionError,
  alive,
  clone,
  effectiveInitiative,
  effectiveSpeed,
  enemiesOf,
  findUnitState,
  hasAbility,
  hasEffect,
  rectOf,
  shootMoveLimit,
  stackWeight,
  tmpl,
} from './helpers.js'
import { isValidSpellTarget, resolveSpell } from './magic.js'
import { attackPositions, movePositions } from './movement.js'

export interface Participant {
  hero: Hero
  team: Team
  army: ArmySlot[]
}

export interface CreateBattleInput {
  mode: Mode
  participants: Participant[]
}

export interface ActionResult {
  state: BattleState
  events: BattleEvent[]
}

// ---------------------------------------------------------------------------
// Создание боя
// ---------------------------------------------------------------------------

function placeUnits(state: BattleState, perHero: { uid: string; team: Team; units: UnitState[] }[]): void {
  const { width, height } = state.grid
  const blocked = obstacleSet(state.grid)
  const heroesPerTeam = MODE_CONFIG[state.mode].heroesPerTeam
  for (const team of ['red', 'blue'] as const) {
    const group = perHero.filter((h) => h.team === team)
    group.forEach((h, heroIndex) => {
      const bandSize = Math.floor(height / heroesPerTeam)
      const bandStart = heroIndex * bandSize
      const bandEnd = heroIndex === heroesPerTeam - 1 ? height : bandStart + bandSize
      // Крупные юниты ставятся первыми (§5.1)
      const ordered = [...h.units].sort((a, b) => tmpl(b).size - tmpl(a).size)
      for (const u of ordered) {
        const size = tmpl(u).size
        const rowRanges: [number, number][] = [
          [bandStart, bandEnd],
          [0, height],
        ]
        let placed = false
        outer: for (const [y0, y1] of rowRanges) {
          for (let c = 0; c + size <= width / 2; c++) {
            const x = team === 'red' ? c : width - size - c
            for (let y = y0; y + size <= y1; y++) {
              if (rectFree(state.grid, blocked, { x, y, size })) {
                u.x = x
                u.y = y
                for (const cell of rectCells({ x, y, size })) blocked.add(key(cell.x, cell.y))
                placed = true
                break outer
              }
            }
          }
        }
        if (!placed) throw new Error(`Cannot place unit ${u.id}`)
      }
    })
  }
}

export function createBattle(input: CreateBattleInput, rng: Rng): ActionResult {
  const { mode, participants } = input
  const cfg = MODE_CONFIG[mode]
  for (const team of ['red', 'blue'] as const) {
    const n = participants.filter((p) => p.team === team).length
    if (n !== cfg.heroesPerTeam) throw new Error(`Team ${team} must have ${cfg.heroesPerTeam} heroes, got ${n}`)
  }
  const battleLevel = Math.min(...participants.map((p) => p.hero.level))
  const state: BattleState = {
    status: 'active',
    mode,
    balanceVersion: BALANCE_VERSION,
    battleLevel,
    teams: { red: [], blue: [] },
    heroes: {},
    grid: generateGrid(mode, rng),
    units: [],
    queue: [],
    activeUnitId: null,
    activeHeroUid: null,
    round: 0,
    seq: 0,
    timeouts: {},
    winner: null,
    endReason: null,
  }

  const firstTeam: Team = rng.chance(0.5) ? 'red' : 'blue'
  const perHero: { uid: string; team: Team; units: UnitState[] }[] = []
  const teamCounters: Record<Team, number> = { red: 0, blue: 0 }
  for (const p of participants) {
    const hero = balanceHero(p.hero, battleLevel, p.team)
    state.heroes[hero.uid] = hero
    state.teams[p.team].push(hero.uid)
    state.timeouts[hero.uid] = 0
    const army = balanceArmy(p.army, battleLevel, hero.raceSkills, mode)
    const units = army.map((slot, i): UnitState => {
      const t = getUnit(slot.unitId)
      const index = teamCounters[p.team]++
      const u: UnitState = {
        id: `${hero.uid}#${i}`,
        templateId: t.id,
        owner: hero.uid,
        team: p.team,
        count: slot.count,
        initialCount: slot.count,
        topHp: t.health,
        x: 0,
        y: 0,
        retaliatedThisRound: false,
        waitedThisRound: false,
        defending: false,
        casterUsed: false,
        rebirthUsed: false,
        effects: [],
        tieOrder: index * 2 + (p.team === firstTeam ? 0 : 1),
      }
      if (t.ranged) u.shotsLeft = t.ranged.shots
      if (slot.skinId) u.skinId = slot.skinId
      return u
    })
    state.units.push(...units)
    perHero.push({ uid: hero.uid, team: p.team, units })
  }
  placeUnits(state, perHero)

  const events: BattleEvent[] = []
  startRound(state, events)
  advance(state, events)
  return { state, events }
}

// ---------------------------------------------------------------------------
// Ход боя
// ---------------------------------------------------------------------------

/** Герой ходит, пока не сдался и у него остались живые юниты */
const heroCanAct = (state: BattleState, uid: string) =>
  !state.heroes[uid]!.surrendered && state.units.some((u) => u.owner === uid && alive(u))

/**
 * Очередь раунда (§5.3): юниты и герои по инициативе. При равенстве — по скорости
 * (у героя её нет — он после юнитов той же инициативы), затем по жребию.
 */
function buildQueue(state: BattleState): string[] {
  const units = state.units
    .filter(alive)
    .map((u) => ({ id: u.id, init: effectiveInitiative(state, u), speed: effectiveSpeed(u), tie: u.tieOrder }))
  const heroes = Object.values(state.heroes)
    .filter((h) => heroCanAct(state, h.uid))
    .map((h, i) => ({ id: heroQueueId(h.uid), init: h.initiative, speed: 0, tie: 10_000 + i }))
  return [...units, ...heroes].sort((a, b) => b.init - a.init || b.speed - a.speed || a.tie - b.tie).map((x) => x.id)
}

/** Кто сейчас ходит: uid игрока (владельца активного юнита или героя) */
export function activeActor(state: BattleState): string | null {
  if (state.activeHeroUid) return state.activeHeroUid
  return state.activeUnitId ? (state.units.find((u) => u.id === state.activeUnitId)?.owner ?? null) : null
}

function startRound(state: BattleState, events: BattleEvent[]): void {
  state.round++
  state.queue = buildQueue(state)
  events.push({ type: 'round_start', round: state.round })
}

function endRound(state: BattleState, events: BattleEvent[]): void {
  for (const u of state.units) {
    u.retaliatedThisRound = false
    u.waitedThisRound = false
    for (const e of u.effects) if (e.id !== 'petrified') e.roundsLeft--
    u.effects = u.effects.filter((e) => e.roundsLeft > 0)
  }
  for (const h of Object.values(state.heroes)) h.castThisRound = false
  if (state.round >= MAX_ROUNDS) {
    finishByRoundLimit(state, events)
    return
  }
  startRound(state, events)
}

function teamAlive(state: BattleState, team: Team): boolean {
  return state.units.some((u) => u.team === team && alive(u))
}

function finish(state: BattleState, winner: Team | 'draw', reason: BattleEndReason, events: BattleEvent[]): void {
  state.status = 'finished'
  state.winner = winner
  state.endReason = reason
  state.activeUnitId = null
  state.queue = []
  events.push({ type: 'battle_end', winner, reason })
}

function finishByRoundLimit(state: BattleState, events: BattleEvent[]): void {
  const share = (team: Team) => {
    const units = state.units.filter((u) => u.team === team)
    const initial = units.reduce((s, u) => s + u.initialCount * tmpl(u).weight, 0)
    return initial > 0 ? units.reduce((s, u) => s + stackWeight(u), 0) / initial : 0
  }
  const red = share('red')
  const blue = share('blue')
  const winner = Math.abs(red - blue) < DRAW_THRESHOLD ? 'draw' : red > blue ? 'red' : 'blue'
  finish(state, winner, 'round_limit', events)
}

/** Проверка окончания боя; возвращает true, если бой завершён */
function checkEnd(state: BattleState, events: BattleEvent[], reason: BattleEndReason = 'elimination'): boolean {
  if (state.status === 'finished') return true
  const red = teamAlive(state, 'red')
  const blue = teamAlive(state, 'blue')
  if (red && blue) return false
  finish(state, red ? 'red' : blue ? 'blue' : 'draw', reason, events)
  return true
}

/** Эффекты начала хода; возвращает false, если юнит погиб или пропускает ход */
function beginTurn(state: BattleState, u: UnitState, events: BattleEvent[]): boolean {
  events.push({ type: 'turn_start', unitId: u.id })
  u.defending = false
  const t = tmpl(u)
  if (!u.waitedThisRound) {
    if (hasAbility(u, 'regeneration')) heal(u, t.health - u.topHp, false, events)
    const regen = u.effects.find((e) => e.id === 'regeneration')
    if (regen?.value) heal(u, regen.value, false, events)
    const poison = u.effects.find((e) => e.id === 'poison')
    if (poison?.value) applyDamage(state, u, poison.value, events, null, 'poison')
    if (!alive(u)) return false
    if (hasAbility(u, 'fire_aura')) {
      const amount = Math.max(1, Math.floor(u.count * ((t.damageMin + t.damageMax) / 2) * FIRE_AURA_RATIO))
      for (const e of enemiesOf(state, u))
        if (!hasAbility(e, 'fire_immune') && rectsAdjacent(rectOf(u), rectOf(e)))
          applyDamage(state, e, amount, events, u.id, 'aura')
    }
  }
  if (hasEffect(u, 'petrified')) {
    removeEffects(u, ['petrified'])
    events.push({ type: 'skip_turn', unitId: u.id, reason: 'petrified' })
    return false
  }
  if (hasEffect(u, 'blind')) {
    events.push({ type: 'skip_turn', unitId: u.id, reason: 'blind' })
    return false
  }
  return true
}

/** Переход к следующему юниту или герою, способному действовать */
function advance(state: BattleState, events: BattleEvent[]): void {
  state.activeUnitId = null
  state.activeHeroUid = null
  for (let guard = 0; guard < 10_000; guard++) {
    if (checkEnd(state, events)) return
    const id = state.queue[0]
    if (id === undefined) {
      endRound(state, events)
      if (state.status === 'finished') return
      continue
    }
    if (isHeroQueueId(id)) {
      const uid = heroUidOf(id)
      if (!state.heroes[uid] || !heroCanAct(state, uid)) {
        state.queue.shift()
        continue
      }
      state.activeHeroUid = uid
      events.push({ type: 'hero_turn', heroUid: uid })
      return
    }
    const u = state.units.find((x) => x.id === id)
    if (!u || !alive(u)) {
      state.queue.shift()
      continue
    }
    const canAct = beginTurn(state, u, events)
    if (checkEnd(state, events)) return
    if (!canAct || !alive(u)) {
      state.queue = state.queue.filter((x) => x !== id)
      continue
    }
    state.activeUnitId = id
    return
  }
  throw new Error('advance: no progress')
}

function endTurn(state: BattleState, events: BattleEvent[]): void {
  const id = state.activeHeroUid ? heroQueueId(state.activeHeroUid) : state.activeUnitId
  state.queue = state.queue.filter((x) => x !== id)
  advance(state, events)
}

// ---------------------------------------------------------------------------
// Действия
// ---------------------------------------------------------------------------

/** Герой, который сейчас ходит и принадлежит actor */
function activeHero(state: BattleState, heroUid: string, actor: string) {
  if (state.status !== 'active') throw new IllegalActionError('battle_finished')
  if (heroUid !== actor) throw new IllegalActionError('not_owner')
  const hero = state.heroes[actor]
  if (!hero || state.activeHeroUid !== actor) throw new IllegalActionError('not_your_turn')
  return hero
}

function activeUnit(state: BattleState, unitId: string, actor: string): UnitState {
  if (state.status !== 'active') throw new IllegalActionError('battle_finished')
  if (state.activeUnitId !== unitId) throw new IllegalActionError('not_active_unit')
  const u = findUnitState(state, unitId)
  if (u.owner !== actor) throw new IllegalActionError('not_owner')
  return u
}

function moveTo(u: UnitState, to: { x: number; y: number }, events: BattleEvent[]): void {
  if (u.x === to.x && u.y === to.y) return
  events.push({ type: 'move', unitId: u.id, from: { x: u.x, y: u.y }, to: { x: to.x, y: to.y } })
  u.x = to.x
  u.y = to.y
}

function doMelee(state: BattleState, u: UnitState, targetId: string, from: { x: number; y: number }, rng: Rng, events: BattleEvent[]) {
  const target = findUnitState(state, targetId)
  if (!alive(target) || target.team === u.team) throw new IllegalActionError('bad_target')
  const pos = attackPositions(state, u, target).find((p) => p.x === from.x && p.y === from.y)
  if (!pos) throw new IllegalActionError('bad_attack_position')
  const origin = { x: u.x, y: u.y }
  moveTo(u, pos, events)

  strike(state, u, target, { kind: 'melee', chargeCells: pos.steps }, rng, events)
  if (alive(u) && canRetaliate(target) && !hasAbility(u, 'no_retaliation')) {
    strike(state, target, u, { kind: 'retaliation' }, rng, events)
    target.retaliatedThisRound = true
  }
  if (hasAbility(u, 'double_attack') && alive(u) && alive(target)) {
    strike(state, u, target, { kind: 'melee' }, rng, events)
  }
  if (hasAbility(u, 'return_strike') && alive(u)) {
    const blocked = new Set<number>()
    for (const other of state.units)
      if (alive(other) && other.id !== u.id) for (const c of rectCells(rectOf(other))) blocked.add(key(c.x, c.y))
    for (const [x, y] of state.grid.obstacles) blocked.add(key(x, y))
    if (rectFree(state.grid, blocked, { ...origin, size: tmpl(u).size })) moveTo(u, origin, events)
  }
}

function doShoot(state: BattleState, u: UnitState, targetId: string, rng: Rng, events: BattleEvent[]) {
  if (!tmpl(u).ranged || !u.shotsLeft) throw new IllegalActionError('cannot_shoot')
  const target = findUnitState(state, targetId)
  if (!alive(target) || target.team === u.team) throw new IllegalActionError('bad_target')
  const shots = hasAbility(u, 'double_attack') ? 2 : 1
  for (let i = 0; i < shots && u.shotsLeft > 0 && alive(target) && alive(u); i++) {
    u.shotsLeft--
    strike(state, u, target, { kind: 'ranged' }, rng, events)
  }
}

/** Сила способности caster — от веса стака */
export const casterPower = (u: UnitState) => Math.max(1, Math.round(stackWeight(u) / 10))

function doAbility(state: BattleState, u: UnitState, targetId: string, rng: Rng, events: BattleEvent[]) {
  const t = tmpl(u)
  if (!hasAbility(u, 'caster') || u.casterUsed || !t.casterSpells?.length) throw new IllegalActionError('no_ability')
  const target = findUnitState(state, targetId)
  const candidates = t.casterSpells.filter((s) => isValidSpellTarget(state, s, u.team, { x: target.x, y: target.y }))
  if (candidates.length === 0) throw new IllegalActionError('bad_target')
  const spellId = rng.pick(candidates)
  u.casterUsed = true
  events.push({ type: 'ability', unitId: u.id, spellId, targetId })
  resolveSpell(state, spellId, casterPower(u), u.team, { x: target.x, y: target.y }, events)
}

function surrender(state: BattleState, uid: string, events: BattleEvent[], reason: BattleEndReason): void {
  const hero = state.heroes[uid]
  if (!hero || hero.surrendered) throw new IllegalActionError('bad_hero')
  hero.surrendered = true
  events.push({ type: 'surrender', heroUid: uid })
  for (const u of state.units) {
    if (u.owner === uid && alive(u)) {
      u.count = 0
      u.topHp = 0
      events.push({ type: 'death', unitId: u.id })
    }
  }
  state.queue = state.queue.filter((id) => (isHeroQueueId(id) ? heroUidOf(id) !== uid : alive(findUnitState(state, id))))
  checkEnd(state, events, reason)
}

/**
 * Применить действие игрока. Чистая функция по отношению к state (возвращает новый state);
 * rng мутируется — вызывающая сторона сохраняет rng.state().
 */
export function applyAction(prev: BattleState, action: Action, actor: string, rng: Rng): ActionResult {
  const state = clone(prev)
  const events: BattleEvent[] = []

  switch (action.type) {
    case 'surrender': {
      if (action.heroUid !== actor) throw new IllegalActionError('not_owner')
      if (state.status !== 'active') throw new IllegalActionError('battle_finished')
      const wasActive = activeActor(state) === actor
      surrender(state, actor, events, 'surrender')
      if (state.status === 'active' && wasActive) advance(state, events)
      break
    }
    case 'cast': {
      const hero = activeHero(state, action.heroUid, actor)
      if (!hero.spells.includes(action.spellId)) throw new IllegalActionError('spell_unavailable')
      const spell = getSpell(action.spellId)
      if (hero.mana < spell.mana) throw new IllegalActionError('no_mana')
      if (!isValidSpellTarget(state, action.spellId, hero.team, action.target)) throw new IllegalActionError('bad_target')
      hero.mana -= spell.mana
      hero.castThisRound = true
      events.push({ type: 'cast', heroUid: actor, spellId: action.spellId, target: action.target })
      resolveSpell(state, action.spellId, hero.stats.power, hero.team, action.target, events)
      state.timeouts[actor] = 0
      if (!checkEnd(state, events)) endTurn(state, events)
      break
    }
    case 'hero_strike': {
      const hero = activeHero(state, action.heroUid, actor)
      const target = findUnitState(state, action.targetId)
      if (!alive(target) || target.team === hero.team) throw new IllegalActionError('bad_target')
      hero.castThisRound = true
      events.push({ type: 'hero_strike', heroUid: actor, targetId: target.id })
      applyDamage(state, target, hero.strike, events, null, 'hero')
      state.timeouts[actor] = 0
      if (!checkEnd(state, events)) endTurn(state, events)
      break
    }
    case 'hero_pass': {
      const hero = activeHero(state, action.heroUid, actor)
      hero.castThisRound = true
      events.push({ type: 'hero_pass', heroUid: actor })
      state.timeouts[actor] = 0
      endTurn(state, events)
      break
    }
    default: {
      const u = activeUnit(state, action.unitId, actor)
      switch (action.type) {
        case 'move': {
          const pos = movePositions(state, u).get(key(action.to.x, action.to.y))
          if (!pos || pos.steps === 0) throw new IllegalActionError('bad_move')
          moveTo(u, pos, events)
          break
        }
        case 'attack':
          doMelee(state, u, action.targetId, action.from, rng, events)
          break
        case 'shoot':
          if (action.from && (action.from.x !== u.x || action.from.y !== u.y)) {
            // Перемещение на часть хода и выстрел (§5.6)
            const pos = movePositions(state, u).get(key(action.from.x, action.from.y))
            if (!pos || pos.steps > shootMoveLimit(u)) throw new IllegalActionError('bad_shoot_position')
            moveTo(u, pos, events)
          }
          doShoot(state, u, action.targetId, rng, events)
          break
        case 'ability':
          doAbility(state, u, action.targetId, rng, events)
          break
        case 'defend':
          u.defending = true
          events.push({ type: 'defend', unitId: u.id })
          break
        case 'wait': {
          if (u.waitedThisRound) throw new IllegalActionError('already_waited')
          u.waitedThisRound = true
          events.push({ type: 'wait', unitId: u.id })
          state.queue = [...state.queue.filter((x) => x !== u.id), u.id]
          state.timeouts[actor] = 0
          advance(state, events)
          state.seq++
          return { state, events }
        }
      }
      state.timeouts[actor] = 0
      if (!checkEnd(state, events)) endTurn(state, events)
    }
  }
  state.seq++
  return { state, events }
}

/**
 * Ход не сделан вовремя (§5.4): за юнита выполняется Defend, за героя — пропуск хода;
 * 3 тайм-аута подряд — сдача
 */
export function applyTimeout(prev: BattleState, rng: Rng): ActionResult {
  const uid = activeActor(prev)
  if (prev.status !== 'active' || !uid) throw new IllegalActionError('battle_finished')
  const state = clone(prev)
  const events: BattleEvent[] = []
  const u = state.activeUnitId ? findUnitState(state, state.activeUnitId) : null
  state.timeouts[uid] = (state.timeouts[uid] ?? 0) + 1
  events.push({ type: 'timeout', heroUid: uid, unitId: u?.id ?? null })
  if (state.timeouts[uid]! >= MAX_CONSECUTIVE_TIMEOUTS) {
    surrender(state, uid, events, 'timeout')
    if (state.status === 'active') advance(state, events)
  } else if (u) {
    u.defending = true
    events.push({ type: 'defend', unitId: u.id })
    endTurn(state, events)
  } else {
    state.heroes[uid]!.castThisRound = true
    events.push({ type: 'hero_pass', heroUid: uid })
    endTurn(state, events)
  }
  state.seq++
  return { state, events }
}
