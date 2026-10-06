import { memo, useEffect, useMemo, useState, type ReactNode } from 'react'
import { StyleSheet, Text, View, type GestureResponderEvent } from 'react-native'
import { BlendColor, Canvas, Circle, Group, Image, Line, Oval, Path, Rect, type SkImage } from '@shopify/react-native-skia'
import { getUnit, type BattleState, type UnitState } from '@hb/game-core'
import { projectileOf } from '@hb/assets'
import { colors } from '../../theme'
import { lastHitIndex, poseOf, visualPosition, type AnimStep, type Playhead, type Pose } from './animation'
import { SPRITE_K, TILT, type Projection } from './projection'
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

const CELL_A = '#46553a'
const CELL_B = '#3e4c33'
const EDGE = 'rgba(20,26,16,0.55)'
/** Частота «дыхания» юнитов в покое — 30 кадров в секунду достаточно */
const IDLE_FPS = 30

/** Точка опоры юнита (центр «ног») в координатах поля и его размер */
function footOf(x: number, y: number, size: number) {
  return { fx: x + size / 2, fv: y + size * 0.62 }
}

/** Камень-препятствие: неровный валун с освещённой верхушкой */
function rock(cx: number, cy: number, r: number, key: string): ReactNode {
  const p = (a: number, k: number) => `${(cx + Math.cos(a) * r * k).toFixed(1)} ${(cy + Math.sin(a) * r * k * 0.75).toFixed(1)}`
  const body = `M${p(Math.PI, 1)} L${p(Math.PI * 1.15, 1.05)} L${p(Math.PI * 1.35, 1.1)} L${p(Math.PI * 1.6, 1.08)} L${p(Math.PI * 1.85, 1.0)} L${p(0, 0.98)} L${p(Math.PI * 0.2, 0.85)} L${p(Math.PI * 0.5, 0.55)} L${p(Math.PI * 0.8, 0.8)} Z`
  const top = `M${p(Math.PI * 1.1, 0.75)} L${p(Math.PI * 1.35, 0.92)} L${p(Math.PI * 1.65, 0.9)} L${p(Math.PI * 1.85, 0.72)} L${p(Math.PI * 1.55, 0.45)} Z`
  return (
    <Group key={key}>
      <Oval x={cx - r * 1.15} y={cy + r * 0.2} width={r * 2.3} height={r * 0.8} color="rgba(0,0,0,0.32)" />
      <Path path={body} color="#6e675b" />
      <Path path={body} color="#2c2822" style="stroke" strokeWidth={1.5} />
      <Path path={top} color="#9a9282" />
    </Group>
  )
}

export const BattleBoard = memo(function BattleBoard({
  state,
  prevState,
  steps,
  playhead,
  proj,
  highlights,
  onTap,
}: {
  state: BattleState
  prevState: BattleState
  steps: readonly AnimStep[]
  playhead: Playhead
  proj: Projection
  highlights: Highlights
  onTap: (x: number, y: number) => void
}) {
  const { width: W, height: H, cell } = proj

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

  // Часы для анимации покоя (дыхание, парение летающих)
  const [time, setTime] = useState(0)
  useEffect(() => {
    let raf = 0
    let last = 0
    const start = performance.now()
    const tick = (now: number) => {
      if (now - last >= 1000 / IDLE_FPS) {
        last = now
        setTime((now - start) / 1000)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const prevCount = useMemo(() => new Map(prevState.units.map((u) => [u.id, u.count])), [prevState])
  const current = steps[playhead.index]

  // Видимые позиции всех юнитов — для направления ударов и отдачи
  const visual = new Map(state.units.map((u) => [u.id, visualPosition(u, steps, playhead)]))
  const positionOf = (id: string) => visual.get(id)

  const units = state.units
    .map((u) => {
      const t = getUnit(u.templateId)
      const pose = poseOf(u, steps, playhead, time, t.isFlying, positionOf)
      return { u, size: t.size, pose, ...footOf(pose.x, pose.y, t.size) }
    })
    .filter((x) => x.pose.opacity > 0)

  // Глубина: дальние ряды рисуются первыми; камни участвуют в сортировке наравне с юнитами
  type Entity = { depth: number; draw: () => ReactNode }
  const entities: Entity[] = []
  for (const [ox, oy] of state.grid.obstacles) {
    const c = proj.project(ox + 0.5, oy + 0.62)
    entities.push({ depth: oy + 0.62, draw: () => rock(c.x, c.y - cell * proj.scale(oy + 0.62) * 0.12, cell * proj.scale(oy + 0.62) * 0.4, `o${ox},${oy}`) })
  }

  const spriteSide = (size: number, fv: number) => size * cell * proj.scale(fv) * SPRITE_K

  const drawUnit = (u: UnitState, size: number, pose: Pose, fx: number, fv: number): ReactNode => {
    const side = spriteSide(size, fv)
    const ground = proj.project(fx, fv)
    const foot = proj.project(fx, fv, pose.lift)
    const sprite = sprites.get(u.templateId)
    const shadowW = side * 0.55 * (1 - Math.min(0.5, pose.lift * 0.4))
    return (
      <Group key={u.id} opacity={pose.opacity}>
        <Oval x={ground.x - shadowW / 2} y={ground.y - shadowW * TILT * 0.22} width={shadowW} height={shadowW * TILT * 0.44} color="rgba(0,0,0,0.35)" />
        {sprite ? (
          <Group
            transform={[
              { translateX: foot.x },
              { translateY: foot.y },
              { rotate: pose.rot },
              { scaleX: pose.facing * pose.sx },
              { scaleY: pose.sy },
            ]}
          >
            <Image image={sprite} x={-side / 2} y={-side * 0.95} width={side} height={side} fit="fill">
              {pose.flash > 0 ? <BlendColor color={`rgba(255,60,50,${(pose.flash * 0.75).toFixed(2)})`} mode="srcATop" /> : null}
            </Image>
          </Group>
        ) : null}
        {u.defending && u.count > 0 ? (
          <Path
            path={(() => {
              const sx = foot.x + side * 0.22
              const sy = foot.y - side * 0.62
              const w = side * 0.16
              return `M ${sx} ${sy} h ${w} v ${w * 0.6} q 0 ${w * 0.5} ${-w / 2} ${w * 0.75} q ${-w / 2} ${-w * 0.25} ${-w / 2} ${-w * 0.75} z`
            })()}
            color="#9ec3ff"
          />
        ) : null}
      </Group>
    )
  }

  for (const e of units) entities.push({ depth: e.fv + e.pose.lift * 0.01, draw: () => drawUnit(e.u, e.size, e.pose, e.fx, e.fv) })
  entities.sort((a, b) => a.depth - b.depth)

  // Подсветка клеток — на земле, под юнитами
  const cellQuad = (k: string, color: string, stroke?: string) => {
    const [x, y] = k.split(',').map(Number) as [number, number]
    const d = proj.quad(x + 0.06, y + 0.06, x + 0.94, y + 0.94)
    return (
      <Group key={`${color}${k}`}>
        <Path path={d} color={color} />
        {stroke ? <Path path={d} color={stroke} style="stroke" strokeWidth={2} /> : null}
      </Group>
    )
  }
  const footprint = (u: UnitState, color: string, stroke?: string) => {
    const size = getUnit(u.templateId).size
    const p = visual.get(u.id) ?? { x: u.x, y: u.y }
    const d = proj.quad(p.x + 0.04, p.y + 0.04, p.x + size - 0.04, p.y + size - 0.04)
    return (
      <Group key={`fp${u.id}${color}`}>
        <Path path={d} color={color} />
        {stroke ? <Path path={d} color={stroke} style="stroke" strokeWidth={2} /> : null}
      </Group>
    )
  }

  const cells: ReactNode[] = []
  for (let y = 0; y < proj.rows; y++)
    for (let x = 0; x < proj.cols; x++) {
      const d = proj.quad(x, y, x + 1, y + 1)
      cells.push(<Path key={`c${x},${y}`} path={d} color={(x + y) % 2 ? CELL_A : CELL_B} />)
      cells.push(<Path key={`e${x},${y}`} path={d} color={EDGE} style="stroke" strokeWidth={0.8} />)
    }

  /** Точка «груди» юнита на экране — откуда вылетает и куда прилетает снаряд */
  const chestOf = (id: string) => {
    const u = state.units.find((x) => x.id === id)
    const p = visual.get(id)
    if (!u || !p) return null
    const size = getUnit(u.templateId).size
    const f = footOf(p.x, p.y, size)
    return { ...f, lift: 0.55 * size * SPRITE_K + (getUnit(u.templateId).isFlying ? 0.3 : 0) }
  }

  let effects: ReactNode = null
  if (current?.kind === 'strike' && current.ranged) {
    const a = chestOf(current.sourceId)
    const b = chestOf(current.targetId)
    const src = state.units.find((x) => x.id === current.sourceId)
    if (a && b && src) {
      // Снаряд вылетает после отдачи и летит по дуге
      const k = Math.min(1, Math.max(0, (current.duration * playhead.t - 120) / (current.duration - 160)))
      const dist = Math.hypot(b.fx - a.fx, b.fv - a.fv)
      const at = (q: number) =>
        proj.project(a.fx + (b.fx - a.fx) * q, a.fv + (b.fv - a.fv) * q, a.lift + (b.lift - a.lift) * q + Math.sin(Math.PI * q) * (0.3 + dist * 0.12))
      const p = at(k)
      const kind = projectileOf(src.templateId)
      if (k > 0 && k < 1) {
        if (kind === 'arrow') {
          const q = at(Math.max(0, k - 0.05))
          const ang = Math.atan2(p.y - q.y, p.x - q.x)
          const len = cell * 0.4
          const tail = { x: p.x - Math.cos(ang) * len, y: p.y - Math.sin(ang) * len }
          effects = (
            <Group>
              <Line p1={tail} p2={p} color="#d9c9a0" strokeWidth={2.2} />
              <Path
                path={`M ${p.x} ${p.y} L ${p.x - Math.cos(ang - 0.5) * 7} ${p.y - Math.sin(ang - 0.5) * 7} L ${p.x - Math.cos(ang + 0.5) * 7} ${p.y - Math.sin(ang + 0.5) * 7} Z`}
                color="#e8e2d0"
              />
            </Group>
          )
        } else if (kind === 'orb') {
          effects = (
            <Group>
              <Circle cx={p.x} cy={p.y} r={cell * 0.22} color="rgba(124,242,196,0.25)" />
              <Circle cx={p.x} cy={p.y} r={cell * 0.11} color="#b9fbe3" />
            </Group>
          )
        } else {
          effects = <Circle cx={p.x} cy={p.y} r={cell * 0.09} color="#8a8274" />
        }
      }
    }
  } else if (current?.kind === 'spell') {
    const t = playhead.t
    if (current.global) {
      effects = <Rect x={0} y={0} width={W} height={H} color={`rgba(170,110,255,${(0.35 * Math.sin(Math.PI * t)).toFixed(3)})`} />
    } else {
      const v = current.center.y + 0.5
      const c = proj.project(current.center.x + 0.5, v)
      const rx = current.radius * cell * proj.scale(v) * (0.4 + 0.6 * t)
      const hero = current.color === 'hero'
      const col = hero ? '240,200,90' : '170,110,255'
      // Кольцо на земле и столб света; удар героя — золотой клинок, падающий сверху
      effects = (
        <Group>
          <Oval x={c.x - rx} y={c.y - rx * TILT} width={rx * 2} height={rx * 2 * TILT} color={`rgba(${col},${(0.5 * (1 - t)).toFixed(3)})`} />
          <Rect x={c.x - rx * 0.35} y={c.y - cell * 2.2} width={rx * 0.7} height={cell * 2.2} color={`rgba(${col},${(0.28 * Math.sin(Math.PI * t)).toFixed(3)})`} />
          {hero ? (
            <Line
              p1={{ x: c.x, y: c.y - cell * (2.4 - 2.2 * Math.min(1, t * 1.6)) - cell * 0.8 }}
              p2={{ x: c.x, y: c.y - cell * (2.4 - 2.2 * Math.min(1, t * 1.6)) }}
              color={`rgba(255,230,140,${(1 - t).toFixed(3)})`}
              strokeWidth={4}
            />
          ) : null}
        </Group>
      )
    }
  }

  function handleRelease(e: GestureResponderEvent) {
    const { locationX, locationY } = e.nativeEvent
    const p = proj.unproject(locationX, locationY)
    if (p) onTap(p.x, p.v)
  }

  const badgeFor = (fv: number) => {
    const c = cell * proj.scale(fv)
    return {
      w: Math.round(Math.max(18, Math.min(34, c * 0.5))),
      h: Math.round(Math.max(11, Math.min(17, c * 0.26))),
      font: Math.max(8, Math.min(11, Math.round(c * 0.2))),
    }
  }

  return (
    <View style={{ width: W, height: H }} onStartShouldSetResponder={() => true} onResponderRelease={handleRelease} testID="battle-board">
      <Canvas style={{ width: W, height: H }}>
        {cells}
        {[...highlights.moves].map((k) => cellQuad(k, 'rgba(217,180,90,0.32)'))}
        {[...highlights.spellCells].map((k) => cellQuad(k, 'rgba(170,110,255,0.38)'))}
        {[...highlights.attackCells].map((k) => cellQuad(k, 'rgba(240,140,60,0.4)', '#f08c3c'))}
        {state.units
          .filter((u) => u.count > 0)
          .map((u) =>
            highlights.activeId === u.id
              ? footprint(u, 'rgba(217,180,90,0.4)', colors.gold)
              : highlights.targets.has(u.id)
                ? footprint(u, 'rgba(208,69,58,0.38)', colors.red)
                : footprint(u, u.team === 'red' ? 'rgba(224,96,79,0.16)' : 'rgba(79,143,224,0.16)'),
          )}
        {entities.map((e) => e.draw())}
        {effects}
      </Canvas>

      {/* Численность стаков и всплывающие числа — обычные Text поверх холста (Skia-тексту нужны шрифты) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {units.map(({ u, size, pose, fx, fv }) => {
          const showNew = playhead.index > lastHitIndex(u.id, steps)
          const count = showNew ? u.count : (prevCount.get(u.id) ?? u.count)
          if (count <= 0) return null
          const b = badgeFor(fv)
          // Плашка — у переднего правого угла клетки, под ногами, чтобы не закрывать фигуру
          const front = proj.project(fx + size / 2, pose.y + size)
          return (
            <View
              key={`b${u.id}`}
              style={[
                s.badge,
                {
                  left: front.x - b.w - 2,
                  top: front.y - b.h - 2,
                  width: b.w,
                  height: b.h,
                  opacity: pose.opacity,
                  backgroundColor: u.team === 'red' ? colors.redTeam : colors.blueTeam,
                },
              ]}
            >
              <Text style={[s.badgeText, { fontSize: b.font }]} testID={`count-${u.id}`}>
                {count}
              </Text>
            </View>
          )
        })}
        {current?.kind === 'hits'
          ? current.texts.map((ft, i) => {
              const u = state.units.find((x) => x.id === ft.targetId)
              const c = u ? chestOf(u.id) : null
              if (!u || !c) return null
              const p = proj.project(c.fx, c.fv, c.lift + 0.6 + playhead.t * 0.6)
              return (
                <Text
                  key={`f${i}`}
                  style={[
                    s.float,
                    {
                      left: p.x - 40,
                      top: p.y,
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
