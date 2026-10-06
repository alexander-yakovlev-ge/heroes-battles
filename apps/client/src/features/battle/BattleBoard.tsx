import { memo, useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native'
import { Canvas, Circle, Group, Image, Path, Rect, RoundedRect, type SkImage } from '@shopify/react-native-skia'
import { getUnit, type BattleState, type UnitState } from '@hb/game-core'
import { colors } from '../../theme'
import { lastHitIndex, unitOpacity, visualPosition, type AnimStep, type Playhead } from './animation'
import { loadSprite } from './sprites'

export interface Highlights {
  moves: Set<string>
  /** Цели атаки/выстрела — id юнитов */
  targets: Set<string>
  /** Клетки целей заклинания */
  spellCells: Set<string>
  /** Клетки, с которых можно атаковать выбранную цель */
  attackCells: Set<string>
  activeId: string | null
}

/** Плашка численности масштабируется с клеткой, чтобы на телефоне не закрывать спрайт */
const badgeSize = (cell: number) => ({
  w: Math.round(Math.max(18, Math.min(34, cell * 0.5))),
  h: Math.round(Math.max(11, Math.min(17, cell * 0.26))),
  font: Math.max(8, Math.min(11, Math.round(cell * 0.2))),
})

const CELL_A = '#3d4a33'
const CELL_B = '#36422e'
const GRID_LINE = '#2b3424'

export const BattleBoard = memo(function BattleBoard({
  state,
  prevState,
  steps,
  playhead,
  cell,
  highlights,
  onTap,
}: {
  state: BattleState
  prevState: BattleState
  steps: readonly AnimStep[]
  playhead: Playhead
  cell: number
  highlights: Highlights
  onTap: (x: number, y: number) => void
}) {
  const { width, height } = state.grid
  const W = width * cell
  const H = height * cell

  // Спрайты растеризуются один раз на тип юнита (асинхронно на web)
  const templates = useMemo(() => [...new Set(state.units.map((u) => u.templateId))].sort().join('|'), [state.units])
  const [sprites, setSprites] = useState<Map<string, SkImage>>(new Map())
  useEffect(() => {
    let cancelled = false
    const ids = templates.split('|')
    Promise.all(ids.map((id) => loadSprite(id).then((img) => [id, img] as const))).then((pairs) => {
      if (cancelled) return
      setSprites(new Map(pairs.filter((p): p is readonly [string, SkImage] => p[1] !== null)))
    })
    return () => {
      cancelled = true
    }
  }, [templates])

  const badge = badgeSize(cell)
  const prevCount = useMemo(() => new Map(prevState.units.map((u) => [u.id, u.count])), [prevState])

  const units = state.units
    .map((u) => ({ u, opacity: unitOpacity(u, steps, playhead), pos: visualPosition(u, steps, playhead) }))
    .filter((x) => x.opacity > 0)
    // Нижние ряды рисуются поверх верхних
    .sort((a, b) => a.pos.y - b.pos.y)

  const current = steps[playhead.index]
  const offsetOf = (u: UnitState): { dx: number; dy: number } => {
    if (!current) return { dx: 0, dy: 0 }
    if (current.kind === 'strike' && !current.ranged && current.sourceId === u.id) {
      const target = state.units.find((x) => x.id === current.targetId)
      if (target) {
        const k = Math.sin(Math.PI * playhead.t) * 0.35
        const from = visualPosition(u, steps, playhead)
        return { dx: Math.sign(target.x - from.x) * k, dy: Math.sign(target.y - from.y) * k }
      }
    }
    if (current.kind === 'hits' && current.texts.some((x) => x.targetId === u.id && x.kind === 'damage')) {
      return { dx: Math.sin(playhead.t * 40) * 0.06 * (1 - playhead.t), dy: 0 }
    }
    return { dx: 0, dy: 0 }
  }

  function handleRelease(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent
    if (locationX < 0 || locationY < 0 || locationX > W || locationY > H) return
    onTap(locationX / cell, locationY / cell)
  }

  const cellsBg = []
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      cellsBg.push(<Rect key={`c${x},${y}`} x={x * cell + 0.5} y={y * cell + 0.5} width={cell - 1} height={cell - 1} color={(x + y) % 2 ? CELL_A : CELL_B} />)

  const centerOf = (u: UnitState) => {
    const size = getUnit(u.templateId).size
    const p = visualPosition(u, steps, playhead)
    return { x: (p.x + size / 2) * cell, y: (p.y + size / 2) * cell }
  }

  return (
    <View
      style={{ width: W, height: H }}
      onStartShouldSetResponder={() => true}
      onResponderRelease={handleRelease}
      testID="battle-board"
    >
      <Canvas style={{ width: W, height: H }}>
        <Rect x={0} y={0} width={W} height={H} color={GRID_LINE} />
        {cellsBg}
        {[...highlights.moves].map((k) => {
          const [x, y] = k.split(',').map(Number) as [number, number]
          return <Rect key={`m${k}`} x={x * cell + 2} y={y * cell + 2} width={cell - 4} height={cell - 4} color="rgba(217,180,90,0.28)" />
        })}
        {[...highlights.spellCells].map((k) => {
          const [x, y] = k.split(',').map(Number) as [number, number]
          return <Rect key={`s${k}`} x={x * cell + 2} y={y * cell + 2} width={cell - 4} height={cell - 4} color="rgba(170,110,255,0.35)" />
        })}
        {[...highlights.attackCells].map((k) => {
          const [x, y] = k.split(',').map(Number) as [number, number]
          return (
            <Group key={`a${k}`}>
              <Rect x={x * cell + 2} y={y * cell + 2} width={cell - 4} height={cell - 4} color="rgba(240,140,60,0.35)" />
              <Rect x={x * cell + 2} y={y * cell + 2} width={cell - 4} height={cell - 4} color="#f08c3c" style="stroke" strokeWidth={2} />
            </Group>
          )
        })}
        {state.grid.obstacles.map(([x, y]) => (
          <Group key={`o${x},${y}`}>
            <RoundedRect x={x * cell + cell * 0.12} y={y * cell + cell * 0.22} width={cell * 0.76} height={cell * 0.62} r={cell * 0.22} color="#6b6458" />
            <RoundedRect x={x * cell + cell * 0.2} y={y * cell + cell * 0.26} width={cell * 0.42} height={cell * 0.24} r={cell * 0.12} color="#8a8274" />
            <Rect x={x * cell + cell * 0.12} y={y * cell + cell * 0.72} width={cell * 0.76} height={cell * 0.1} color="rgba(0,0,0,0.25)" />
          </Group>
        ))}
        {units.map(({ u, opacity, pos }) => {
          const size = getUnit(u.templateId).size
          const off = offsetOf(u)
          const x = (pos.x + off.dx) * cell
          const y = (pos.y + off.dy) * cell
          const s = size * cell
          const sprite = sprites.get(u.templateId)
          const isActive = highlights.activeId === u.id
          const isTarget = highlights.targets.has(u.id)
          return (
            <Group key={u.id} opacity={opacity}>
              <RoundedRect
                x={x + 2}
                y={y + 2}
                width={s - 4}
                height={s - 4}
                r={6}
                color={isActive ? 'rgba(217,180,90,0.35)' : isTarget ? 'rgba(208,69,58,0.35)' : u.team === 'red' ? 'rgba(224,96,79,0.12)' : 'rgba(79,143,224,0.12)'}
              />
              {isActive || isTarget ? (
                <RoundedRect x={x + 2} y={y + 2} width={s - 4} height={s - 4} r={6} color={isActive ? colors.gold : colors.red} style="stroke" strokeWidth={2} />
              ) : null}
              {u.defending && u.count > 0 ? (
                <Path
                  path={`M ${x + 5} ${y + 5} h ${s * 0.16} v ${s * 0.1} q 0 ${s * 0.08} ${-s * 0.08} ${s * 0.12} q ${-s * 0.08} ${-s * 0.04} ${-s * 0.08} ${-s * 0.12} z`}
                  color="#9ec3ff"
                  style="fill"
                />
              ) : null}
              {sprite ? (
                <Group transform={u.team === 'blue' ? [{ translateX: x + s }, { scaleX: -1 }, { translateX: -x }] : []}>
                  <Image image={sprite} x={x} y={y} width={s} height={s} fit="fill" />
                </Group>
              ) : null}
            </Group>
          )
        })}
        {current?.kind === 'strike' && current.ranged
          ? (() => {
              const src = state.units.find((x) => x.id === current.sourceId)
              const dst = state.units.find((x) => x.id === current.targetId)
              if (!src || !dst) return null
              const a = centerOf(src)
              const b = centerOf(dst)
              const k = playhead.t
              return <Circle cx={a.x + (b.x - a.x) * k} cy={a.y + (b.y - a.y) * k} r={cell * 0.09} color="#f2e6b0" />
            })()
          : null}
        {current?.kind === 'spell' ? (
          current.global ? (
            <Rect x={0} y={0} width={W} height={H} color={`rgba(170,110,255,${0.35 * Math.sin(Math.PI * playhead.t)})`} />
          ) : (
            <Circle
              cx={(current.center.x + 0.5) * cell}
              cy={(current.center.y + 0.5) * cell}
              r={cell * current.radius * (0.4 + 0.6 * playhead.t)}
              color={current.color === 'hero' ? `rgba(240,200,90,${0.7 * (1 - playhead.t)})` : `rgba(170,110,255,${0.55 * (1 - playhead.t)})`}
            />
          )
        ) : null}
      </Canvas>

      {/* Численность стаков и всплывающие числа — обычные Text поверх холста (Skia-тексту нужны шрифты) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {units.map(({ u, pos }) => {
          const size = getUnit(u.templateId).size
          const off = offsetOf(u)
          const showNew = playhead.index > lastHitIndex(u.id, steps)
          const count = showNew ? u.count : (prevCount.get(u.id) ?? u.count)
          if (count <= 0) return null
          return (
            <View
              key={`b${u.id}`}
              style={[
                s.badge,
                {
                  left: (pos.x + off.dx + size) * cell - badge.w - 2,
                  top: (pos.y + size) * cell - badge.h - 2,
                  width: badge.w,
                  height: badge.h,
                  backgroundColor: u.team === 'red' ? colors.redTeam : colors.blueTeam,
                },
              ]}
            >
              <Text style={[s.badgeText, { fontSize: badge.font }]} testID={`count-${u.id}`}>
                {count}
              </Text>
            </View>
          )
        })}
        {current?.kind === 'hits'
          ? current.texts.map((ft, i) => {
              const u = state.units.find((x) => x.id === ft.targetId)
              if (!u) return null
              const c = centerOf(u)
              return (
                <Text
                  key={`f${i}`}
                  style={[
                    s.float,
                    {
                      left: c.x - 40,
                      top: c.y - cell * 0.5 - playhead.t * cell * 0.5,
                      opacity: 1 - playhead.t * 0.6,
                      color: ft.kind === 'damage' ? '#ff8a7a' : ft.kind === 'heal' ? '#8af59a' : '#f2e6b0',
                    },
                  ]}
                >
                  {ft.text}
                </Text>
              )
            })
          : null}
      </View>
    </View>
  )
})

const s = StyleSheet.create({
  badge: {
    position: 'absolute',
    justifyContent: 'center',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  float: {
    position: 'absolute',
    width: 80,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '900',
    textShadowColor: '#000',
    textShadowRadius: 3,
  },
})
