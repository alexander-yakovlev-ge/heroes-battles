import { describe, expect, it } from 'vitest'
import {
  balanceArmy,
  battleLevelOf,
  canMerge,
  canSplit,
  createBattle,
  createHero,
  createRng,
  heroAtLevel,
  mergeStack,
  prepareArmy,
  splitStack,
  validateDeployment,
  type ArmySlot,
} from '../src/index.js'

const army: ArmySlot[] = [
  { unitId: 'necro_skeleton', count: 40 },
  { unitId: 'necro_zombie', count: 10 },
]

describe('подготовка к бою: разделение стаков', () => {
  it('разделение и объединение сохраняют численность юнитов', () => {
    const split = splitStack(army, 0, 15, '1v1')
    expect(split).toEqual([
      { unitId: 'necro_skeleton', count: 25 },
      { unitId: 'necro_skeleton', count: 15 },
      { unitId: 'necro_zombie', count: 10 },
    ])
    expect(validateDeployment(army, split, '1v1')).toEqual([])
    expect(canMerge(split, 1)).toBe(true)
    expect(canMerge(split, 2)).toBe(false)
    expect(mergeStack(split, 1)).toEqual(army)
    expect(mergeStack(split, 0)).toEqual([
      { unitId: 'necro_skeleton', count: 40 },
      { unitId: 'necro_zombie', count: 10 },
    ])
  })

  it('нельзя превысить лимит стаков режима и разделить стак из одного существа', () => {
    let a: ArmySlot[] = [{ unitId: 'necro_skeleton', count: 10 }, { unitId: 'necro_zombie', count: 1 }]
    expect(canSplit(a, 1, '3v3')).toBe(false)
    a = splitStack(a, 0, 3, '3v3')
    a = splitStack(a, 0, 3, '3v3')
    expect(a).toHaveLength(4)
    expect(canSplit(a, 0, '3v3')).toBe(false)
    expect(() => splitStack(a, 0, 1, '3v3')).toThrow()
    expect(() => splitStack(army, 0, 40, '1v1')).toThrow()
    expect(() => splitStack(army, 0, 0, '1v1')).toThrow()
  })

  it('проверка отклоняет изменённую численность, лишние стаки и пустые стаки', () => {
    const codes = (d: ArmySlot[], mode: '1v1' | '3v3' = '1v1') => validateDeployment(army, d, mode).map((e) => e.code)
    expect(codes([{ unitId: 'necro_skeleton', count: 41 }, { unitId: 'necro_zombie', count: 10 }])).toContain('totals_changed')
    expect(codes([{ unitId: 'necro_skeleton', count: 40 }])).toContain('totals_changed')
    expect(codes([{ unitId: 'necro_skeleton', count: 40 }, { unitId: 'necro_zombie', count: 10 }, { unitId: 'necro_zombie', count: 0 }])).toContain('bad_count')
    const five = [10, 10, 10, 10].map((count) => ({ unitId: 'necro_skeleton', count })).concat([{ unitId: 'necro_zombie', count: 10 }])
    expect(codes(five, '3v3')).toContain('too_many_stacks')
  })

  it('подготовленная армия не меняется повторной балансировкой при создании боя', () => {
    const hero = createHero('p', 'necro', 12)
    const big: ArmySlot[] = [
      { unitId: 'necro_skeleton', count: 500 },
      { unitId: 'necro_bone_dragon', count: 3 },
    ]
    const level = battleLevelOf([hero, createHero('q', 'knight', 8)])
    expect(level).toBe(8)
    const prepared = prepareArmy(hero, big, level, '1v1')
    const deployed = splitStack(prepared, 0, Math.floor(prepared[0]!.count / 2), '1v1')
    const raceSkills = heroAtLevel(hero, level).raceSkills
    expect(balanceArmy(deployed, level, raceSkills, '1v1')).toEqual(deployed)

    const enemy = createHero('q', 'knight', 8)
    const { state } = createBattle(
      {
        mode: '1v1',
        participants: [
          { hero, team: 'red', army: deployed },
          { hero: enemy, team: 'blue', army: [{ unitId: 'knight_peasant', count: 30 }] },
        ],
      },
      createRng(1),
    )
    const red = state.units.filter((u) => u.team === 'red')
    expect(red.map((u) => [u.templateId, u.count])).toEqual(deployed.map((s) => [s.unitId, s.count]))
  })
})
