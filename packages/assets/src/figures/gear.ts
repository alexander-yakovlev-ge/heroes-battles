/**
 * Снаряжение фигур: оружие в руке, щиты, луки, арбалеты, книги и сферы.
 * Оружие задаётся точкой хвата (hx, hy), углом (градусы, 0 — вправо, -90 — вверх) и длиной.
 */
import { Art, C, INK, T, type Pt, type Tone, blade, fill, glow, limbPath, line, mix, smooth, spec, tint, vol } from '../kit.js'

export type WeaponKind =
  | 'sword'
  | 'greatsword'
  | 'axe'
  | 'greataxe'
  | 'spear'
  | 'pike'
  | 'javelin'
  | 'trident'
  | 'pitchfork'
  | 'mace'
  | 'hammer'
  | 'warhammer'
  | 'club'
  | 'staff'
  | 'dagger'
  | 'whip'
  | 'scimitar'
  | 'torch'
  | 'sling'
  | 'rock'
  | 'none'

export interface Weapon {
  kind: WeaponKind
  /** Металл клинка/навершия */
  tone?: Tone
  /** Свечение (руны, магия, огонь) */
  glow?: string
  /** Множитель длины */
  scale?: number
}

const n2 = (v: number) => Math.round(v * 100) / 100
const dir = (angle: number) => [Math.cos((angle * Math.PI) / 180), Math.sin((angle * Math.PI) / 180)] as const

/** Древко от хвата: часть назад (за кулак) и вперёд на len */
function shaft(a: Art, hx: number, hy: number, angle: number, back: number, len: number, w: number, tone: Tone = T.wood): string {
  const [dx, dy] = dir(angle)
  return vol(a, limbPath([[hx - dx * back, hy - dy * back, w], [hx + dx * len, hy + dy * len, w * 0.9]]), tone, 0.5)
}

/** Наконечник копья (листовидный) в точке (x, y) по направлению angle */
function spearHead(a: Art, x: number, y: number, angle: number, len: number, w: number, tone: Tone): string {
  const [dx, dy] = dir(angle)
  const px = -dy
  const py = dx
  const p = (along: number, side: number): Pt => [x + dx * along + px * side, y + dy * along + py * side]
  return (
    fill(smooth([p(0, w * 0.3), p(len * 0.35, w), p(len, 0), p(len * 0.35, -w), p(0, -w * 0.3)], true, 0.6), a.cyl(tone, angle + 90), 0.5) +
    line(`M${p(len * 0.1, 0).map(n2).join(',')} L${p(len * 0.85, 0).map(n2).join(',')}`, tone.hi, 0.35, 0.8)
  )
}

/**
 * Оружие в руке. Возвращает SVG; рукоять рисуется у точки хвата, кулак рисует вызывающий код поверх.
 */
export function weapon(a: Art, w: Weapon, hx: number, hy: number, angle: number, size = 1): string {
  const k = (w.scale ?? 1) * size
  const metal = w.tone ?? T.metal
  const [dx, dy] = dir(angle)
  const at = (d: number): Pt => [hx + dx * d * k, hy + dy * d * k]
  const aura = (x: number, y: number, r: number) => (w.glow ? glow(a, x, y, r, w.glow, 0.55) : '')
  switch (w.kind) {
    case 'none':
      return ''
    case 'sword':
      return aura(...at(16), 9 * k) + blade(a, hx, hy, angle, 24 * k, 2.8 * k, { tone: metal, guard: 3.6 * k }) + spec(a, ...at(14), 0.5 * k, 0.8)
    case 'greatsword':
      return aura(...at(20), 12 * k) + blade(a, hx, hy, angle, 34 * k, 3.6 * k, { tone: metal, guard: 4.6 * k }) + spec(a, ...at(20), 0.6 * k, 0.8)
    case 'scimitar': {
      const p = (d: number, s: number): Pt => [hx + dx * d * k - dy * s * k, hy + dy * d * k + dx * s * k]
      return (
        aura(...at(14), 8 * k) +
        shaft(a, hx, hy, angle, 4 * k, 1, 1.6 * k, T.leather) +
        fill(smooth([p(0, 1.4), p(10, 2.6), p(18, 1.4), p(24, -2.6), p(16, -1.6), p(6, -1.4), p(0, -1.2)], true, 0.7), a.cyl(metal, angle + 90), 0.5) +
        line(`M${p(2, -0.6).map(n2)} Q${p(14, 0.4).map(n2)} ${p(22, -2).map(n2)}`, metal.hi, 0.4 * k, 0.8) +
        line(`M${p(0, 3.4).map(n2)} L${p(0, -3.4).map(n2)}`, C.gold, 1.2 * k)
      )
    }
    case 'dagger':
      return blade(a, hx, hy, angle, 11 * k, 2 * k, { tone: metal, guard: 2.2 * k })
    case 'axe':
    case 'greataxe': {
      const big = w.kind === 'greataxe'
      const len = (big ? 30 : 20) * k
      const [ex, ey] = at(big ? 26 : 17)
      const px = -dy
      const py = dx
      const hw = (big ? 9 : 6) * k
      const hd = (big ? 6 : 4.4) * k
      const head = smooth(
        [
          [ex - dx * hd * 0.3, ey - dy * hd * 0.3],
          [ex + px * hw * 0.3 - dx * hd, ey + py * hw * 0.3 - dy * hd],
          [ex + px * hw - dx * hd * 1.1, ey + py * hw - dy * hd * 1.1],
          [ex + px * hw * 1.05 + dx * hd * 0.2, ey + py * hw * 1.05 + dy * hd * 0.2],
          [ex + px * hw * 0.3 + dx * hd * 0.5, ey + py * hw * 0.3 + dy * hd * 0.5],
          [ex + dx * hd * 0.4, ey + dy * hd * 0.4],
        ],
        true,
        0.7,
      )
      return (
        aura(ex, ey, 10 * k) +
        shaft(a, hx, hy, angle, 5 * k, len, (big ? 2.2 : 1.8) * k) +
        fill(head, a.sph(metal), 0.6) +
        `<path d="${head}" fill="${a.tex('metal')}"/>` +
        line(`M${n2(ex + px * hw * 0.95 - dx * hd)},${n2(ey + py * hw * 0.95 - dy * hd)} L${n2(ex + px * hw)},${n2(ey + py * hw)}`, metal.hi, 0.6 * k) +
        (big ? fill(smooth([[ex - px * 3 * k, ey - py * 3 * k], [ex - px * 6 * k - dx * 2 * k, ey - py * 6 * k - dy * 2 * k], [ex - px * 5 * k + dx * 2.6 * k, ey - py * 5 * k + dy * 2.6 * k]], true), a.sph(metal), 0.5) : '') +
        spec(a, ex + px * hw * 0.6, ey + py * hw * 0.6, 0.5 * k, 0.8)
      )
    }
    case 'spear':
    case 'pike':
    case 'javelin': {
      const len = (w.kind === 'pike' ? 46 : w.kind === 'spear' ? 32 : 22) * k
      const [ex, ey] = at(w.kind === 'pike' ? 46 : w.kind === 'spear' ? 32 : 22)
      return aura(ex, ey, 7 * k) + shaft(a, hx, hy, angle, (w.kind === 'javelin' ? 6 : 12) * k, len, 1.4 * k) + spearHead(a, ex, ey, angle, 6 * k, 1.8 * k, metal)
    }
    case 'trident':
    case 'pitchfork': {
      const len = 30 * k
      const [ex, ey] = at(30)
      const px = -dy
      const py = dx
      let prongs = ''
      for (const s of [-2.2, 0, 2.2]) {
        const b: Pt = [ex + px * s * k, ey + py * s * k]
        const t: Pt = [b[0] + dx * 6 * k, b[1] + dy * 6 * k]
        prongs += line(`M${b.map(n2)} L${t.map(n2)}`, INK, 1.4 * k) + line(`M${b.map(n2)} L${t.map(n2)}`, w.kind === 'pitchfork' ? T.iron.base : metal.base, 0.8 * k)
      }
      return (
        aura(ex, ey, 8 * k) +
        shaft(a, hx, hy, angle, 10 * k, len, 1.4 * k) +
        line(`M${n2(ex + px * 2.6 * k)},${n2(ey + py * 2.6 * k)} L${n2(ex - px * 2.6 * k)},${n2(ey - py * 2.6 * k)}`, INK, 1.6 * k) +
        line(`M${n2(ex + px * 2.6 * k)},${n2(ey + py * 2.6 * k)} L${n2(ex - px * 2.6 * k)},${n2(ey - py * 2.6 * k)}`, metal.base, 0.9 * k) +
        prongs
      )
    }
    case 'mace':
    case 'hammer':
    case 'warhammer':
    case 'club': {
      const big = w.kind === 'warhammer'
      const len = (big ? 26 : w.kind === 'club' ? 20 : 17) * k
      const [ex, ey] = at(big ? 26 : w.kind === 'club' ? 20 : 17)
      let head: string
      if (w.kind === 'club') head = vol(a, limbPath([[hx + dx * 8 * k, hy + dy * 8 * k, 2.6 * k], [ex, ey, 6 * k]], 1), T.wood, 0.6) + tint(`M${n2(ex - 1)},${n2(ey - 2)} l1,1 l-1,1 Z`, T.wood.lo, 0.8)
      else if (w.kind === 'mace') head = `<circle cx="${n2(ex)}" cy="${n2(ey)}" r="${n2(3.6 * k)}" fill="${a.sph(metal)}" stroke="${INK}" stroke-width="0.5"/>` + [0, 60, 120, 180, 240, 300].map((d) => {
          const [cx, cy] = dir(d)
          return fill(`M${n2(ex + cx * 3 * k)},${n2(ey + cy * 3 * k)} l${n2(cx * 2.4 * k - cy)},${n2(cy * 2.4 * k + cx)} l${n2(cy * 2)},${n2(-cx * 2)} Z`, metal.lo, 0.3)
        }).join('')
      else {
        const px = -dy
        const py = dx
        const hw = (big ? 7 : 4.6) * k
        const hd = (big ? 4.4 : 3) * k
        const box = smooth([[ex + px * hw - dx * hd, ey + py * hw - dy * hd], [ex + px * hw + dx * hd, ey + py * hw + dy * hd], [ex - px * hw + dx * hd, ey - py * hw + dy * hd], [ex - px * hw - dx * hd, ey - py * hw - dy * hd]], true, 0.2)
        head = fill(box, a.sph(metal), 0.6) + `<path d="${box}" fill="${a.tex('metal')}"/>` + spec(a, ex + px * hw * 0.5, ey + py * hw * 0.5, 0.6 * k, 0.8)
      }
      return aura(ex, ey, 10 * k) + shaft(a, hx, hy, angle, 4 * k, len, (big ? 2 : 1.6) * k, w.kind === 'club' ? T.wood : T.wood) + head
    }
    case 'staff': {
      const len = 34 * k
      const [ex, ey] = at(34)
      return (
        shaft(a, hx, hy, angle, 20 * k, len, 1.7 * k, T.wood) +
        aura(ex, ey, 9 * k) +
        `<circle cx="${n2(ex)}" cy="${n2(ey)}" r="${n2(2.8 * k)}" fill="${a.rad(`orb${n2(ex)}${n2(ey)}`, [ex - 1, ey - 1], 3.4 * k, [[0, '#ffffff'], [0.4, w.glow ? mix(w.glow, '#ffffff', 0.5) : '#d8e8ff'], [1, w.glow ?? '#6a8ac8']])}" stroke="${INK}" stroke-width="0.4"/>` +
        line(`M${n2(ex - dx * 3 * k - 2.4 * k)},${n2(ey - dy * 3 * k)} Q${n2(ex - 3.4 * k)},${n2(ey - 2 * k)} ${n2(ex - 1.6 * k)},${n2(ey - 3 * k)} M${n2(ex - dx * 3 * k + 2.4 * k)},${n2(ey - dy * 3 * k)} Q${n2(ex + 3.4 * k)},${n2(ey - 2 * k)} ${n2(ex + 1.6 * k)},${n2(ey - 3 * k)}`, C.gold, 0.8 * k)
      )
    }
    case 'whip': {
      const pts: Pt[] = [[hx, hy]]
      for (let i = 1; i <= 6; i++) pts.push([hx + dx * i * 4.4 * k + Math.sin(i * 1.3) * 2.4 * k, hy + dy * i * 4.4 * k + i * i * 0.3 * k])
      return (
        shaft(a, hx, hy, angle, 4 * k, 3 * k, 1.8 * k, T.leather) +
        line(smooth(pts), INK, 1.6 * k) +
        line(smooth(pts), w.glow ?? T.leather.base, 0.9 * k) +
        (w.glow ? glow(a, pts[6]![0], pts[6]![1], 5 * k, w.glow, 0.7) : '')
      )
    }
    case 'torch': {
      const [ex, ey] = at(14)
      return (
        shaft(a, hx, hy, angle, 4 * k, 14 * k, 1.8 * k, T.wood) +
        glow(a, ex, ey - 2 * k, 10 * k, '#ffb040', 0.7) +
        fill(smooth([[ex - 2.4 * k, ey], [ex - 1.6 * k, ey - 4 * k], [ex, ey - 8 * k], [ex + 1.4 * k, ey - 4.6 * k], [ex + 2.4 * k, ey]], true), a.rad(`fl${n2(ex)}`, [ex, ey - 2 * k], 5 * k, [[0, '#ffffff'], [0.4, '#ffe080'], [1, '#e85a10']]), 0)
      )
    }
    case 'sling': {
      const [ex, ey] = at(8)
      return line(`M${n2(hx)},${n2(hy)} Q${n2(ex + 3)},${n2(ey - 2)} ${n2(ex)},${n2(ey + 3)}`, T.leather.base, 0.6) + `<circle cx="${n2(ex)}" cy="${n2(ey + 3)}" r="${n2(1.6 * k)}" fill="${a.sph({ hi: '#c8c0b0', base: '#7a7468', lo: '#2a2620' })}" stroke="${INK}" stroke-width="0.3"/>`
    }
    case 'rock': {
      return vol(a, smooth([[hx - 3 * k, hy - 2 * k], [hx + 1 * k, hy - 4 * k], [hx + 4 * k, hy - 1 * k], [hx + 3 * k, hy + 3 * k], [hx - 2 * k, hy + 3 * k]], true), { hi: '#b8b0a0', base: '#7a7264', lo: '#2a2620', tex: 'bone' }, 0.6)
    }
  }
}

export type OffKind = 'shield_round' | 'shield_kite' | 'shield_tower' | 'buckler' | 'bow' | 'crossbow' | 'book' | 'orb' | 'none'

export interface OffItem {
  kind: OffKind
  /** Основной цвет (щит, переплёт) */
  tone?: Tone
  /** Цвет эмблемы / окантовки */
  emblem?: string
  glow?: string
}

/** Предмет во второй руке в точке (x, y); size — масштаб */
export function offhand(a: Art, item: OffItem, x: number, y: number, size = 1): string {
  const k = size
  const tone = item.tone ?? T.wood
  switch (item.kind) {
    case 'none':
      return ''
    case 'shield_round':
    case 'buckler': {
      const r = (item.kind === 'buckler' ? 6 : 10.5) * k
      const d = `M${n2(x - r)},${n2(y)} a${n2(r)},${n2(r * 1.04)} 0 1,0 ${n2(2 * r)},0 a${n2(r)},${n2(r * 1.04)} 0 1,0 ${n2(-2 * r)},0 Z`
      return (
        vol(a, d, tone, 0.7) +
        (item.emblem ? tint(smooth([[x - r * 0.15, y - r * 0.6], [x + r * 0.5, y - r * 0.1], [x + r * 0.1, y + r * 0.6], [x - r * 0.5, y + r * 0.05]], true), item.emblem, 0.85) : '') +
        `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${n2(2.2 * k)}"/><path d="${d}" fill="none" stroke="${T.iron.base}" stroke-width="${n2(1.3 * k)}"/>` +
        `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(r * 0.28)}" fill="${a.sph(T.iron)}" stroke="${INK}" stroke-width="0.4"/>` +
        spec(a, x - r * 0.35, y - r * 0.4, 0.8 * k, 0.6)
      )
    }
    case 'shield_kite':
    case 'shield_tower': {
      const tower = item.kind === 'shield_tower'
      const w = (tower ? 10 : 9) * k
      const h = (tower ? 24 : 20) * k
      const d = tower
        ? smooth([[x - w, y - h * 0.5], [x + w, y - h * 0.5], [x + w * 1.02, y + h * 0.42], [x, y + h * 0.52], [x - w * 1.02, y + h * 0.42]], true, 0.3)
        : smooth([[x - w, y - h * 0.42], [x, y - h * 0.5], [x + w, y - h * 0.42], [x + w * 0.85, y + h * 0.05], [x, y + h * 0.5], [x - w * 0.85, y + h * 0.05]], true, 0.5)
      return (
        vol(a, d, tone, 0.7) +
        (item.emblem
          ? line(`M${n2(x)},${n2(y - h * 0.36)} L${n2(x)},${n2(y + h * 0.34)} M${n2(x - w * 0.6)},${n2(y - h * 0.08)} L${n2(x + w * 0.6)},${n2(y - h * 0.08)}`, item.emblem, 2.2 * k, 0.95)
          : '') +
        `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${n2(1.8 * k)}"/><path d="${d}" fill="none" stroke="${C.gold}" stroke-width="${n2(0.9 * k)}"/>` +
        spec(a, x - w * 0.45, y - h * 0.3, 0.8 * k, 0.6)
      )
    }
    case 'bow': {
      const h = 22 * k
      const d = `M${n2(x - 3 * k)},${n2(y - h)} C${n2(x + 7 * k)},${n2(y - h * 0.6)} ${n2(x + 7 * k)},${n2(y - h * 0.1)} ${n2(x + 2 * k)},${n2(y)} C${n2(x + 7 * k)},${n2(y + h * 0.1)} ${n2(x + 7 * k)},${n2(y + h * 0.6)} ${n2(x - 3 * k)},${n2(y + h)}`
      return line(d, INK, 2.8 * k) + line(d, tone.base, 1.7 * k) + line(d, tone.hi, 0.5 * k, 0.7) + line(`M${n2(x - 3 * k)},${n2(y - h)} L${n2(x - 3 * k)},${n2(y + h)}`, '#e0d8c4', 0.4, 0.9)
    }
    case 'crossbow': {
      const body = smooth([[x - 10 * k, y - 1 * k], [x + 8 * k, y - 1.4 * k], [x + 8 * k, y + 1 * k], [x - 10 * k, y + 2 * k]], true, 0.3)
      const arms = `M${n2(x + 5 * k)},${n2(y - 8 * k)} Q${n2(x + 9 * k)},${n2(y)} ${n2(x + 5 * k)},${n2(y + 8 * k)}`
      return (
        line(arms, INK, 2.2 * k) +
        line(arms, T.iron.base, 1.3 * k) +
        line(`M${n2(x + 5 * k)},${n2(y - 8 * k)} L${n2(x - 2 * k)},${n2(y)} L${n2(x + 5 * k)},${n2(y + 8 * k)}`, '#e0d8c4', 0.35) +
        vol(a, body, tone, 0.6) +
        line(`M${n2(x - 2 * k)},${n2(y - 0.4 * k)} L${n2(x + 12 * k)},${n2(y - 0.4 * k)}`, T.wood.hi, 0.6) +
        fill(`M${n2(x + 12 * k)},${n2(y - 0.4 * k)} l-2,-1.2 l0,2.4 Z`, T.metal.base, 0.3)
      )
    }
    case 'book': {
      const d = smooth([[x - 4.4 * k, y - 3 * k], [x + 4.4 * k, y - 3.6 * k], [x + 4.6 * k, y + 3 * k], [x - 4.2 * k, y + 3.4 * k]], true, 0.3)
      return (
        (item.glow ? glow(a, x, y - 4, 8 * k, item.glow, 0.5) : '') +
        vol(a, d, tone, 0.6) +
        fill(smooth([[x - 3.6 * k, y - 3.4 * k], [x + 3.8 * k, y - 4 * k], [x + 3.8 * k, y - 2.8 * k], [x - 3.6 * k, y - 2.4 * k]], true, 0.3), '#efe6cc', 0.3) +
        tint(`M${n2(x - 1 * k)},${n2(y - 1 * k)} l2,0 l0,2 l-2,0 Z`, item.emblem ?? C.gold, 0.9)
      )
    }
    case 'orb':
      return (
        glow(a, x, y, 9 * k, item.glow ?? '#8ad8ff', 0.7) +
        `<circle cx="${n2(x)}" cy="${n2(y)}" r="${n2(3 * k)}" fill="${a.rad(`orbh${n2(x)}${n2(y)}`, [x - 1, y - 1], 3.6 * k, [[0, '#ffffff'], [0.4, mix(item.glow ?? '#8ad8ff', '#ffffff', 0.5)], [1, item.glow ?? '#8ad8ff']])}" stroke="${INK}" stroke-width="0.35"/>`
      )
  }
}
