import { Art, C, T, blade, bone, boneFoot, boneHand, fill, forearm, groundShadow, line, pelvis, ribcage, skull, smooth, spine, tint, vol, shade, spec } from './kit.js'

const a = new Art('skel')

/** Скелет: ржавый меч и окованный деревянный щит, боевая стойка */
export const skeleton = a.rig(
  { motion: 'walk', attack: 'swing', pivots: { armFar: [44, 33], armNear: [55.6, 32.6], legFar: [47, 60], legNear: [53, 60], head: [50.6, 26] } },
  [
    ['root',
    groundShadow(a, 50, 20)],
    ['armFar',
      // дальняя рука со щитом
      bone(a, [44, 33], [39, 43], 2, T.boneFar) +
      forearm(a, [39, 43], [36, 51], 1.8, T.boneFar) +
      // щит: доски, железный обод, умбон, сколы
      vol(a, 'M22,52 a12.5,13 0 1,0 25,0 a12.5,13 0 1,0 -25,0 Z', T.wood, 0.8) +
      line('M27.4,42 L27.4,62 M32.2,39.6 L32.2,64.4 M37,39.6 L37,64.4 M41.8,42 L41.8,62', '#20140a', 0.7, 0.75) +
      `<path d="M22,52 a12.5,13 0 1,0 25,0 a12.5,13 0 1,0 -25,0 Z" fill="none" stroke="${C.ink}" stroke-width="2.6"/>` +
      `<path d="M22,52 a12.5,13 0 1,0 25,0 a12.5,13 0 1,0 -25,0 Z" fill="none" stroke="${T.iron.base}" stroke-width="1.6"/>` +
      line('M24,46 a12,12.5 0 0,1 8,-6.8', T.iron.hi, 0.6, 0.8) +
      vol(a, 'M30.6,52 a3.9,3.9 0 1,0 7.8,0 a3.9,3.9 0 1,0 -7.8,0 Z', T.iron, 0.6) +
      `<circle cx="33.4" cy="50.6" r="1" fill="${T.iron.hi}" opacity="0.8"/>` +
      tint('M40,61 l3,-1.6 l1.4,2.6 l-2.6,1.4 Z', T.wood.lo, 0.9) +
      [[24.6, 52], [44.4, 52], [34.5, 40.4], [34.5, 63.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.55" fill="${T.iron.hi}"/>`).join('') +
      spec(a, 33.4, 50.4, 0.7, 0.9)],
    ['legFar',
      // дальняя нога
      bone(a, [47, 60], [44, 74], 2.2, T.boneFar) +
      bone(a, [44, 74], [44.6, 88], 1.8, T.boneFar) +
      boneFoot(a, 44, 90, 5.4, T.boneFar)],
    ['root',
      // таз, позвоночник, ближняя нога
      spine(a, [[51, 50], [50.4, 55], [50, 58]], 1.6) +
      pelvis(a, 50, 59) +
      shade(a, smooth([[45, 50], [52, 49], [53, 53], [46, 54]], true), 0.5)],
    ['legNear',
      bone(a, [53, 60], [57, 74], 2.4) +
      `<ellipse cx="57.3" cy="74" rx="1.6" ry="1.3" fill="${a.sph(T.bone)}" stroke="${C.ink}" stroke-width="0.5"/>` +
      bone(a, [57, 74], [56, 88], 2) +
      line('M55.6,76 L54.8,87', T.bone.lo, 0.6, 0.8) +
      boneFoot(a, 56, 90, 6.2) +
      tint(smooth([[53.4, 89], [60.6, 89], [62, 91.4], [52, 91.4]], true), '#000000', 0.15)],
    ['root',
      // грудная клетка, ключица, лопатка
      vol(a, smooth([[43.6, 31.6], [47.4, 30.6], [48.6, 33], [47.6, 38.6], [44.6, 39.6]], true), T.boneFar, 0.6) +
      ribcage(a, 49, 32, 49, 8.5) +
      bone(a, [49, 30.8], [56.6, 31.6], 1.2) +
      // шея
      spine(a, [[50.6, 25.4], [50, 30]], 1.4)],
    ['head',
      skull(a, 51, 18, 5) +
      spec(a, 49, 14.4, 0.7, 0.6)],
    ['armNear',
      // ближняя рука с мечом
      bone(a, [55.6, 32.6], [61, 42], 2.2) +
      forearm(a, [61, 42], [68.6, 41.6], 1.9) +
      blade(a, 70.4, 41, -58, 30, 3.2, { rust: true }) +
      boneHand(a, 69.6, 41.8, 40, 0.9, T.bone, 70) +
      spec(a, 82, 23.6, 0.5, 0.9)],
  ],
)
