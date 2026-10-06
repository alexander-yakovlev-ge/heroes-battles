import { describe, expect, it } from 'vitest'
import {
  DEPLOY_COLUMNS,
  IllegalActionError,
  MODE_CONFIG,
  ROLE_ADVANTAGE,
  UNITS,
  allocateStat,
  applyAction,
  applyTimeout,
  attackMultiplier,
  computeDamage,
  createBattle,
  createBotArmy,
  createBotHero,
  createHero,
  createRng,
  effectiveInitiative,
  getUnit,
  movePositions,
  rectCells,
  roleMultiplier,
  type BattleEvent,
  type BattleState,
  type Mode,
} from '../src/index.js'
import { plainHero, scenario, unit } from './fixtures.js'

const rng = () => createRng(7)
const damageEvents = (events: BattleEvent[], kind?: string) =>
  events.filter((e): e is Extract<BattleEvent, { type: 'damage' }> => e.type === 'damage' && (!kind || e.kind === kind))

describe('создание боя', () => {
  const modes: Mode[] = ['1v1', '2v2', '3v3']
  it.each(modes)('%s: расстановка без пересечений, у своего края, очередь по инициативе', (mode) => {
    for (let seed = 0; seed < 10; seed++) {
      const r = createRng(seed)
      const per = MODE_CONFIG[mode].heroesPerTeam
      const participants = Array.from({ length: per * 2 }, (_, i) => {
        const hero = createBotHero(`h${i}`, 12 + (i % 3), r)
        return { hero, team: (i < per ? 'red' : 'blue') as 'red' | 'blue', army: createBotArmy(hero, mode, r) }
      })
      const { state } = createBattle({ mode, participants }, r)
      expect(state.battleLevel).toBe(12)
      const cells = new Set<string>()
      for (const [x, y] of state.grid.obstacles) cells.add(`${x},${y}`)
      for (const u of state.units) {
        for (const c of rectCells({ x: u.x, y: u.y, size: getUnit(u.templateId).size })) {
          const k = `${c.x},${c.y}`
          expect(cells.has(k), `overlap ${k}`).toBe(false)
          cells.add(k)
        }
        if (u.team === 'red') expect(u.x).toBeLessThan(state.grid.width / 2)
        else expect(u.x).toBeGreaterThanOrEqual(state.grid.width / 2)
      }
      const inits = state.queue.map((id) => effectiveInitiative(state, unit(state, id)))
      for (let i = 1; i < inits.length; i++) expect(inits[i - 1]!).toBeGreaterThanOrEqual(inits[i]!)
      expect(state.activeUnitId).toBe(state.queue[0])
    }
  })

  it('большинство юнитов стоит в зоне расстановки (2 столбца)', () => {
    const r = createRng(3)
    const a = createHero('a', 'necro', 1)
    const b = createHero('b', 'knight', 1)
    const { state } = createBattle(
      {
        mode: '1v1',
        participants: [
          { hero: a, team: 'red', army: [{ unitId: 'necro_skeleton', count: 10 }, { unitId: 'necro_zombie', count: 5 }] },
          { hero: b, team: 'blue', army: [{ unitId: 'knight_peasant', count: 20 }] },
        ],
      },
      r,
    )
    for (const u of state.units) {
      if (u.team === 'red') expect(u.x).toBeLessThan(DEPLOY_COLUMNS)
      else expect(u.x).toBeGreaterThanOrEqual(state.grid.width - DEPLOY_COLUMNS)
    }
  })

  it('бой идёт на уровне слабейшего: статы сильного приводятся вниз', () => {
    let strong = createHero('s', 'necro', 13)
    for (let i = 0; i < 12; i++) strong = allocateStat(strong, 'attack')
    const weak = createHero('w', 'knight', 10)
    const { state } = createBattle(
      {
        mode: '1v1',
        participants: [
          { hero: strong, team: 'red', army: [{ unitId: 'necro_skeleton', count: 10 }] },
          { hero: weak, team: 'blue', army: [{ unitId: 'knight_peasant', count: 10 }] },
        ],
      },
      rng(),
    )
    expect(state.battleLevel).toBe(10)
    expect(state.heroes.s!.stats.attack).toBe(10)
    expect(state.heroes.s!.realLevel).toBe(13)
  })

  it('неверный состав команд отклоняется', () => {
    const h = createHero('a', 'necro')
    expect(() => createBattle({ mode: '1v1', participants: [{ hero: h, team: 'red', army: [] }] }, rng())).toThrow()
  })
})

describe('действия и очередь', () => {
  const base = () =>
    scenario([
      { id: 'sk', unit: 'necro_skeleton', count: 10, x: 0, y: 0 },
      { id: 'pe', unit: 'knight_peasant', count: 10, x: 11, y: 0, team: 'blue' },
    ])

  it('перемещение в пределах скорости; ход переходит следующему', () => {
    const { state, events } = applyAction(base(), { type: 'move', unitId: 'sk', to: { x: 4, y: 0 } }, 'red', rng())
    expect(unit(state, 'sk')).toMatchObject({ x: 4, y: 0 })
    expect(events[0]).toMatchObject({ type: 'move' })
    expect(state.activeUnitId).toBe('pe')
    expect(state.seq).toBe(1)
  })

  it('запрещённые действия: слишком далеко, чужой юнит, не свой ход', () => {
    const s = base()
    const err = (fn: () => unknown) => {
      try {
        fn()
      } catch (e) {
        return (e as IllegalActionError).code
      }
      return null
    }
    expect(err(() => applyAction(s, { type: 'move', unitId: 'sk', to: { x: 6, y: 0 } }, 'red', rng()))).toBe('bad_move')
    expect(err(() => applyAction(s, { type: 'move', unitId: 'sk', to: { x: 2, y: 0 } }, 'blue', rng()))).toBe('not_owner')
    expect(err(() => applyAction(s, { type: 'move', unitId: 'pe', to: { x: 10, y: 0 } }, 'blue', rng()))).toBe('not_active_unit')
    // Исходное состояние не изменилось
    expect(unit(s, 'sk')).toMatchObject({ x: 0, y: 0 })
  })

  it('Wait переносит юнит в конец очереди, повторно нельзя', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 5, x: 0, y: 0 },
      { id: 'b', unit: 'necro_skeleton', count: 5, x: 0, y: 2 },
      { id: 'e', unit: 'knight_peasant', count: 5, x: 11, y: 0, team: 'blue' },
    ])
    const { state } = applyAction(s, { type: 'wait', unitId: 'a' }, 'red', rng())
    expect(state.queue).toEqual(['b', 'e', 'a'])
    const s2 = applyAction(applyAction(state, { type: 'defend', unitId: 'b' }, 'red', rng()).state, { type: 'defend', unitId: 'e' }, 'blue', rng()).state
    expect(s2.activeUnitId).toBe('a')
    expect(() => applyAction(s2, { type: 'wait', unitId: 'a' }, 'red', rng())).toThrow()
  })

  it('Defend увеличивает защиту до следующего хода', () => {
    const s = base()
    const attacker = unit(s, 'pe')
    const target = unit(s, 'sk')
    const before = computeDamage(s, attacker, target, { kind: 'melee' }, null)
    const { state } = applyAction(s, { type: 'defend', unitId: 'sk' }, 'red', rng())
    const after = computeDamage(state, unit(state, 'pe'), unit(state, 'sk'), { kind: 'melee' }, null)
    expect(after).toBeLessThan(before)
  })
})

describe('урон (§5.5)', () => {
  it('множитель атаки ограничен 3.0 и 0.3, не бывает отрицательным', () => {
    expect(attackMultiplier(0)).toBe(1)
    expect(attackMultiplier(10)).toBeCloseTo(1.5)
    expect(attackMultiplier(100)).toBe(3)
    expect(attackMultiplier(-20)).toBeCloseTo(0.5)
    expect(attackMultiplier(-1000)).toBe(0.3)
  })

  it('ожидаемый урон = средний урон × число × множитель', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 20, x: 0, y: 0 },
      { id: 'b', unit: 'necro_skeleton', count: 20, x: 1, y: 0, team: 'blue' },
    ])
    const t = getUnit('necro_skeleton')
    const dmg = computeDamage(s, unit(s, 'a'), unit(s, 'b'), { kind: 'melee' }, null)
    expect(dmg).toBeCloseTo(((t.damageMin + t.damageMax) / 2) * 20)
    const roll = computeDamage(s, unit(s, 'a'), unit(s, 'b'), { kind: 'melee' }, createRng(1))
    expect(roll).toBeGreaterThanOrEqual(t.damageMin * 20)
    expect(roll).toBeLessThanOrEqual(t.damageMax * 20)
  })

  it('стрелок вплотную к врагу и дальше дальности — штраф 50%', () => {
    const near = scenario([
      { id: 'ar', unit: 'necro_skeleton_archer', count: 10, x: 0, y: 0 },
      { id: 'e1', unit: 'knight_peasant', count: 10, x: 1, y: 0, team: 'blue' },
      { id: 'e2', unit: 'knight_peasant', count: 10, x: 5, y: 0, team: 'blue' },
      { id: 'e3', unit: 'knight_peasant', count: 10, x: 11, y: 7, team: 'blue' },
    ])
    const free = scenario([
      { id: 'ar', unit: 'necro_skeleton_archer', count: 10, x: 0, y: 0 },
      { id: 'e2', unit: 'knight_peasant', count: 10, x: 5, y: 0, team: 'blue' },
      { id: 'e3', unit: 'knight_peasant', count: 10, x: 11, y: 7, team: 'blue' },
    ])
    const dNear = computeDamage(near, unit(near, 'ar'), unit(near, 'e2'), { kind: 'ranged' }, null)
    const dFree = computeDamage(free, unit(free, 'ar'), unit(free, 'e2'), { kind: 'ranged' }, null)
    const dFar = computeDamage(free, unit(free, 'ar'), unit(free, 'e3'), { kind: 'ranged' }, null)
    expect(dNear).toBeCloseTo(dFree / 2)
    expect(dFar).toBeCloseTo(dFree / 2)
  })

  it('треугольник ролей: стрелки > тяжёлые > мобильные > стрелки', () => {
    const s = scenario([
      { id: 'sh', unit: 'necro_skeleton_archer', count: 10, x: 0, y: 0 },
      { id: 'hv', unit: 'necro_skeleton', count: 10, x: 5, y: 0, team: 'blue' },
      { id: 'mb', unit: 'necro_ghost', count: 10, x: 9, y: 0, team: 'blue' },
    ])
    const [sh, hv, mb] = ['sh', 'hv', 'mb'].map((id) => unit(s, id))
    expect(roleMultiplier(sh!, hv!)).toBe(1 + ROLE_ADVANTAGE.shooter.bonus)
    expect(roleMultiplier(hv!, mb!)).toBe(1 + ROLE_ADVANTAGE.heavy.bonus)
    expect(roleMultiplier(mb!, sh!)).toBe(1 + ROLE_ADVANTAGE.mobile.bonus)
    for (const [a, b] of [[hv, sh], [mb, hv], [sh, mb], [hv, hv]] as const) expect(roleMultiplier(a!, b!)).toBe(1)

    // Множитель входит в урон удара
    const withRole = computeDamage(s, hv!, mb!, { kind: 'melee' }, null)
    const saved = ROLE_ADVANTAGE.heavy.bonus
    ROLE_ADVANTAGE.heavy.bonus = 0
    try {
      expect(withRole / computeDamage(s, hv!, mb!, { kind: 'melee' }, null)).toBeCloseTo(1 + saved)
    } finally {
      ROLE_ADVANTAGE.heavy.bonus = saved
    }
  })

  it('роль юнита: стрелки — shooter, летающие нестрелки — mobile', () => {
    for (const u of UNITS) {
      if (u.ranged) expect(u.role, u.id).toBe('shooter')
      else if (u.isFlying) expect(u.role, u.id).toBe('mobile')
      else expect(['heavy', 'mobile'], u.id).toContain(u.role)
    }
  })

  it('выстрел тратит боезапас и не вызывает ответного удара', () => {
    const s = scenario([
      { id: 'ar', unit: 'necro_skeleton_archer', count: 10, x: 0, y: 0 },
      { id: 'e', unit: 'knight_peasant', count: 50, x: 5, y: 0, team: 'blue' },
    ])
    const { state, events } = applyAction(s, { type: 'shoot', unitId: 'ar', targetId: 'e' }, 'red', rng())
    expect(unit(state, 'ar').shotsLeft).toBe(getUnit('necro_skeleton_archer').ranged!.shots - 1)
    expect(damageEvents(events, 'retaliation')).toHaveLength(0)
    expect(damageEvents(events, 'ranged')).toHaveLength(1)
  })
})

describe('ближний бой и способности (§5.6)', () => {
  it('ответный удар — один раз за раунд', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 10, x: 0, y: 0 },
      { id: 'b', unit: 'necro_skeleton', count: 10, x: 0, y: 2 },
      { id: 'e', unit: 'knight_peasant', count: 50, x: 1, y: 1, team: 'blue' },
    ])
    const r1 = applyAction(s, { type: 'attack', unitId: 'a', targetId: 'e', from: { x: 0, y: 0 } }, 'red', rng())
    expect(damageEvents(r1.events, 'retaliation')).toHaveLength(1)
    expect(unit(r1.state, 'e').retaliatedThisRound).toBe(true)
    const r2 = applyAction(r1.state, { type: 'attack', unitId: 'b', targetId: 'e', from: { x: 0, y: 2 } }, 'red', rng())
    expect(damageEvents(r2.events, 'retaliation')).toHaveLength(0)
  })

  it('unlimited_retaliation отвечает на каждую атаку', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 10, x: 0, y: 0 },
      { id: 'b', unit: 'necro_skeleton', count: 10, x: 0, y: 2 },
      { id: 'e', unit: 'knight_spearman', count: 30, x: 1, y: 1, team: 'blue' },
    ])
    const r1 = applyAction(s, { type: 'attack', unitId: 'a', targetId: 'e', from: { x: 0, y: 0 } }, 'red', rng())
    const r2 = applyAction(r1.state, { type: 'attack', unitId: 'b', targetId: 'e', from: { x: 0, y: 2 } }, 'red', rng())
    expect(damageEvents(r2.events, 'retaliation')).toHaveLength(1)
  })

  it('no_retaliation: цель не отвечает; life_drain лечит атакующего', () => {
    const s = scenario([
      { id: 'v', unit: 'necro_vampire', count: 10, x: 0, y: 0 },
      { id: 'e', unit: 'knight_spearman', count: 200, x: 3, y: 0, team: 'blue' },
    ])
    s.units[0]!.count = 6
    const { state, events } = applyAction(s, { type: 'attack', unitId: 'v', targetId: 'e', from: { x: 2, y: 0 } }, 'red', rng())
    expect(damageEvents(events, 'retaliation')).toHaveLength(0)
    expect(events.some((e) => e.type === 'heal' && e.targetId === 'v')).toBe(true)
    expect(unit(state, 'v').count).toBeGreaterThan(6)
    expect(unit(state, 'v').count).toBeLessThanOrEqual(10)
  })

  it('double_attack: два удара по цели', () => {
    const s = scenario([
      { id: 'w', unit: 'barbarian_wolf_rider', count: 20, x: 0, y: 0 },
      { id: 'e', unit: 'knight_peasant', count: 40, x: 1, y: 0, team: 'blue' },
    ])
    const { events } = applyAction(s, { type: 'attack', unitId: 'w', targetId: 'e', from: { x: 0, y: 0 } }, 'red', rng())
    expect(damageEvents(events, 'melee').filter((e) => e.targetId === 'e')).toHaveLength(2)
  })

  it('charge: урон растёт с пройденным расстоянием', () => {
    const s = scenario([
      { id: 'c', unit: 'knight_cavalier', count: 5, x: 0, y: 0 },
      { id: 'e', unit: 'necro_zombie', count: 50, x: 6, y: 0, team: 'blue' },
    ])
    const c = unit(s, 'c')
    const e = unit(s, 'e')
    const still = computeDamage(s, c, e, { kind: 'melee', chargeCells: 0 }, null)
    const ran = computeDamage(s, c, e, { kind: 'melee', chargeCells: 4 }, null)
    expect(ran / still).toBeCloseTo(1.2)
  })

  it('area_attack задевает соседей цели, включая своих', () => {
    const s = scenario([
      { id: 'l', unit: 'necro_lich', count: 10, x: 0, y: 0 },
      { id: 'ally', unit: 'necro_skeleton', count: 10, x: 6, y: 3 },
      { id: 'e', unit: 'knight_peasant', count: 10, x: 6, y: 2, team: 'blue' },
      { id: 'e2', unit: 'knight_peasant', count: 10, x: 7, y: 1, team: 'blue' },
      { id: 'far', unit: 'knight_peasant', count: 10, x: 10, y: 7, team: 'blue' },
    ])
    const { events } = applyAction(s, { type: 'shoot', unitId: 'l', targetId: 'e' }, 'red', rng())
    const hit = new Set(damageEvents(events).map((e) => e.targetId))
    expect(hit).toEqual(new Set(['e', 'ally', 'e2']))
  })

  it('poison: яд наносит урон в начале хода цели; нежить иммунна', () => {
    const s = scenario([
      { id: 'g', unit: 'necro_ghoul', count: 10, x: 0, y: 0 },
      { id: 'e', unit: 'knight_peasant', count: 20, x: 1, y: 0, team: 'blue' },
    ])
    const r = applyAction(s, { type: 'attack', unitId: 'g', targetId: 'e', from: { x: 0, y: 0 } }, 'red', rng())
    expect(unit(r.state, 'e').effects.some((x) => x.id === 'poison')).toBe(true)
    expect(damageEvents(r.events, 'poison')).toHaveLength(1)

    const undead = scenario([
      { id: 'g', unit: 'necro_ghoul', count: 10, x: 0, y: 0 },
      { id: 'e', unit: 'necro_zombie', count: 100, x: 1, y: 0, team: 'blue' },
    ])
    const r2 = applyAction(undead, { type: 'attack', unitId: 'g', targetId: 'e', from: { x: 0, y: 0 } }, 'red', rng())
    expect(unit(r2.state, 'e').effects.some((x) => x.id === 'poison')).toBe(false)
  })

  it('окаменение и слепота — пропуск хода; урон снимает слепоту', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 5, x: 0, y: 0 },
      { id: 'p', unit: 'knight_peasant', count: 5, x: 11, y: 0, team: 'blue' },
      { id: 'b', unit: 'knight_peasant', count: 5, x: 11, y: 4, team: 'blue' },
    ])
    unit(s, 'p').effects.push({ id: 'petrified', roundsLeft: 99 })
    unit(s, 'b').effects.push({ id: 'blind', roundsLeft: 2 })
    const { state, events } = applyAction(s, { type: 'defend', unitId: 'a' }, 'red', rng())
    expect(events.filter((e) => e.type === 'skip_turn').map((e) => (e as { reason: string }).reason)).toEqual(['petrified', 'blind'])
    expect(unit(state, 'p').effects).toHaveLength(0)
    expect(state.round).toBe(2)
  })

  it('rebirth: феникс возрождается один раз', () => {
    const s = scenario([
      { id: 'k', unit: 'knight_angel', count: 50, x: 0, y: 0 },
      { id: 'ph', unit: 'elf_phoenix', count: 2, x: 1, y: 0, team: 'blue' },
    ])
    const { state, events } = applyAction(s, { type: 'attack', unitId: 'k', targetId: 'ph', from: { x: 0, y: 0 } }, 'red', rng())
    expect(events.some((e) => e.type === 'rebirth')).toBe(true)
    expect(unit(state, 'ph').count).toBe(1)
    expect(unit(state, 'ph').rebirthUsed).toBe(true)
  })

  it('крупный юнит 2×2: нужны 4 свободные клетки; соседство по любой клетке', () => {
    const s = scenario(
      [
        { id: 'big', unit: 'necro_abomination', count: 2, x: 0, y: 0 },
        { id: 'e', unit: 'knight_peasant', count: 10, x: 2, y: 1, team: 'blue' },
      ],
      { obstacles: [[3, 3]], level: 14 },
    )
    const positions = movePositions(s, unit(s, 'big'))
    for (const p of positions.values()) {
      const cells = rectCells({ x: p.x, y: p.y, size: 2 })
      expect(cells.some((c) => c.x === 3 && c.y === 3)).toBe(false)
      expect(cells.some((c) => c.x === 2 && c.y === 1)).toBe(false)
    }
    const { events } = applyAction(s, { type: 'attack', unitId: 'big', targetId: 'e', from: { x: 0, y: 0 } }, 'red', rng())
    expect(damageEvents(events, 'melee')).toHaveLength(1)
  })
})

describe('заклинания героя', () => {
  const withMana = () => {
    const red = createHero('red', 'necro', 10)
    const blue = createHero('blue', 'knight', 10)
    return scenario(
      [
        { id: 'a', unit: 'necro_skeleton', count: 10, x: 0, y: 0 },
        { id: 'e', unit: 'knight_peasant', count: 30, x: 8, y: 0, team: 'blue' },
        { id: 'dragon', unit: 'wizard_arcane_dragon', count: 1, x: 8, y: 4, team: 'blue' },
      ],
      { heroes: [red, blue], level: 10 },
    )
  }

  it('каст тратит ману, не тратит ход, один раз за раунд', () => {
    const s = withMana()
    const { state, events } = applyAction(s, { type: 'cast', heroUid: 'red', spellId: 'lightning_bolt', target: { x: 8, y: 0 } }, 'red', rng())
    expect(state.heroes.red!.mana).toBe(s.heroes.red!.mana - 8)
    expect(state.activeUnitId).toBe('a')
    expect(damageEvents(events, 'spell')).toHaveLength(1)
    expect(() =>
      applyAction(state, { type: 'cast', heroUid: 'red', spellId: 'haste', target: { x: 0, y: 0 } }, 'red', rng()),
    ).toThrow('already_cast')
  })

  it('нельзя: не хватает маны, неверная цель, иммунитет, не свой ход', () => {
    const s = withMana()
    s.heroes.red!.mana = 5
    expect(() => applyAction(s, { type: 'cast', heroUid: 'red', spellId: 'lightning_bolt', target: { x: 8, y: 0 } }, 'red', rng())).toThrow('no_mana')
    s.heroes.red!.mana = 50
    expect(() => applyAction(s, { type: 'cast', heroUid: 'red', spellId: 'lightning_bolt', target: { x: 0, y: 0 } }, 'red', rng())).toThrow('bad_target')
    expect(() => applyAction(s, { type: 'cast', heroUid: 'red', spellId: 'lightning_bolt', target: { x: 8, y: 4 } }, 'red', rng())).toThrow('bad_target')
    expect(() => applyAction(s, { type: 'cast', heroUid: 'blue', spellId: 'cure', target: { x: 8, y: 0 } }, 'blue', rng())).toThrow('not_your_turn')
  })

  it('баф действует 3 раунда и влияет на инициативу', () => {
    const s = withMana()
    const { state } = applyAction(s, { type: 'cast', heroUid: 'red', spellId: 'haste', target: { x: 0, y: 0 } }, 'red', rng())
    const a = unit(state, 'a')
    expect(effectiveInitiative(state, a)).toBe(getUnit('necro_skeleton').initiative + 3)
    expect(a.effects).toEqual([{ id: 'haste', roundsLeft: 3 }])
  })
})

describe('конец боя', () => {
  it('три тайм-аута подряд — сдача и поражение', () => {
    let s: BattleState = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 5, x: 0, y: 0 },
      { id: 'e', unit: 'knight_peasant', count: 5, x: 11, y: 0, team: 'blue' },
    ])
    for (let i = 0; i < 2; i++) {
      s = applyTimeout(s, rng()).state
      expect(s.status).toBe('active')
      s = applyAction(s, { type: 'defend', unitId: 'e' }, 'blue', rng()).state
    }
    const { state, events } = applyTimeout(s, rng())
    expect(state.status).toBe('finished')
    expect(state.winner).toBe('blue')
    expect(state.endReason).toBe('timeout')
    expect(events.some((e) => e.type === 'surrender')).toBe(true)
  })

  it('собственный ход сбрасывает счётчик тайм-аутов', () => {
    let s: BattleState = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 5, x: 0, y: 0 },
      { id: 'e', unit: 'knight_peasant', count: 5, x: 11, y: 0, team: 'blue' },
    ])
    s = applyTimeout(s, rng()).state
    s = applyAction(s, { type: 'defend', unitId: 'e' }, 'blue', rng()).state
    s = applyAction(s, { type: 'defend', unitId: 'a' }, 'red', rng()).state
    expect(s.timeouts.red).toBe(0)
  })

  it('сдача в любой момент завершает бой', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 5, x: 0, y: 0 },
      { id: 'e', unit: 'knight_peasant', count: 5, x: 11, y: 0, team: 'blue' },
    ])
    const { state } = applyAction(s, { type: 'surrender', heroUid: 'blue' }, 'blue', rng())
    expect(state).toMatchObject({ status: 'finished', winner: 'red', endReason: 'surrender' })
    expect(() => applyAction(state, { type: 'defend', unitId: 'a' }, 'red', rng())).toThrow('battle_finished')
  })

  it('лимит 30 раундов: ничья при разнице долей < 5 п.п., иначе победа', () => {
    const run = (redCount: number) => {
      let s = scenario([
        { id: 'a', unit: 'necro_skeleton', count: 10, x: 0, y: 0 },
        { id: 'e', unit: 'necro_skeleton', count: 10, x: 11, y: 0, team: 'blue' },
      ])
      s.round = 30
      s.units[0]!.count = redCount
      s = applyAction(s, { type: 'defend', unitId: 'a' }, 'red', rng()).state
      return applyAction(s, { type: 'defend', unitId: 'e' }, 'blue', rng()).state
    }
    expect(run(10)).toMatchObject({ status: 'finished', winner: 'draw', endReason: 'round_limit' })
    expect(run(8)).toMatchObject({ winner: 'blue' })
  })

  it('уничтожение армии — победа', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_lich', count: 50, x: 0, y: 0 },
      { id: 'e', unit: 'knight_peasant', count: 1, x: 5, y: 0, team: 'blue' },
    ])
    const { state } = applyAction(s, { type: 'shoot', unitId: 'a', targetId: 'e' }, 'red', rng())
    expect(state).toMatchObject({ status: 'finished', winner: 'red', endReason: 'elimination' })
  })
})

describe('чистота applyAction', () => {
  it('не мутирует входное состояние', () => {
    const s = scenario([
      { id: 'a', unit: 'necro_skeleton', count: 10, x: 0, y: 0 },
      { id: 'e', unit: 'knight_peasant', count: 10, x: 1, y: 0, team: 'blue' },
    ])
    const snapshot = JSON.stringify(s)
    applyAction(s, { type: 'attack', unitId: 'a', targetId: 'e', from: { x: 0, y: 0 } }, 'red', rng())
    expect(JSON.stringify(s)).toBe(snapshot)
  })

  it('plainHero без очков статов', () => {
    expect(plainHero('x').stats).toEqual({ attack: 1, defense: 1, power: 1, knowledge: 1 })
  })
})
