import {
  applyAction,
  chooseBotAction,
  createBattle,
  createBotArmy,
  createBotHero,
  createRng,
  type BattleState,
  type BotDifficulty,
  type Mode,
  type Participant,
} from '../src/index.js'

export interface SimResult {
  state: BattleState
  actions: number
}

/** Полный бой бот против бота; используется в тестах и для оценки баланса */
export function simulateBattle(
  seed: number,
  mode: Mode,
  levels: number[],
  difficulty: Record<'red' | 'blue', BotDifficulty> = { red: 'normal', blue: 'normal' },
): SimResult {
  const rng = createRng(seed)
  const perTeam = mode === '1v1' ? 1 : mode === '2v2' ? 2 : 3
  const participants: Participant[] = []
  for (let i = 0; i < perTeam * 2; i++) {
    const team = i < perTeam ? 'red' : 'blue'
    const hero = createBotHero(`${team}${i}`, levels[i % levels.length]!, rng)
    participants.push({ hero, team, army: createBotArmy(hero, mode, rng) })
  }
  let { state } = createBattle({ mode, participants }, rng)
  let actions = 0
  while (state.status === 'active') {
    const active = state.units.find((u) => u.id === state.activeUnitId)!
    const team = active.team
    const action = chooseBotAction(state, active.owner, difficulty[team], rng)
    if (!action) throw new Error('bot returned no action')
    state = applyAction(state, action, active.owner, rng).state
    if (++actions > 5000) throw new Error('battle did not finish')
  }
  return { state, actions }
}
