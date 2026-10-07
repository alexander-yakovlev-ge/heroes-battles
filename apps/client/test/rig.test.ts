import { describe, expect, it } from 'vitest'
import type { UnitState } from '@hb/game-core'
import { boneAngles, type AnimStep } from '../src/features/battle/animation'
import { layerSvg } from '../src/features/battle/rig'

const unit = { id: 'u1', team: 'red' } as UnitState
const move: AnimStep = { kind: 'move', unitId: 'u1', path: [{ x: 0, y: 0 }, { x: 1, y: 0 }], flying: false, duration: 300 }
const strike: AnimStep = { kind: 'strike', sourceId: 'u1', targetId: 'u2', ranged: false, duration: 480 }

describe('анимация частей рига', () => {
  it('при ходьбе ноги шагают навстречу друг другу, руки — отмашкой', () => {
    const a = boneAngles(unit, [move], { index: 0, t: 0.25 }, 0, 'walk', 'swing')
    expect(a.legNear! * a.legFar!).toBeLessThan(0)
    expect(Math.abs(a.legNear!)).toBeGreaterThan(0.3)
    expect(a.armNear! * a.legNear!).toBeLessThan(0)
  })

  it('рубящий удар: оружие заносится назад-вверх, затем обрушивается вперёд', () => {
    const windup = boneAngles(unit, [strike], { index: 0, t: 0.35 }, 0, 'walk', 'swing')
    const hit = boneAngles(unit, [strike], { index: 0, t: 0.55 }, 0, 'walk', 'swing')
    expect(windup.armNear!).toBeLessThan(-1)
    expect(hit.armNear!).toBeGreaterThan(0.5)
  })

  it('летающий машет крыльями при перелёте, укус — бросок головы', () => {
    const fly: AnimStep = { ...move, flying: true }
    const frames = [0.05, 0.12, 0.2].map((t) => boneAngles(unit, [fly], { index: 0, t }, 0, 'fly', 'bite').wingNear!)
    expect(Math.max(...frames) - Math.min(...frames)).toBeGreaterThan(0.5)
    expect(boneAngles(unit, [strike], { index: 0, t: 0.55 }, 0, 'fly', 'bite').head!).toBeGreaterThan(0.3)
  })

  it('чужой шаг не двигает ноги юнита', () => {
    const other: AnimStep = { ...move, unitId: 'u2' }
    expect(Math.abs(boneAngles(unit, [other], { index: 0, t: 0.25 }, 0, 'walk', 'swing').legNear ?? 0)).toBeLessThan(1e-9)
  })

  it('слой растрируется только в своей рамке', () => {
    const { svg, w, h } = layerSvg({ svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"></svg>', box: [10, 20, 30, 40] }, 512)
    expect(svg).toContain('viewBox="10 20 30 40"')
    expect([w, h]).toEqual([154, 205])
  })
})
