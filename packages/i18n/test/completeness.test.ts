import { describe, expect, it } from 'vitest'
import { RACES, SPELLS, STATS, UNITS } from '@hb/game-core'
import { LANGUAGES, pickLanguage, resources } from '../src/index.js'

type Tree = { [k: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Map<string, string> {
  const out = new Map<string, string>()
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') out.set(key, v)
    else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv)
  }
  return out
}

const flat = Object.fromEntries(LANGUAGES.map((l) => [l, flatten(resources[l].translation as unknown as Tree)]))
const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort()

describe('локализация (§10.2)', () => {
  it('во всех языках одинаковый набор ключей и плейсхолдеров', () => {
    const en = flat.en!
    for (const lang of LANGUAGES) {
      const other = flat[lang]!
      expect([...other.keys()].sort()).toEqual([...en.keys()].sort())
      for (const [k, v] of en) expect(placeholders(other.get(k)!), `${lang}:${k}`).toEqual(placeholders(v))
    }
  })

  it('нет пустых строк', () => {
    for (const lang of LANGUAGES) for (const [k, v] of flat[lang]!) expect(v.trim(), `${lang}:${k}`).not.toBe('')
  })

  it('есть названия всех юнитов, заклинаний, рас, статов, способностей и эффектов из game-core', () => {
    const abilities = new Set(UNITS.flatMap((u) => u.abilities))
    for (const lang of LANGUAGES) {
      const f = flat[lang]!
      for (const u of UNITS) expect(f.has(u.nameKey), `${lang}:${u.nameKey}`).toBe(true)
      for (const s of SPELLS) {
        expect(f.has(s.nameKey), `${lang}:${s.nameKey}`).toBe(true)
        expect(f.has(`spellDesc.${s.id}`), `${lang}:spellDesc.${s.id}`).toBe(true)
      }
      for (const r of RACES) expect(f.has(`race.${r}`)).toBe(true)
      for (const s of STATS) expect(f.has(`stat.${s}`)).toBe(true)
      for (const a of abilities) {
        expect(f.has(`ability.${a}`), `${lang}:ability.${a}`).toBe(true)
        expect(f.has(`abilityDesc.${a}`), `${lang}:abilityDesc.${a}`).toBe(true)
      }
    }
  })

  it('язык выбирается по коду локали, иначе английский', () => {
    expect(pickLanguage('ru-RU')).toBe('ru')
    expect(pickLanguage('en_GB')).toBe('en')
    expect(pickLanguage('de')).toBe('en')
    expect(pickLanguage(undefined)).toBe('en')
  })
})
