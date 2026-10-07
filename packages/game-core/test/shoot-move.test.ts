import { describe, expect, it } from 'vitest'
import { applyAction, candidateActions, createRng, forecastAction, getUnit, shootMoveLimit, type Action } from '../src/index.js'
import { scenario, unit } from './fixtures.js'

const archers = () =>
  scenario([
    { id: 'r', unit: 'knight_archer', count: 10, x: 0, y: 0 },
    { id: 'e', unit: 'necro_zombie', count: 20, x: 11, y: 0, team: 'blue' },
  ])

describe('стрелок: перемещение на часть хода и выстрел (§5.6)', () => {
  it('лимит — половина скорости, минимум 1 клетка', () => {
    const s = archers()
    expect(shootMoveLimit(unit(s, 'r'))).toBe(Math.max(1, Math.floor(getUnit('knight_archer').speed / 2)))
  })

  it('переходит в выбранную клетку и стреляет за один ход', () => {
    const s = archers()
    const limit = shootMoveLimit(unit(s, 'r'))
    const shoot: Action = { type: 'shoot', unitId: 'r', targetId: 'e', from: { x: limit, y: 0 } }
    const { state, events } = applyAction(s, shoot, 'red', createRng(1))
    expect(events.map((e) => e.type).slice(0, 2)).toEqual(['move', 'damage'])
    expect([unit(state, 'r').x, unit(state, 'r').y]).toEqual([limit, 0])
    expect(unit(state, 'r').shotsLeft).toBe(unit(s, 'r').shotsLeft! - 1)
    expect(state.activeUnitId).not.toBe('r')
  })

  it('дальше лимита — нельзя', () => {
    const s = archers()
    const far: Action = { type: 'shoot', unitId: 'r', targetId: 'e', from: { x: shootMoveLimit(unit(s, 'r')) + 1, y: 0 } }
    expect(() => applyAction(s, far, 'red', createRng(1))).toThrow('bad_shoot_position')
  })

  it('подход снимает штраф за дальность — это видно в прогнозе', () => {
    const s = archers()
    const limit = shootMoveLimit(unit(s, 'r'))
    const stay = forecastAction(s, { type: 'shoot', unitId: 'r', targetId: 'e' })!
    const closer = forecastAction(s, { type: 'shoot', unitId: 'r', targetId: 'e', from: { x: limit, y: 0 } })!
    const range = getUnit('knight_archer').ranged!.range
    // Цель в 11 клетках: стоя — штраф; подойдя на limit клеток — без штрафа, если хватает дальности
    expect(stay.penalties).toContain('range')
    if (11 - limit <= range) {
      expect(closer.penalties).not.toContain('range')
      expect(closer.max).toBeGreaterThan(stay.max)
    }
  })

  it('кандидаты: выстрелы с перемещением только в клетки не вплотную к врагу', () => {
    const s = scenario([
      { id: 'r', unit: 'knight_archer', count: 10, x: 4, y: 3 },
      { id: 'e', unit: 'necro_zombie', count: 20, x: 6, y: 3, team: 'blue' },
    ])
    const shots = candidateActions(s, 'red').unit.filter((a): a is Extract<Action, { type: 'shoot' }> => a.type === 'shoot')
    const moved = shots.filter((a) => a.from)
    expect(moved.length).toBeGreaterThan(0)
    for (const a of moved) {
      expect(Math.max(Math.abs(a.from!.x - 4), Math.abs(a.from!.y - 3))).toBeLessThanOrEqual(shootMoveLimit(unit(s, 'r')))
      expect(Math.max(Math.abs(a.from!.x - 6), Math.abs(a.from!.y - 3))).toBeGreaterThan(1)
    }
  })
})
