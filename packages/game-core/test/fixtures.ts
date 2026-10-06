import {
  BALANCE_VERSION,
  balanceHero,
  createHero,
  getUnit,
  heroQueueId,
  type BattleState,
  type Hero,
  type RaceId,
  type Team,
  type UnitState,
} from '../src/index.js'

export interface UnitSpec {
  id?: string
  unit: string
  count: number
  x: number
  y: number
  team?: Team
  owner?: string
}

/** Герой с нулевыми бонусами (все статы 1) — чтобы тестировать чистую механику */
export function plainHero(uid: string, race: RaceId = 'knight', level = 1): Hero {
  return createHero(uid, race, level)
}

/**
 * Состояние боя для сценарных тестов: поле без препятствий, заданные позиции,
 * очередь — в порядке перечисления юнитов, активен первый.
 */
export function scenario(
  units: UnitSpec[],
  opts: {
    width?: number
    height?: number
    obstacles?: [number, number][]
    heroes?: Hero[]
    level?: number
    /** Начать с хода этого героя (он первый в очереди, затем юниты) */
    heroTurn?: string
  } = {},
): BattleState {
  const level = opts.level ?? 1
  const heroes = opts.heroes ?? [plainHero('red', 'knight', level), plainHero('blue', 'necro', level)]
  const state: BattleState = {
    status: 'active',
    mode: '1v1',
    balanceVersion: BALANCE_VERSION,
    battleLevel: level,
    teams: { red: [], blue: [] },
    heroes: {},
    grid: { width: opts.width ?? 12, height: opts.height ?? 8, obstacles: opts.obstacles ?? [] },
    units: [],
    queue: [],
    activeUnitId: null,
    activeHeroUid: null,
    round: 1,
    seq: 0,
    timeouts: {},
    winner: null,
    endReason: null,
  }
  heroes.forEach((h, i) => {
    const team: Team = i === 0 ? 'red' : 'blue'
    state.heroes[h.uid] = balanceHero(h, level, team)
    state.teams[team].push(h.uid)
    state.timeouts[h.uid] = 0
  })
  units.forEach((s, i) => {
    const t = getUnit(s.unit)
    const team = s.team ?? 'red'
    const u: UnitState = {
      id: s.id ?? `u${i}`,
      templateId: t.id,
      owner: s.owner ?? state.teams[team][0]!,
      team,
      count: s.count,
      initialCount: s.count,
      topHp: t.health,
      x: s.x,
      y: s.y,
      retaliatedThisRound: false,
      waitedThisRound: false,
      defending: false,
      casterUsed: false,
      rebirthUsed: false,
      effects: [],
      tieOrder: i,
    }
    if (t.ranged) u.shotsLeft = t.ranged.shots
    state.units.push(u)
  })
  state.queue = state.units.map((u) => u.id)
  state.activeUnitId = state.queue[0] ?? null
  if (opts.heroTurn) {
    state.queue.unshift(heroQueueId(opts.heroTurn))
    state.activeUnitId = null
    state.activeHeroUid = opts.heroTurn
  }
  return state
}

export const unit = (state: BattleState, id: string) => state.units.find((u) => u.id === id)!
