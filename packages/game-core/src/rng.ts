/**
 * Детерминированный PRNG xoshiro128**.
 * Состояние — 4 × uint32, сериализуется в массив чисел (в PvP хранится в /battles/{id}/private/server).
 */
export type RngState = [number, number, number, number]

export interface Rng {
  /** Число в [0, 1) */
  next(): number
  /** Целое в [min, max] включительно */
  int(min: number, max: number): number
  /** true с вероятностью p */
  chance(p: number): boolean
  pick<T>(items: readonly T[]): T
  state(): RngState
}

function splitmix32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x9e3779b9) >>> 0
    let z = a
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0
    return (z ^ (z >>> 16)) >>> 0
  }
}

export function seedState(seed: number | string): RngState {
  let n: number
  if (typeof seed === 'number') {
    n = seed >>> 0
  } else {
    // FNV-1a
    n = 0x811c9dc5
    for (let i = 0; i < seed.length; i++) {
      n ^= seed.charCodeAt(i)
      n = Math.imul(n, 0x01000193) >>> 0
    }
  }
  const sm = splitmix32(n)
  const s: RngState = [sm(), sm(), sm(), sm()]
  if (s.every((v) => v === 0)) s[0] = 1
  return s
}

const rotl = (x: number, k: number) => ((x << k) | (x >>> (32 - k))) >>> 0

export function createRng(initial: RngState | number | string): Rng {
  const s: RngState = Array.isArray(initial) ? [...initial] : seedState(initial)

  const nextU32 = () => {
    const result = Math.imul(rotl(Math.imul(s[1], 5) >>> 0, 7), 9) >>> 0
    const t = (s[1] << 9) >>> 0
    s[2] = (s[2] ^ s[0]) >>> 0
    s[3] = (s[3] ^ s[1]) >>> 0
    s[1] = (s[1] ^ s[2]) >>> 0
    s[0] = (s[0] ^ s[3]) >>> 0
    s[2] = (s[2] ^ t) >>> 0
    s[3] = rotl(s[3], 11)
    return result
  }

  const rng: Rng = {
    next: () => nextU32() / 0x100000000,
    int: (min, max) => min + Math.floor(rng.next() * (max - min + 1)),
    chance: (p) => rng.next() < p,
    pick: (items) => {
      if (items.length === 0) throw new Error('pick from empty list')
      return items[rng.int(0, items.length - 1)]!
    },
    state: () => [...s],
  }
  return rng
}
