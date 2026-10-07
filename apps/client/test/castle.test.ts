import { describe, expect, it } from 'vitest'
import { createHero, getUnit, unitCost } from '@hb/game-core'
import { addUnit, armyErrorMessage, pairSlotOf, swapVariant, validate } from '../src/features/castle/army'

const hero = { ...createHero('u', 'necro', 5), raceSkills: { ...createHero('u', 'necro', 5).raceSkills, necro: 4 } }

describe('Замок: один вариант юнита на уровень расы (§6.2)', () => {
  it('оба варианта уровня в армии — ошибка с названием расы и уровнем', () => {
    const errs = validate(
      [
        { unitId: 'necro_skeleton', count: 10 },
        { unitId: 'necro_skeleton_archer', count: 5 },
      ],
      hero,
    )
    expect(errs).toEqual([{ code: 'variant_conflict', raceId: 'necro', tier: 1 }])
    expect(armyErrorMessage(errs[0]!)).toEqual(['castle.errVariant', { raceKey: 'race.necro', tier: 1 }])
  })

  it('замена варианта сохраняет вес стака и место в армии', () => {
    const slots = addUnit(addUnit([], 'necro_skeleton', hero), 'necro_zombie', hero)
    expect(pairSlotOf(slots, 'necro_skeleton_archer')?.unitId).toBe('necro_skeleton')
    const swapped = swapVariant(slots, 'necro_skeleton_archer', hero)
    expect(swapped.map((s) => s.unitId)).toEqual(['necro_skeleton_archer', 'necro_zombie'])
    const before = unitCost(getUnit('necro_skeleton'), hero.raceSkills) * slots[0]!.count
    const after = unitCost(getUnit('necro_skeleton_archer'), hero.raceSkills) * swapped[0]!.count
    expect(after).toBeLessThanOrEqual(before + 1e-9)
    expect(validate(swapped, hero)).toEqual([])
  })
})
