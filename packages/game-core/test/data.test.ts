import { describe, expect, it } from 'vitest'
import {
  RACES,
  SPELLS,
  TIER_BASELINE,
  UNITS,
  getAvailableSpells,
  getUnit,
  unitPower,
  type RaceId,
  type Tier,
} from '../src/index.js'

const tiers: Tier[] = [1, 2, 3, 4, 5, 6, 7]
const skills = (over: Partial<Record<RaceId, number>> = {}) =>
  Object.fromEntries(RACES.map((r) => [r, over[r] ?? 0])) as Record<RaceId, number>

describe('юниты (§4.1)', () => {
  it('112 юнитов: 8 рас × 7 уровней × (базовый + альтернативный), id уникальны', () => {
    expect(UNITS).toHaveLength(112)
    expect(new Set(UNITS.map((u) => u.id)).size).toBe(112)
    for (const race of RACES)
      for (const tier of tiers)
        for (const variant of ['base', 'alt'] as const)
          expect(UNITS.filter((u) => u.raceId === race && u.tier === tier && u.variant === variant)).toHaveLength(1)
  })

  it('альтернативный юнит сопоставим по силе с базовым (±10%) и стоит столько же', () => {
    for (const race of RACES) {
      for (const tier of tiers) {
        const base = UNITS.find((u) => u.raceId === race && u.tier === tier && u.variant === 'base')!
        const alt = UNITS.find((u) => u.raceId === race && u.tier === tier && u.variant === 'alt')!
        const ratio = unitPower(alt) / unitPower(base)
        expect(ratio, `${alt.id} vs ${base.id}`).toBeGreaterThan(0.9)
        expect(ratio, `${alt.id} vs ${base.id}`).toBeLessThan(1.1)
        expect(alt.weight).toBe(base.weight)
      }
    }
  })

  it('сила базовой линии растёт в 1.8–2.2 раза за уровень', () => {
    const power = (t: Tier) =>
      unitPower({ ...TIER_BASELINE[t], isFlying: false, abilities: [], size: 1 })
    for (let t = 2; t <= 7; t++) {
      const ratio = power(t as Tier) / power((t - 1) as Tier)
      expect(ratio, `tier ${t}`).toBeGreaterThanOrEqual(1.8)
      expect(ratio, `tier ${t}`).toBeLessThanOrEqual(2.2)
    }
  })

  it('вес пропорционален силе, и сила в среднем растёт с уровнем у каждой расы', () => {
    for (const u of UNITS) expect(u.weight / unitPower(u)).toBeCloseTo(1 / 3.3, 1)
    for (const race of RACES) {
      for (let t = 2; t <= 7; t++) {
        const prev = UNITS.find((u) => u.raceId === race && u.tier === t - 1 && u.variant === 'base')!
        const cur = UNITS.find((u) => u.raceId === race && u.tier === t && u.variant === 'base')!
        expect(cur.weight, cur.id).toBeGreaterThan(prev.weight)
      }
    }
  })

  it('корректные параметры: стрелки с дальностью и выстрелами, caster со списком заклинаний, некроманты — нежить', () => {
    for (const u of UNITS) {
      expect(u.damageMin).toBeGreaterThanOrEqual(1)
      expect(u.damageMax).toBeGreaterThanOrEqual(u.damageMin)
      if (u.ranged) {
        expect(u.ranged.range).toBeGreaterThan(0)
        expect(u.ranged.shots).toBeGreaterThan(0)
      }
      if (u.abilities.includes('caster')) expect(u.casterSpells?.length).toBeGreaterThan(0)
      if (u.raceId === 'necro') expect(u.abilities).toContain('undead')
    }
    expect(getUnit('necro_skeleton_archer').ranged).toBeDefined()
    expect(getUnit('necro_bone_dragon').size).toBe(2)
    expect(getUnit('fortress_magma_dragon').isFlying).toBe(false)
  })
})

describe('заклинания (§5.7)', () => {
  it('20 заклинаний, по 2 на школу расы', () => {
    expect(SPELLS).toHaveLength(20)
    for (const race of RACES) expect(SPELLS.filter((s) => s.school === race)).toHaveLength(2)
  })

  it('доступность по уровню и навыку расы', () => {
    expect(getAvailableSpells(1, skills())).toEqual(['lightning_bolt', 'cure', 'haste'])
    expect(getAvailableSpells(5, skills())).toContain('slow')
    expect(getAvailableSpells(5, skills({ necro: 1 }))).not.toContain('curse')
    expect(getAvailableSpells(5, skills({ necro: 2 }))).toContain('curse')
    expect(getAvailableSpells(9, skills({ necro: 9 }))).not.toContain('raise_dead')
    expect(getAvailableSpells(10, skills({ necro: 4 }))).toContain('raise_dead')
    expect(getAvailableSpells(19, skills({ demon: 9 }))).not.toContain('armageddon')
    expect(getAvailableSpells(20, skills({ demon: 8 }))).toContain('armageddon')
  })

  it('параллельная прокачка рас открывает несколько школ', () => {
    const spells = getAvailableSpells(15, skills({ knight: 6, wizard: 6 }))
    expect(spells).toEqual(expect.arrayContaining(['resurrection', 'chain_lightning', 'blind', 'divine_strength']))
  })
})
