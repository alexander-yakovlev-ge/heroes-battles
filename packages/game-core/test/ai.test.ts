import { describe, expect, it } from 'vitest'
import { createBotArmy, createBotHero, createRng, maxWeight, armyWeight, simulateBattle, validateArmy } from '../src/index.js'

describe('боты (§9)', () => {
  it('армия бота валидна и близка к лимиту веса', () => {
    for (let seed = 0; seed < 50; seed++) {
      const rng = createRng(seed)
      const level = 1 + (seed % 30)
      const hero = createBotHero('bot', level, rng)
      const mode = (['1v1', '2v2', '3v3'] as const)[seed % 3]!
      const army = createBotArmy(hero, mode, rng)
      expect(validateArmy(army, hero.level, hero.raceSkills, mode)).toEqual([])
      expect(armyWeight(army, hero.raceSkills)).toBeGreaterThan(maxWeight(level) * 0.6)
    }
  })

  it.each(['1v1', '2v2', '3v3'] as const)('%s: бои бот против бота завершаются без ошибок', (mode) => {
    for (let seed = 0; seed < 12; seed++) {
      const { state, actions } = simulateBattle(seed, mode, [1 + seed * 2, 1 + seed * 2 + (seed % 4)])
      expect(state.status).toBe('finished')
      expect(state.winner).not.toBeNull()
      expect(actions).toBeGreaterThan(0)
    }
  }, 120_000)

  it('бой детерминирован при одинаковом seed', () => {
    const a = simulateBattle(123, '2v2', [12])
    const b = simulateBattle(123, '2v2', [12])
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state))
  }, 60_000)

  it('Normal обыгрывает Easy в большинстве боёв', () => {
    let wins = 0
    const n = 30
    for (let seed = 0; seed < n; seed++) {
      const normalRed = seed % 2 === 0
      const { state } = simulateBattle(1000 + seed, '1v1', [10], normalRed ? { red: 'normal', blue: 'easy' } : { red: 'easy', blue: 'normal' })
      if (state.winner === (normalRed ? 'red' : 'blue')) wins++
    }
    expect(wins / n).toBeGreaterThanOrEqual(0.7)
  }, 120_000)
})
