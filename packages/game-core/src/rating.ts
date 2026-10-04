import { ELO_K, ELO_K_NEW, ELO_NEW_GAMES, MAX_LEVEL_GAP, XP_REWARD } from './constants.js'
import type { BattleState, Team } from './types.js'

export type BattleOutcome = 'win' | 'draw' | 'loss' | 'forfeit'

/** Итог боя для игрока: сдача и технический проигрыш — forfeit (0 опыта) */
export function outcomeFor(state: BattleState, uid: string): BattleOutcome {
  const hero = state.heroes[uid]
  if (!hero || !state.winner) throw new Error('Battle not finished')
  if (hero.surrendered) return 'forfeit'
  if (state.winner === 'draw') return 'draw'
  return state.winner === hero.team ? 'win' : 'loss'
}

export const battleXP = (outcome: BattleOutcome) => XP_REWARD[outcome]

export const kFactor = (gamesPlayed: number) => (gamesPlayed < ELO_NEW_GAMES ? ELO_K_NEW : ELO_K)

export const expectedScore = (rating: number, opponent: number) => 1 / (1 + 10 ** ((opponent - rating) / 400))

export interface RatedPlayer {
  uid: string
  team: Team
  rating: number
  games: number
}

/**
 * Изменение рейтинга (§7.2). Для командных боёв рейтинг команды = среднее; каждый игрок
 * получает изменение со своим K. winner === 'draw' — ничья.
 */
export function ratingChanges(players: readonly RatedPlayer[], winner: Team | 'draw'): Record<string, number> {
  const avg = (team: Team) => {
    const t = players.filter((p) => p.team === team)
    return t.reduce((s, p) => s + p.rating, 0) / t.length
  }
  const teamRating = { red: avg('red'), blue: avg('blue') }
  const result: Record<string, number> = {}
  for (const p of players) {
    const opp = p.team === 'red' ? 'blue' : 'red'
    const expected = expectedScore(teamRating[p.team], teamRating[opp])
    const score = winner === 'draw' ? 0.5 : winner === p.team ? 1 : 0
    result[p.uid] = Math.round(kFactor(p.games) * (score - expected))
  }
  return result
}

/** Ограничение разницы уровней для подбора (§7.3) */
export function levelsCompatible(levels: readonly number[]): boolean {
  return levels.length === 0 || Math.max(...levels) - Math.min(...levels) <= MAX_LEVEL_GAP
}
