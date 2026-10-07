import { describe, expect, it } from 'vitest'
import {
  DEPLOY_COLUMNS,
  MODE_CONFIG,
  RACES,
  allocateRaceSkill,
  allocateStat,
  applyExperience,
  armyWeight,
  balanceArmy,
  unitsOfRace,
  counterpartOf,
  balanceHero,
  createHero,
  createRng,
  expNeeded,
  generateGrid,
  getUnit,
  heroAtLevel,
  isUnitUnlocked,
  levelsCompatible,
  maxWeight,
  ratingChanges,
  reachable,
  respec,
  unitCost,
  validateArmy,
  type Mode,
  type RaceId,
} from '../src/index.js'

const skills = (over: Partial<Record<RaceId, number>> = {}) =>
  Object.fromEntries(RACES.map((r) => [r, over[r] ?? 0])) as Record<RaceId, number>

describe('rng', () => {
  it('детерминирован и восстанавливается из состояния', () => {
    const a = createRng('battle-1')
    const b = createRng('battle-1')
    const seqA = Array.from({ length: 50 }, () => a.next())
    expect(Array.from({ length: 50 }, () => b.next())).toEqual(seqA)
    const saved = a.state()
    const next = a.int(1, 100)
    expect(createRng(saved).int(1, 100)).toBe(next)
  })

  it('int в заданных границах и покрывает весь диапазон', () => {
    const r = createRng(42)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const v = r.int(3, 7)
      expect(v).toBeGreaterThanOrEqual(3)
      expect(v).toBeLessThanOrEqual(7)
      seen.add(v)
    }
    expect(seen.size).toBe(5)
  })
})

describe('поле (§5.1)', () => {
  const modes: Mode[] = ['1v1', '2v2', '3v3']
  it.each(modes)('%s: размер, доля препятствий, симметрия, свободные зоны расстановки, связность', (mode) => {
    for (let seed = 0; seed < 40; seed++) {
      const grid = generateGrid(mode, createRng(seed))
      const { width, height } = MODE_CONFIG[mode]
      expect(grid.width).toBe(width)
      expect(grid.height).toBe(height)
      const ratio = grid.obstacles.length / (width * height)
      expect(ratio).toBeGreaterThanOrEqual(0.09)
      expect(ratio).toBeLessThanOrEqual(0.15)
      const set = new Set(grid.obstacles.map(([x, y]) => `${x},${y}`))
      for (const [x, y] of grid.obstacles) {
        expect(set.has(`${width - 1 - x},${y}`)).toBe(true)
        expect(x).toBeGreaterThanOrEqual(DEPLOY_COLUMNS)
        expect(x).toBeLessThan(width - DEPLOY_COLUMNS)
      }
      const blocked = new Set(grid.obstacles.map(([x, y]) => y * 1000 + x))
      for (const size of [1, 2]) {
        const dist = reachable(grid, blocked, { x: 0, y: 0, size }, Infinity)
        expect(dist.has((height - size) * 1000 + (width - size))).toBe(true)
      }
    }
  })
})

describe('герой и прогрессия (§11)', () => {
  it('опыт повышает уровень, очко статов за уровень, очко навыка рас каждый 3-й уровень', () => {
    let h = createHero('u', 'necro')
    expect(h.raceSkills.necro).toBe(3)
    h = applyExperience(h, expNeeded(1) + expNeeded(2) + 10)
    expect(h.level).toBe(3)
    expect(h.experience).toBe(10)
    expect(h.pendingStatPoints).toBe(2)
    expect(h.pendingRaceSkillPoints).toBe(1)
  })

  it('уровень ограничен 30', () => {
    const h = applyExperience(createHero('u', 'elf'), 10_000_000)
    expect(h.level).toBe(30)
    expect(h.pendingStatPoints).toBe(29)
    expect(h.pendingRaceSkillPoints).toBe(10)
  })

  it('распределение очков пишет историю; навык не выше 9; разные расы параллельно', () => {
    let h = createHero('u', 'knight', 18)
    h = allocateStat(allocateStat(h, 'attack'), 'power')
    expect(h.stats).toEqual({ attack: 2, defense: 1, power: 2, knowledge: 1 })
    expect(h.statHistory).toEqual(['attack', 'power'])
    for (let i = 0; i < 6; i++) h = allocateRaceSkill(h, 'knight')
    expect(h.raceSkills.knight).toBe(9)
    expect(h.pendingRaceSkillPoints).toBe(0)
    let h2 = createHero('u', 'knight', 18)
    h2 = allocateRaceSkill(allocateRaceSkill(h2, 'wizard'), 'elf')
    expect(h2.raceSkills).toMatchObject({ knight: 3, wizard: 1, elf: 1 })
    expect(() => allocateRaceSkill(createHero('x', 'knight', 1), 'knight')).toThrow()
  })

  it('приведение к уровню берёт первые очки из истории (§8)', () => {
    let h = createHero('u', 'necro', 12)
    for (const s of ['attack', 'attack', 'defense', 'power', 'power', 'power', 'knowledge', 'attack', 'attack', 'attack', 'attack'] as const)
      h = allocateStat(h, s)
    for (const r of ['necro', 'demon', 'necro', 'necro'] as const) h = allocateRaceSkill(h, r)
    const at9 = heroAtLevel(h, 9)
    expect(at9.stats).toEqual({ attack: 4, defense: 2, power: 4, knowledge: 2 })
    expect(at9.raceSkills).toMatchObject({ necro: 5, demon: 1 })
    expect(heroAtLevel(h, 12).stats).toEqual(h.stats)
    const bh = balanceHero(h, 9, 'red')
    expect(bh.maxMana).toBe(20)
    expect(bh.spells).toContain('curse')
    expect(bh.spells).not.toContain('raise_dead')
  })

  it('перераспределение: бесплатно раз в сезон, затем только с зельем', () => {
    let h = allocateStat(createHero('u', 'demon', 4), 'attack')
    h = allocateRaceSkill(h, 'demon')
    const r1 = respec(h, 3, false)
    expect(r1.statHistory).toEqual([])
    expect(r1.pendingStatPoints).toBe(3)
    expect(r1.pendingRaceSkillPoints).toBe(1)
    expect(r1.raceSkills.demon).toBe(3)
    expect(r1.lastFreeRespecSeason).toBe(3)
    expect(() => respec(r1, 3, false)).toThrow()
    expect(respec(r1, 3, true).lastFreeRespecSeason).toBe(3)
    expect(respec(r1, 4, false).lastFreeRespecSeason).toBe(4)
  })
})

describe('армия (§4.2, §6, §8)', () => {
  it('стоимость зависит от навыка расы', () => {
    const u = getUnit('necro_skeleton')
    expect(unitCost(u, skills({ necro: 0 }))).toBeCloseTo(u.weight * 2)
    expect(unitCost(u, skills({ necro: 3 }))).toBeCloseTo(u.weight)
    expect(unitCost(u, skills({ necro: 9 }))).toBeCloseTo(u.weight * 0.5)
  })

  it('открытие юнитов: уровни по уровню героя, альтернативы по навыку расы', () => {
    const lich = getUnit('necro_lich')
    const dk = getUnit('necro_death_knight')
    expect(isUnitUnlocked(lich, 9, skills({ necro: 9 }))).toBe(false)
    expect(isUnitUnlocked(lich, 10, skills())).toBe(true)
    expect(isUnitUnlocked(dk, 10, skills({ necro: 5 }))).toBe(false)
    expect(isUnitUnlocked(dk, 10, skills({ necro: 6 }))).toBe(true)
    expect(isUnitUnlocked(getUnit('necro_skeleton_archer'), 1, skills({ necro: 4 }))).toBe(true)
    expect(isUnitUnlocked(getUnit('necro_bone_dragon'), 17, skills({ necro: 9 }))).toBe(false)
  })

  it('validateArmy находит все нарушения', () => {
    const s = skills({ necro: 3 })
    expect(validateArmy([], 1, s, '1v1')).toEqual([{ code: 'empty' }])
    expect(validateArmy([{ unitId: 'necro_skeleton', count: 10 }], 1, s, '1v1')).toEqual([])
    const errs = validateArmy(
      [
        { unitId: 'necro_lich', count: 1 },
        { unitId: 'nope', count: 1 },
        { unitId: 'necro_skeleton', count: 0 },
        { unitId: 'necro_zombie', count: 1000 },
      ],
      1,
      s,
      '1v1',
    ).map((e) => e.code)
    expect(errs).toEqual(expect.arrayContaining(['locked_unit', 'unknown_unit', 'bad_count', 'overweight']))
    const six = Array.from({ length: 6 }, () => ({ unitId: 'necro_skeleton', count: 1 }))
    expect(validateArmy(six, 1, s, '3v3').map((e) => e.code)).toContain('too_many_stacks')
  })

  it('балансировка армии: замена закрытых юнитов с сохранением веса и урезание до лимита', () => {
    const level = 10
    const s = skills({ necro: 5 })
    const army = balanceArmy(
      [
        { unitId: 'necro_bone_dragon', count: 2 },
        { unitId: 'necro_death_knight', count: 3 },
        { unitId: 'necro_skeleton', count: 40 },
      ],
      level,
      s,
      '1v1',
    )
    expect(army.map((a) => a.unitId)).toEqual(['necro_lich', 'necro_lich', 'necro_skeleton'])
    expect(armyWeight(army, s)).toBeLessThanOrEqual(maxWeight(level))
    for (const slot of army) expect(isUnitUnlocked(getUnit(slot.unitId), level, s)).toBe(true)
  })

  it('на уровне расы в бой идёт только один вариант юнита (§6.2)', () => {
    const s = skills({ necro: 4, knight: 4 })
    const both = [
      { unitId: 'necro_skeleton', count: 10 },
      { unitId: 'necro_skeleton_archer', count: 10 },
    ]
    expect(validateArmy(both, 5, s, '1v1')).toEqual([{ code: 'variant_conflict', raceId: 'necro', tier: 1 }])
    // один вариант несколькими стаками и юниты того же уровня другой расы — можно
    expect(validateArmy([{ unitId: 'necro_skeleton', count: 5 }, { unitId: 'necro_skeleton', count: 5 }], 5, s, '1v1')).toEqual([])
    const knightT1 = unitsOfRace('knight').find((u) => u.tier === 1 && u.variant === 'alt')!
    expect(validateArmy([{ unitId: 'necro_skeleton', count: 5 }, { unitId: knightT1.id, count: 5 }], 5, s, '1v1')).toEqual([])
    // при входе в бой второй вариант переводится в первый с сохранением веса
    const army = balanceArmy(both, 5, s, '1v1')
    expect(army.map((a) => a.unitId)).toEqual(['necro_skeleton', 'necro_skeleton'])
    const archer = getUnit('necro_skeleton_archer')
    expect(army[1]!.count).toBe(Math.floor((10 * archer.weight) / getUnit('necro_skeleton').weight))
    expect(counterpartOf(archer)?.id).toBe('necro_skeleton')
  })

  it('армия в пределах лимита и открытая не меняется', () => {
    const s = skills({ necro: 3 })
    const slots = [{ unitId: 'necro_skeleton', count: 20 }]
    expect(balanceArmy(slots, 5, s, '1v1')).toEqual(slots)
  })
})

describe('рейтинг и подбор (§7)', () => {
  it('Elo: равные рейтинги, K = 32 для новичков и 16 после 10 боёв', () => {
    const ch = ratingChanges(
      [
        { uid: 'a', team: 'red', rating: 1000, games: 0 },
        { uid: 'b', team: 'blue', rating: 1000, games: 50 },
      ],
      'red',
    )
    expect(ch).toEqual({ a: 16, b: -8 })
  })

  it('командный рейтинг считается по среднему; ничья', () => {
    const ch = ratingChanges(
      [
        { uid: 'a', team: 'red', rating: 1200, games: 20 },
        { uid: 'b', team: 'red', rating: 1000, games: 20 },
        { uid: 'c', team: 'blue', rating: 1100, games: 20 },
        { uid: 'd', team: 'blue', rating: 1100, games: 20 },
      ],
      'draw',
    )
    expect(ch).toEqual({ a: 0, b: 0, c: 0, d: 0 })
  })

  it('разница уровней не больше 3', () => {
    expect(levelsCompatible([10, 13])).toBe(true)
    expect(levelsCompatible([10, 14])).toBe(false)
    expect(levelsCompatible([5, 6, 8, 7])).toBe(true)
  })
})
