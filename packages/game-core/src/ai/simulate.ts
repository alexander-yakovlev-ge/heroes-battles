import { activeActor, createBattle, applyAction, type Participant } from '../battle/engine.js'
import { createRng } from '../rng.js'
import type { BattleState, Mode, RaceId, Team } from '../types.js'
import { chooseBotAction, type BotDifficulty } from './bot.js'
import { createBotArmy, createBotHero } from './army.js'

export interface SimResult {
  state: BattleState
  actions: number
  participants: Participant[]
}

/**
 * Полный бой бот против бота; используется в тестах и для оценки баланса.
 * races[i] — основная раса i-го участника (red идут первыми); если не задана — случайная.
 */
export function simulateBattle(
  seed: number,
  mode: Mode,
  levels: number[],
  difficulty: Record<Team, BotDifficulty> = { red: 'normal', blue: 'normal' },
  races: readonly (RaceId | undefined)[] = [],
): SimResult {
  const rng = createRng(seed)
  const perTeam = mode === '1v1' ? 1 : mode === '2v2' ? 2 : 3
  const participants: Participant[] = []
  for (let i = 0; i < perTeam * 2; i++) {
    const team = i < perTeam ? 'red' : 'blue'
    const hero = createBotHero(`${team}${i}`, levels[i % levels.length]!, rng, races[i])
    participants.push({ hero, team, army: createBotArmy(hero, mode, rng) })
  }
  let { state } = createBattle({ mode, participants }, rng)
  let actions = 0
  while (state.status === 'active') {
    const actor = activeActor(state)!
    const action = chooseBotAction(state, actor, difficulty[state.heroes[actor]!.team], rng)
    if (!action) throw new Error('bot returned no action')
    state = applyAction(state, action, actor, rng).state
    if (++actions > 5000) throw new Error('battle did not finish')
  }
  return { state, actions, participants }
}
