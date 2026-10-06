import { describe, expect, it } from 'vitest'
import { applyAction, createHero, createRng, forecastAction, type Action, type BattleEvent } from '../src/index.js'
import { scenario, unit } from './fixtures.js'

const firstDamage = (events: BattleEvent[], targetId: string) =>
  events.find((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && e.targetId === targetId)

describe('прогноз удара', () => {
  it('реальный урон ближнего боя и выстрела всегда в прогнозном диапазоне', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 25, x: 3, y: 3 },
      { id: 'archer', unit: 'knight_archer', count: 12, x: 0, y: 7 },
      { id: 'e', unit: 'knight_peasant', count: 40, x: 6, y: 3, team: 'blue' },
    ])
    const attack: Action = { type: 'attack', unitId: 'a', targetId: 'e', from: { x: 5, y: 3 } }
    const f = forecastAction(s, attack)!
    expect(f.min).toBeLessThanOrEqual(f.max)
    expect(f.retaliation).not.toBeNull()
    for (let seed = 1; seed <= 40; seed++) {
      const { events } = applyAction(s, attack, 'red', createRng(seed))
      const d = firstDamage(events, 'e')!
      expect(d.damage).toBeGreaterThanOrEqual(f.min)
      expect(d.damage).toBeLessThanOrEqual(f.max)
      expect(d.kills).toBeGreaterThanOrEqual(f.killsMin)
      expect(d.kills).toBeLessThanOrEqual(f.killsMax)
    }
  })

  it('штраф за дальность виден в прогнозе и вдвое снижает урон', () => {
    const near = scenario([
      { id: 'r', unit: 'knight_archer', count: 10, x: 0, y: 0 },
      { id: 'e', unit: 'necro_zombie', count: 20, x: 5, y: 0, team: 'blue' },
    ])
    const far = scenario([
      { id: 'r', unit: 'knight_archer', count: 10, x: 0, y: 0 },
      { id: 'e', unit: 'necro_zombie', count: 20, x: 11, y: 0, team: 'blue' },
    ])
    const shoot: Action = { type: 'shoot', unitId: 'r', targetId: 'e' }
    const fn = forecastAction(near, shoot)!
    const ff = forecastAction(far, shoot)!
    expect(fn.penalties).toEqual([])
    expect(ff.penalties).toEqual(['range'])
    // ×0.5 до округления вниз
    expect(ff.max).toBeGreaterThanOrEqual(Math.floor(fn.max / 2) - 1)
    expect(ff.max).toBeLessThanOrEqual(Math.ceil(fn.max / 2))
    expect(fn.retaliation).toBeNull()
  })

  it('удар героя прогнозируется точно', () => {
    const s = scenario(
      [
        { id: 'a', unit: 'necro_skeleton', count: 5, x: 0, y: 0 },
        { id: 'e', unit: 'knight_peasant', count: 40, x: 8, y: 0, team: 'blue' },
      ],
      { heroes: [createHero('red', 'necro', 12), createHero('blue', 'knight', 12)], level: 12, heroTurn: 'red' },
    )
    const strike: Action = { type: 'hero_strike', heroUid: 'red', targetId: 'e' }
    const f = forecastAction(s, strike)!
    expect(f.min).toBe(f.max)
    const { state, events } = applyAction(s, strike, 'red', createRng(1))
    expect(firstDamage(events, 'e')!.damage).toBe(f.min)
    expect(unit(s, 'e').count - unit(state, 'e').count).toBe(f.killsMin)
  })
})
