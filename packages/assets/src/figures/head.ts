/**
 * Голова в профиль 3/4, смотрит вправо: профиль лица по виду существа, глаз, ухо, рот,
 * волосы, борода, шлем, рога. (hx, hy) — центр черепа, r — его радиус.
 */
import { Art, C, INK, type Pt, type Tone, eye, fill, glow, line, mix, smooth, spec, tint, vol } from '../kit.js'

export type HeadKind = 'human' | 'female' | 'elf' | 'dwarf' | 'orc' | 'goblin' | 'brute' | 'demon' | 'cyclops' | 'bull' | 'lizard' | 'golem' | 'beast'

export interface HeadSpec {
  kind: HeadKind
  skin: Tone
  hair?: { tone: Tone; style: 'short' | 'long' | 'mohawk' | 'bun' | 'wild' | 'snakes' | 'flame' | 'leaves' }
  beard?: { tone: Tone; style: 'short' | 'long' | 'braided' }
  helmet?: { kind: 'kettle' | 'great' | 'horned' | 'hood' | 'crown' | 'circlet' | 'cap' | 'turban' | 'barbute' | 'winged'; tone: Tone; plume?: string }
  horns?: { tone: Tone; kind: 'ram' | 'bull' | 'small' | 'long' }
  /** Цвет свечения глаз; без него — обычные глаза */
  eyes?: string
  tusks?: boolean
  ears?: 'round' | 'pointed' | 'long' | 'big' | 'none'
}

interface Profile {
  nose: number
  noseDrop: number
  jaw: number
  chin: number
  brow: number
  ears: NonNullable<HeadSpec['ears']>
}

const PROFILES: Record<HeadKind, Profile> = {
  human: { nose: 0.2, noseDrop: 0, jaw: 0, chin: 0.02, brow: 0.1, ears: 'round' },
  female: { nose: 0.14, noseDrop: -0.02, jaw: -0.06, chin: -0.04, brow: 0, ears: 'round' },
  elf: { nose: 0.16, noseDrop: -0.02, jaw: -0.04, chin: 0, brow: 0, ears: 'long' },
  dwarf: { nose: 0.34, noseDrop: 0.08, jaw: 0, chin: 0, brow: 0.3, ears: 'round' },
  orc: { nose: 0.1, noseDrop: 0.06, jaw: 0.34, chin: 0.06, brow: 0.45, ears: 'pointed' },
  goblin: { nose: 0.42, noseDrop: 0.12, jaw: 0.1, chin: -0.04, brow: 0.2, ears: 'big' },
  brute: { nose: 0.12, noseDrop: 0.1, jaw: 0.42, chin: 0.12, brow: 0.6, ears: 'round' },
  demon: { nose: 0.18, noseDrop: 0.04, jaw: 0.16, chin: 0.1, brow: 0.4, ears: 'pointed' },
  cyclops: { nose: 0.14, noseDrop: 0.12, jaw: 0.3, chin: 0.08, brow: 0.5, ears: 'round' },
  bull: { nose: 0.6, noseDrop: 0.25, jaw: 0.6, chin: 0, brow: 0.3, ears: 'pointed' },
  lizard: { nose: 0.5, noseDrop: 0.08, jaw: 0.5, chin: -0.06, brow: 0.2, ears: 'none' },
  golem: { nose: 0.06, noseDrop: 0, jaw: 0.2, chin: 0.1, brow: 0.4, ears: 'none' },
  beast: { nose: 0.5, noseDrop: 0.15, jaw: 0.55, chin: -0.04, brow: 0.3, ears: 'pointed' },
}

const n2 = (v: number) => Math.round(v * 100) / 100

export function head(a: Art, hx: number, hy: number, r: number, spec_: HeadSpec): string {
  const pr = { ...PROFILES[spec_.kind], ...(spec_.ears ? { ears: spec_.ears } : {}) }
  const skin = spec_.skin
  const P = (x: number, y: number): Pt => [hx + x * r, hy + y * r]
  const S = (x: number, y: number) => P(x, y).map(n2).join(',')
  const { nose, noseDrop, jaw, chin, brow } = pr
  const golem = spec_.kind === 'golem'
  const outline = smooth(
    [
      P(-0.92, 0.15),
      P(-0.86, -0.45),
      P(-0.46, -0.9),
      P(0.1, -1),
      P(0.6, -0.84),
      P(0.9, -0.46),
      P(1 + brow * 0.1, -0.14),
      P(0.95 + jaw * 0.25, 0.04),
      P(1.04 + nose + jaw * 0.32, 0.28 + noseDrop),
      P(0.96 + jaw * 0.38, 0.44 + noseDrop * 0.5),
      P(1.0 + jaw * 0.42, 0.57),
      P(0.97 + jaw * 0.42, 0.68),
      P(0.99 + jaw * 0.38 + chin, 0.82),
      P(0.86 + jaw * 0.28 + chin, 1.01),
      P(0.34, 1.05 + jaw * 0.12),
      P(-0.16, 0.86),
      P(-0.56, 0.62),
    ],
    true,
    golem ? 0.35 : 1,
  )
  let s = ''

  // волосы/капюшон за головой
  const hair = spec_.hair
  if (hair?.style === 'long' || hair?.style === 'wild' || hair?.style === 'snakes' || hair?.style === 'leaves')
    s += vol(a, smooth([P(-0.2, -1.05), P(-1.1, -0.6), P(-1.35, 0.4), P(-1.2, 1.6), P(-0.6, 1.9), P(-0.3, 1.0), P(0.2, -0.4)], true), hair.tone, 0.6)
  if (spec_.helmet?.kind === 'hood') s += vol(a, smooth([P(-0.1, -1.3), P(-1.25, -0.6), P(-1.3, 0.9), P(-0.7, 1.6), P(0.2, 1.3), P(0.2, -0.2)], true), spec_.helmet.tone, 0.6)

  // рога за головой
  const horns = spec_.horns
  if (horns) {
    const hornPath =
      horns.kind === 'ram'
        ? smooth([P(-0.2, -0.7), P(-0.9, -1.1), P(-1.5, -0.5), P(-1.3, 0.3), P(-0.8, 0.4), P(-1.0, -0.2), P(-0.8, -0.6), P(-0.3, -0.4)], true)
        : horns.kind === 'bull'
          ? smooth([P(-0.3, -0.7), P(-0.9, -0.9), P(-1.5, -1.3), P(-1.2, -1.05), P(-0.6, -0.5)], true)
          : horns.kind === 'long'
            ? smooth([P(0.1, -0.85), P(-0.5, -1.6), P(-1.3, -2.4), P(-0.7, -1.4), P(-0.2, -0.75)], true)
            : smooth([P(0.2, -0.85), P(-0.1, -1.4), P(0.0, -1.5), P(0.4, -0.9)], true)
    s += vol(a, hornPath, horns.tone, 0.6)
  }

  // ухо (дальнее не видно), уши-лопухи гоблинов — назад и вверх
  const earBack = (d: string) => vol(a, d, skin, 0.5) + tint(d, skin.lo, 0.25)
  if (pr.ears === 'big') s += earBack(smooth([P(-0.3, -0.2), P(-1.6, -0.7), P(-1.9, -0.5), P(-0.7, 0.4)], true))

  // голова
  s += vol(a, outline, skin, golem ? 0.9 : 0.75)
  // шея снизу — тень под челюстью
  s += tint(smooth([P(-0.4, 0.75), P(0.3, 0.98 + jaw * 0.1), P(0.7, 0.98), P(0.2, 1.1), P(-0.3, 1.0)], true), skin.lo, 0.4)
  // блик лба, тень щеки
  s += tint(smooth([P(-0.3, -0.75), P(0.3, -0.92), P(0.7, -0.7), P(0.3, -0.6), P(-0.2, -0.55)], true), skin.hi, 0.55)
  s += tint(smooth([P(0.25, 0.3), P(0.7 + jaw * 0.2, 0.32), P(0.72 + jaw * 0.25, 0.75), P(0.3, 0.8)], true), skin.lo, 0.35)

  if (golem) {
    // каменная/металлическая голова: швы и сколы
    s += line(`M${S(-0.6, -0.2)} L${S(0.2, -0.3)} L${S(0.5, 0.4)} M${S(-0.2, 0.5)} L${S(0.4, 0.7)}`, skin.lo, 0.5 * r * 0.2, 0.8)
  }

  // ухо
  if (pr.ears === 'round') s += vol(a, smooth([P(-0.22, -0.1), P(0.02, -0.12), P(0.06, 0.32), P(-0.12, 0.42), P(-0.28, 0.2)], true), skin, 0.45) + line(`M${S(-0.12, 0.02)} C${S(0, 0.1)} ${S(0, 0.25)} ${S(-0.1, 0.3)}`, skin.lo, 0.3, 0.8)
  else if (pr.ears === 'pointed') s += vol(a, smooth([P(-0.2, 0.25), P(-0.25, -0.1), P(-0.85, -0.55), P(-0.05, -0.05), P(0.05, 0.3)], true), skin, 0.45)
  else if (pr.ears === 'long') s += vol(a, smooth([P(-0.15, 0.3), P(-0.25, -0.05), P(-1.25, -0.85), P(-0.1, -0.15), P(0.05, 0.3)], true), skin, 0.45)
  else if (pr.ears === 'big') s += vol(a, smooth([P(-0.1, 0.3), P(-0.25, -0.1), P(-1.05, -0.45), P(-0.6, 0.15)], true), skin, 0.45)

  // рот
  const mouthY = 0.66
  s += line(`M${S(0.58 + jaw * 0.2, mouthY + 0.02)} L${S(0.97 + jaw * 0.42, mouthY)}`, mix(skin.lo, INK, 0.4), 0.06 * r, 0.9)
  if (spec_.kind === 'female') s += line(`M${S(0.86, 0.58)} C${S(0.95, 0.56)} ${S(1.0, 0.6)} ${S(0.98, 0.64)}`, '#a04a5a', 0.08 * r, 0.8)
  if (spec_.tusks) s += fill(`M${S(0.88 + jaw * 0.4, 0.7)} L${S(0.96 + jaw * 0.42, 0.28)} L${S(1.04 + jaw * 0.42, 0.72)} Z`, '#efe6cc', 0.4)
  if (spec_.kind === 'lizard' || spec_.kind === 'beast' || spec_.kind === 'demon')
    s += line(`M${S(0.7 + jaw * 0.3, 0.66)} l${n2(0.06 * r)},${n2(0.12 * r)} M${S(0.85 + jaw * 0.35, 0.66)} l${n2(0.05 * r)},${n2(0.12 * r)}`, '#efe6cc', 0.05 * r)
  // ноздря
  if (!golem) s += tint(smooth([P(0.88 + nose * 0.7 + jaw * 0.3, 0.34 + noseDrop), P(0.98 + nose * 0.8 + jaw * 0.3, 0.36 + noseDrop), P(0.92 + nose * 0.7 + jaw * 0.3, 0.42 + noseDrop)], true), skin.lo, 0.8)

  // глаза
  const ex = spec_.kind === 'cyclops' ? 0.76 : 0.6
  const ey = spec_.kind === 'cyclops' ? -0.18 : -0.06
  const er = (spec_.kind === 'cyclops' ? 0.2 : 0.13) * r
  // надбровье
  s += line(`M${S(ex - 0.28, ey - 0.16 - brow * 0.06)} C${S(ex - 0.05, ey - 0.26 - brow * 0.08)} ${S(ex + 0.25, ey - 0.22 - brow * 0.08)} ${S(ex + 0.38 + brow * 0.1, ey - 0.12)}`, mix(skin.lo, INK, 0.3), (0.07 + brow * 0.05) * r, 0.9)
  if (spec_.kind !== 'lizard') {
    if (spec_.eyes) {
      s += fill(smooth([P(ex - 0.16, ey), P(ex + 0.02, ey - 0.12), P(ex + 0.2, ey - 0.02), P(ex + 0.02, ey + 0.1)], true), '#140c10', 0)
      s += eye(a, hx + (ex + 0.03) * r, hy + ey * r, er * 0.55, spec_.eyes)
    } else {
      s += fill(smooth([P(ex - 0.16, ey + 0.01), P(ex + 0.02, ey - 0.1), P(ex + 0.2, ey - 0.01), P(ex + 0.02, ey + 0.09)], true), '#efeae2', 0.25)
      s += `<circle cx="${n2(hx + (ex + 0.06) * r)}" cy="${n2(hy + ey * r)}" r="${n2(er * 0.62)}" fill="#2a1e14"/><circle cx="${n2(hx + (ex + 0.09) * r)}" cy="${n2(hy + (ey - 0.03) * r)}" r="${n2(er * 0.22)}" fill="#ffffff"/>`
      s += line(`M${S(ex - 0.16, ey + 0.02)} C${S(ex - 0.02, ey - 0.13)} ${S(ex + 0.12, ey - 0.13)} ${S(ex + 0.21, ey)}`, mix(skin.lo, INK, 0.5), 0.05 * r)
    }
  } else {
    // слепой ящер: затянутая кожей глазница
    s += tint(smooth([P(ex - 0.15, ey), P(ex + 0.1, ey - 0.08), P(ex + 0.2, ey + 0.05), P(ex, ey + 0.1)], true), skin.lo, 0.7)
  }

  // борода
  const beard = spec_.beard
  if (beard) {
    const long = beard.style !== 'short'
    const d = smooth([P(-0.1, 0.4), P(0.5, 0.55), P(0.95 + jaw * 0.4, 0.62), P(1.05 + jaw * 0.4, long ? 1.4 : 1.05), P(0.7, long ? 2.1 : 1.35), P(0.2, long ? 1.9 : 1.25), P(-0.15, 1.0)], true)
    s += vol(a, d, beard.tone, 0.55)
    s += line(`M${S(0.3, 0.9)} C${S(0.4, 1.3)} ${S(0.5, 1.6)} ${S(0.55, long ? 1.9 : 1.2)} M${S(0.6, 0.8)} C${S(0.7, 1.2)} ${S(0.8, 1.5)} ${S(0.75, long ? 1.8 : 1.2)}`, beard.tone.lo, 0.06 * r, 0.7)
    s += vol(a, smooth([P(0.5, 0.48), P(1.0 + jaw * 0.4, 0.5), P(1.1 + jaw * 0.4, 0.66), P(0.6, 0.66)], true), beard.tone, 0.4)
    if (beard.style === 'braided') s += [1.3, 1.55, 1.8].map((y) => `<circle cx="${n2(hx + 0.62 * r)}" cy="${n2(hy + y * r)}" r="${n2(0.08 * r)}" fill="${C.gold}"/>`).join('')
  }

  // волосы на голове
  if (hair) {
    const top = smooth([P(-0.95, 0.25), P(-0.9, -0.5), P(-0.45, -0.98), P(0.15, -1.08), P(0.7, -0.88), P(0.95, -0.5), P(0.62, -0.62), P(0.2, -0.66), P(-0.3, -0.4), P(-0.5, 0.2)], true)
    if (hair.style === 'mohawk') s += vol(a, smooth([P(-0.7, -0.6), P(-0.4, -1.5), P(0.1, -1.55), P(0.6, -1.2), P(0.5, -0.85), P(-0.2, -0.95)], true), hair.tone, 0.5)
    else if (hair.style === 'flame') s += glow(a, hx, hy - r, r * 1.6, '#ff8a2a', 0.6) + fill(smooth([P(-0.8, -0.3), P(-0.7, -1.3), P(-0.3, -0.95), P(0, -1.8), P(0.3, -1.0), P(0.7, -1.4), P(0.85, -0.5)], true), a.rad(`hf${n2(hx)}`, P(0, -0.8), r * 1.4, [[0, '#ffffff'], [0.3, '#ffe070'], [0.75, '#ff7a1a'], [1, '#a02a08']]), 0)
    else if (hair.style === 'snakes') {
      s += vol(a, top, hair.tone, 0.5)
      for (const [x, y, ang] of [[-0.8, -0.3, 200], [-0.5, -0.9, 240], [0.1, -1.05, 280], [0.6, -0.85, 320], [-0.9, 0.4, 170]] as const) {
        const r1 = (ang * Math.PI) / 180
        const b = P(x, y)
        const pts: Pt[] = [b, [b[0] + Math.cos(r1) * r * 0.5 + 0.5, b[1] + Math.sin(r1) * r * 0.5 - 0.4], [b[0] + Math.cos(r1) * r * 0.9, b[1] + Math.sin(r1) * r * 0.9]]
        s += line(smooth(pts), INK, 0.26 * r) + line(smooth(pts), hair.tone.base, 0.16 * r) + `<circle cx="${n2(pts[2]![0])}" cy="${n2(pts[2]![1])}" r="${n2(0.13 * r)}" fill="${a.sph(hair.tone)}" stroke="${INK}" stroke-width="0.3"/>`
      }
    } else if (hair.style === 'leaves') {
      s += vol(a, top, hair.tone, 0.5)
      for (let i = 0; i < 6; i++) s += vol(a, smooth([P(-0.8 + i * 0.3, -0.7 - (i % 2) * 0.2), P(-0.6 + i * 0.3, -1.25), P(-0.45 + i * 0.3, -0.75)], true), hair.tone, 0.3)
    } else s += vol(a, top, hair.tone, 0.5)
    if (hair.style === 'bun') s += vol(a, smooth([P(-0.95, -0.6), P(-1.4, -0.9), P(-1.35, -0.3), P(-0.9, -0.2)], true), hair.tone, 0.5)
    s += line(`M${S(-0.6, -0.6)} C${S(-0.2, -0.95)} ${S(0.3, -0.98)} ${S(0.75, -0.75)}`, hair.tone.hi, 0.06 * r, 0.7)
  }

  // шлем / головной убор
  const hm = spec_.helmet
  if (hm) {
    const t = hm.tone
    switch (hm.kind) {
      case 'kettle':
        s += vol(a, smooth([P(-1.25, -0.2), P(-0.6, -1.1), P(0.4, -1.15), P(1.0, -0.4), P(1.35, -0.15), P(1.3, 0.0), P(-1.3, 0.0)], true), t, 0.6)
        break
      case 'cap':
        s += vol(a, smooth([P(-1.0, -0.15), P(-0.7, -1.0), P(0.4, -1.12), P(0.95, -0.5), P(1.05, -0.25), P(-0.95, -0.05)], true), t, 0.6)
        break
      case 'great':
      case 'barbute': {
        const d = smooth([P(-1.0, 0.3), P(-0.95, -0.6), P(-0.4, -1.1), P(0.4, -1.12), P(0.98, -0.55), P(1.1, 0.2), P(1.05, 0.9), P(0.4, 1.12), P(-0.6, 0.95)], true, 0.8)
        s += vol(a, d, t, 0.7)
        if (hm.kind === 'great') s += fill(smooth([P(0.35, -0.2), P(1.08, -0.22), P(1.08, -0.04), P(0.35, -0.02)], true, 0.2), '#08080a', 0) + line(`M${S(0.7, 0.2)} L${S(0.7, 0.75)} M${S(0.85, 0.2)} L${S(0.85, 0.75)}`, '#08080a', 0.07 * r)
        else s += fill(smooth([P(0.4, -0.25), P(1.06, -0.3), P(1.04, 0.75), P(0.75, 0.75), P(0.7, 0.15), P(0.4, 0.1)], true), a.lin(`bf${n2(hx)}`, P(0.4, -0.3), P(0.9, 0.7), [[0, '#0a0808'], [0.6, mix(skin.lo, '#000000', 0.5)], [1, mix(skin.base, '#000000', 0.45)]]), 0.3) + `<circle cx="${n2(hx + 0.72 * r)}" cy="${n2(hy - 0.05 * r)}" r="${n2(0.07 * r)}" fill="#e8e0d0"/>`
        s += line(`M${S(-0.2, -1.1)} C${S(0.2, -0.6)} ${S(0.25, 0.3)} ${S(0.1, 1.05)}`, t.hi, 0.07 * r, 0.6)
        break
      }
      case 'horned':
        s += vol(a, smooth([P(-1.0, 0.05), P(-0.8, -0.9), P(0.2, -1.12), P(0.95, -0.6), P(1.05, -0.1), P(-0.95, 0.1)], true), t, 0.6)
        s += vol(a, smooth([P(-0.35, -0.95), P(-0.9, -1.5), P(-1.0, -2.1), P(-0.55, -1.6), P(-0.05, -1.05)], true), { hi: '#f4ead2', base: '#cbbd98', lo: '#5e5238', tex: 'bone' }, 0.5)
        s += line(`M${S(-1.0, -0.05)} L${S(1.05, -0.15)}`, C.gold, 0.12 * r)
        break
      case 'winged':
        s += vol(a, smooth([P(-1.0, 0.05), P(-0.8, -0.9), P(0.2, -1.12), P(0.95, -0.6), P(1.05, -0.1), P(-0.95, 0.1)], true), t, 0.6)
        s += vol(a, smooth([P(-0.6, -0.6), P(-1.4, -1.5), P(-1.0, -1.0), P(-1.6, -0.9), P(-0.8, -0.4)], true), { hi: '#ffffff', base: '#e6e2da', lo: '#7a7468' }, 0.4)
        break
      case 'hood':
        s += vol(a, smooth([P(-1.0, 0.9), P(-1.15, -0.4), P(-0.5, -1.25), P(0.5, -1.2), P(1.15, -0.55), P(1.0, -0.35), P(0.5, -0.75), P(-0.1, -0.7), P(-0.4, 0.2), P(-0.4, 1.0)], true), t, 0.6)
        break
      case 'crown':
        s += fill(`M${S(-0.75, -0.75)} L${S(-0.7, -1.4)} L${S(-0.4, -1.0)} L${S(-0.05, -1.55)} L${S(0.25, -1.05)} L${S(0.6, -1.4)} L${S(0.7, -0.78)} Z`, a.cyl(t, 0), 0.5)
        s += `<circle cx="${n2(hx - 0.05 * r)}" cy="${n2(hy - 0.95 * r)}" r="${n2(0.1 * r)}" fill="${C.bloodLight}"/>`
        break
      case 'circlet':
        s += line(`M${S(-0.9, -0.45)} C${S(-0.3, -0.62)} ${S(0.4, -0.62)} ${S(0.95, -0.4)}`, t.base, 0.12 * r) + `<circle cx="${n2(hx + 0.75 * r)}" cy="${n2(hy - 0.44 * r)}" r="${n2(0.1 * r)}" fill="${C.glow}"/>`
        break
      case 'turban':
        s += vol(a, smooth([P(-1.05, -0.15), P(-1.0, -1.0), P(-0.2, -1.45), P(0.7, -1.2), P(1.0, -0.5), P(0.9, -0.2), P(-0.9, 0.0)], true), t, 0.6)
        s += line(`M${S(-0.9, -0.5)} C${S(-0.2, -0.9)} ${S(0.5, -0.8)} ${S(0.95, -0.4)} M${S(-0.8, -0.95)} C${S(-0.1, -1.25)} ${S(0.5, -1.1)} ${S(0.8, -0.85)}`, t.lo, 0.06 * r, 0.7)
        s += `<circle cx="${n2(hx + 0.4 * r)}" cy="${n2(hy - 0.75 * r)}" r="${n2(0.13 * r)}" fill="${C.glow}" stroke="${INK}" stroke-width="0.2"/>`
        break
    }
    if (hm.plume) s += vol(a, smooth([P(-0.1, -1.1), P(-0.6, -1.7), P(-1.6, -1.6), P(-1.9, -0.9), P(-1.3, -1.15), P(-0.5, -0.9)], true), { hi: mix(hm.plume, '#ffffff', 0.4), base: hm.plume, lo: mix(hm.plume, '#000000', 0.6) }, 0.5)
    s += spec(a, hx + 0.15 * r, hy - 0.8 * r, 0.12 * r, 0.6)
  }
  return s
}
