import { Art, INK, type Pt, type Tone, eye, fill, glow, groundShadow, limbPath, line, shade, smooth, spec, tatters, tint, vol } from './kit.js'

const a = new Art('plague')

const SKIN = { hi: '#dcd8a4', base: '#9c9862', lo: '#2e2c16', tex: 'skin' } satisfies Tone
const SKIN_FAR = { hi: '#b8b486', base: '#77744a', lo: '#1e1c0e', tex: 'skin' } satisfies Tone
const RAGS = { hi: '#a89478', base: '#6a5a44', lo: '#1e1810', tex: 'cloth' } satisfies Tone
const RAGS_FAR = { hi: '#857460', base: '#4a3e2e', lo: '#120e08', tex: 'cloth' } satisfies Tone
const NECRO = '#1e1612'
const MIASMA = '#c8e04a'

/** Бубон: вздутый нарыв с воспалённым ободком; burst — лопнул, сочится гноем */
function boil(x: number, y: number, size: number, burst = false): string {
  const r = size * 1.35
  const rim = `<circle cx="${x}" cy="${y}" r="${r * 1.6}" fill="${a.halo('#8a2a2a', 0.55)}"/>`
  if (burst)
    return (
      rim +
      `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.8}" fill="${a.rad(`b${x}${y}`, [x, y], r, [[0, '#1a0c06'], [0.6, '#4a2a10'], [1, '#c8b04a']])}"/>` +
      line(`M${x},${y + r * 0.6} C${x + 0.2},${y + r * 1.6} ${x - 0.2},${y + r * 2.4} ${x},${y + r * 3}`, '#c8c04a', 0.5, 0.9)
    )
  return rim + `<circle cx="${x}" cy="${y}" r="${r}" fill="${a.sph({ hi: '#fff2b0', base: '#d8b45a', lo: '#7a3a1a' })}" stroke="${INK}" stroke-width="0.25" stroke-opacity="0.6"/>` + `<circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#ffffff" opacity="0.8"/>`
}

/** Почерневшие (некроз) пальцы, растопыренные вперёд */
function claw(x: number, y: number, angle: number, t: Tone): string {
  let s = vol(a, smooth([[x - 1.8, y - 1.6], [x + 1.6, y - 1.8], [x + 2.6, y], [x + 1.4, y + 1.8], [x - 1.8, y + 1.4]], true), t, 0.5)
  ;[-30, -10, 10, 30].forEach((da, i) => {
    const r1 = ((angle + da) * Math.PI) / 180
    const r2 = ((angle + da + 35) * Math.PI) / 180
    const k: Pt = [x + 1.6 + Math.cos(r1) * 2.2, y + Math.sin(r1) * 2.2]
    const tip: Pt = [k[0] + Math.cos(r2) * 1.8, k[1] + Math.sin(r2) * 1.8]
    const d = `M${x + 1.4},${y + (i - 1.5) * 0.6} L${k[0].toFixed(2)},${k[1].toFixed(2)} L${tip[0].toFixed(2)},${tip[1].toFixed(2)}`
    s += line(d, INK, 1.3) + line(d, i < 2 ? NECRO : '#3a2a1e', 0.75)
  })
  return s
}

/** Муха */
const fly = (x: number, y: number) =>
  `<ellipse cx="${x - 0.5}" cy="${y - 0.5}" rx="0.7" ry="0.35" fill="#d8e8f0" opacity="0.55" transform="rotate(-30 ${x - 0.5} ${y - 0.5})"/>` +
  `<ellipse cx="${x + 0.4}" cy="${y - 0.5}" rx="0.7" ry="0.35" fill="#d8e8f0" opacity="0.55" transform="rotate(30 ${x + 0.4} ${y - 0.5})"/>` +
  `<ellipse cx="${x}" cy="${y}" rx="0.55" ry="0.4" fill="#0a0806"/>`

/** Чумной зомби: истощённый заражённый мертвец бежит, сгорбившись; бубоны, некроз, облако заразы */
export const plagueZombie = a.rig(
  { motion: 'walk', attack: 'claw', pivots: { armFar: [54, 36], armNear: [61, 38], legFar: [47, 61], legNear: [52, 61], head: [63, 30] } },
  [
    ['root',
    groundShadow(a, 50, 24) +
      // облако заразы за спиной
      glow(a, 44, 50, 26, MIASMA, 0.28) +
      glow(a, 30, 70, 14, MIASMA, 0.3) +
      glow(a, 70, 28, 12, MIASMA, 0.22)],
    ['armFar',
      // дальняя рука отмахивает назад
      vol(a, limbPath([[54, 36, 5], [47, 43, 4], [41.4, 48, 3.4]]), SKIN_FAR, 0.6) +
      vol(a, limbPath([[41.4, 48, 3.2], [36.6, 50.4, 2.8], [33, 50, 2.4]]), SKIN_FAR, 0.6) +
      claw(31.6, 50.6, 170, SKIN_FAR)],
    ['legFar',
      // дальняя нога — толчковая, вытянута назад
      vol(a, limbPath([[47, 61, 6.6], [41, 68, 5], [35.6, 74.4, 4]]), SKIN_FAR, 0.6) +
      vol(a, limbPath([[35.6, 74.4, 3.8], [31.6, 81, 3], [28.4, 86, 2.6]]), SKIN_FAR, 0.6) +
      vol(a, smooth([[25, 85.6], [29.6, 84.6], [32.6, 87.6], [30, 89.6], [25.4, 89]], true), { ...SKIN_FAR, base: '#3a3020' }, 0.5) +
      vol(a, smooth([[39, 63], [46, 60], [47.6, 66], [43, 71.6], ...tatters(43, 37, 72, 2, 2, 4.4).slice(1), [36.6, 70]], true), RAGS_FAR, 0.6)],
    ['legNear',
      // ближняя нога — шаг вперёд, колено поднято
      vol(a, limbPath([[52, 61, 7.4], [58, 67.6, 6], [62.4, 73.4, 4.6]]), SKIN, 0.6) +
      vol(a, limbPath([[62.4, 73.4, 4.4], [60.4, 80, 3.4], [59, 86.4, 3]]), SKIN, 0.6) +
      `<circle cx="62.2" cy="73.4" r="2.2" fill="${a.sph(SKIN)}" stroke="${INK}" stroke-width="0.4" stroke-opacity="0.7"/>` +
      vol(a, smooth([[56, 86], [61, 85.4], [65.6, 88.4], [65, 91], [56, 91]], true), { ...SKIN, base: '#4a4026' }, 0.5) +
      line('M62,89.4 l2.6,0.6 M61,90.4 l3,0.4', NECRO, 0.5) +
      boil(60.6, 79.6, 0.9)],
    ['root',
      // лохмотья: рубаха до бёдер, верёвочный пояс
      vol(a, smooth([[49, 38], [56, 33.6], [63.4, 35], [64.6, 43], [62, 52], [60.4, 59], ...tatters(61, 45, 62, 5, 4, 1.9).slice(1), [45.4, 56], [46, 46]], true), RAGS, 0.8) +
      line('M52,40 C51,47 50,53 50,60 M57,38 C58,45 58,52 56.6,59', RAGS.lo, 0.7, 0.6) +
      line('M50,39 C53,36 57,35 61,35.6', RAGS.hi, 0.6, 0.6) +
      line('M45.6,55.4 C51,57 56,57 61.6,55', '#2a2010', 1.4) +
      line('M45.6,55.4 C51,57 56,57 61.6,55', '#8a7650', 0.6) +
      line('M48,56.4 C47.6,59 47,61 47.6,63.4', '#8a7650', 0.6) +
      // прореха на боку: рёбра под натянутой кожей, бубоны
      vol(a, smooth([[54, 43], [60, 42], [62, 47], [59, 51], [54.4, 50]], true), SKIN, 0.5) +
      line('M55,45 C57,44.4 59,44.6 60.6,45.6 M55,47.4 C57,46.8 59,47 60.4,48', SKIN.lo, 0.6, 0.8) +
      boil(57.4, 49.2, 1) +
      tint(smooth([[46, 44], [49, 43], [49.4, 47], [46.4, 47.6]], true), '#4a3a10', 0.55) +
      // шея с тряпкой-повязкой
      vol(a, limbPath([[59, 36, 5], [63, 31, 4.2], [65, 28.4, 4]]), SKIN, 0.6) +
      boil(61, 33.4, 1.1, true) +
      vol(a, smooth([[56.6, 33], [62, 30.6], [66, 32.4], [62.4, 36], [57, 37]], true), { ...RAGS, base: '#7a3a2a', hi: '#b06a50' }, 0.6) +
      vol(a, smooth([[56, 35], [53.4, 40], [55, 44], [57, 39]], true), { ...RAGS, base: '#7a3a2a', hi: '#b06a50' }, 0.5)],
    ['head',
      // голова выдвинута вперёд: впалые щёки, рот раскрыт, бубоны на шее и лице
      vol(a, smooth([[61, 22], [62.6, 16.6], [67, 13.6], [72, 14.6], [74.6, 18.4], [74.6, 20.4], [77, 23.6], [75.6, 24.6], [75.8, 26], [74.6, 26.8], [75, 30.2], [72.6, 32], [68, 31.4], [64, 28.6]], true), SKIN, 0.8) +
      tint(smooth([[63, 19.6], [66, 15.6], [71, 15], [67, 17.6], [64.6, 22]], true), SKIN.hi, 0.7) +
      tint(smooth([[67.6, 24.6], [71.6, 24.4], [72.4, 29], [68.6, 29.6]], true), SKIN.lo, 0.6) +
      // глубоко запавшая глазница с лихорадочным глазом
      fill(smooth([[69.6, 18.4], [73, 18], [73.8, 20.4], [71.6, 21.8], [69.6, 21]], true), a.rad('psock', [71.6, 19.9], 2.8, [[0, '#120c06'], [0.7, '#2a1c0c'], [1, SKIN.lo]]), 0.4) +
      eye(a, 71.8, 19.8, 0.7, '#e8f05a') +
      line('M68.6,17.4 C70.6,16.4 73,16.6 74.6,18', SKIN.lo, 0.8, 0.9) +
      // рот: гнилые зубы, зелёная слюна
      fill(smooth([[71.4, 26.4], [75.8, 25.8], [75.6, 29.4], [72, 29.4]], true), '#140806', 0.4) +
      line('M72.6,26.3 v1 M73.8,26.2 v1.3 M75,26 v0.9 M73.2,29.2 v-0.9 M74.6,29.2 v-1.1', '#c8b47a', 0.45) +
      line('M75.4,29.4 C75.6,31.4 75.2,33 75.6,35', MIASMA, 0.7, 0.9) +
      `<circle cx="75.6" cy="35.4" r="0.6" fill="${MIASMA}"/>` +
      // жидкие пряди волос
      line('M62.6,18 C61,21 60.4,24 60.8,27 M64,16 C62,18.6 61.4,22 61.8,24.4 M66,14.6 C64.6,16.4 64,18.6 64.2,20.6', '#2a2414', 0.5, 0.9) +
      boil(66, 25.4, 1.1) +
      boil(64.2, 21.2, 0.7, true) +
      boil(72.6, 15.6, 0.6) +
      spec(a, 70, 17, 0.5, 0.55)],
    ['armNear',
      // ближняя рука тянется вперёд к жертве
      vol(a, limbPath([[61, 38, 5.4], [67, 42, 4.2], [72.6, 44, 3.6]]), SKIN, 0.6) +
      vol(a, smooth([[58.6, 35.6], [64.6, 37], [66, 42], [61, 43.6], [58, 40]], true), RAGS, 0.6) +
      vol(a, limbPath([[72.6, 44, 3.4], [77, 43.4, 3], [80.6, 42.4, 2.6]]), SKIN, 0.6) +
      boil(68.6, 43.4, 0.8) +
      tint(smooth([[76, 42], [80.6, 41.2], [81, 44], [76.4, 44.8]], true), NECRO, 0.45) +
      claw(82, 42.4, 0, SKIN)],
    ['root',
      // язвы и потёки на лохмотьях
      shade(a, smooth([[50, 56], [60, 56], [60, 60], [50, 60]], true), 0.4) +
      // мухи
      fly(80, 30) +
      fly(84, 36) +
      fly(36, 40) +
      fly(66, 64)],
  ],
)
