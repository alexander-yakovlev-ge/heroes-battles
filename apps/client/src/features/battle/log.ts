import { getUnit, type BattleEvent, type BattleState, type Team } from '@hb/game-core'

export interface LogLine {
  id: number
  text: string
  team: Team | null
}

type T = (key: string, opts?: Record<string, unknown>) => string

/** Строка журнала боя для события; null — событие не показывается */
export function formatEvent(t: T, state: BattleState, ev: BattleEvent, heroNames: Record<string, string>): Omit<LogLine, 'id'> | null {
  const unit = (id: string | null) => {
    const u = id ? state.units.find((x) => x.id === id) : undefined
    return u ? { name: t(getUnit(u.templateId).nameKey), team: u.team } : { name: '?', team: null }
  }
  const hero = (uid: string) => ({ name: heroNames[uid] ?? uid, team: state.heroes[uid]?.team ?? null })

  switch (ev.type) {
    case 'round_start':
      return { text: t('log.round_start', { round: ev.round }), team: null }
    case 'move': {
      const u = unit(ev.unitId)
      return { text: t('log.move', { unit: u.name }), team: u.team }
    }
    case 'damage': {
      const target = unit(ev.targetId)
      if (ev.sourceId) {
        const source = unit(ev.sourceId)
        const key = ev.kills > 0 ? 'log.damage_kills' : 'log.damage'
        return { text: t(key, { source: source.name, target: target.name, damage: ev.damage, kills: ev.kills }), team: source.team }
      }
      const key = ev.kills > 0 ? 'log.damage_nosource_kills' : 'log.damage_nosource'
      return { text: t(key, { target: target.name, damage: ev.damage, kills: ev.kills }), team: null }
    }
    case 'evade': {
      const target = unit(ev.targetId)
      return { text: t('log.evade', { target: target.name }), team: target.team }
    }
    case 'heal': {
      const target = unit(ev.targetId)
      const key = ev.raised > 0 ? 'log.heal_raised' : 'log.heal'
      return { text: t(key, { target: target.name, hp: ev.hp, raised: ev.raised }), team: target.team }
    }
    case 'effect': {
      const target = unit(ev.targetId)
      return { text: t('log.effect', { target: target.name, effect: t(`effect.${ev.effect}`) }), team: null }
    }
    case 'dispel':
      return { text: t('log.dispel', { target: unit(ev.targetId).name }), team: null }
    case 'death': {
      const u = unit(ev.unitId)
      return { text: t('log.death', { unit: u.name }), team: u.team }
    }
    case 'rebirth': {
      const u = unit(ev.unitId)
      return { text: t('log.rebirth', { unit: u.name, count: ev.count }), team: u.team }
    }
    case 'wait':
    case 'defend': {
      const u = unit(ev.unitId)
      return { text: t(`log.${ev.type}`, { unit: u.name }), team: u.team }
    }
    case 'cast': {
      const h = hero(ev.heroUid)
      return { text: t('log.cast', { hero: h.name, spell: t(`spell.${ev.spellId}`) }), team: h.team }
    }
    case 'ability': {
      const u = unit(ev.unitId)
      return { text: t('log.ability', { unit: u.name, spell: t(`spell.${ev.spellId}`) }), team: u.team }
    }
    case 'mana_drain': {
      const h = hero(ev.heroUid)
      return { text: t('log.mana_drain', { hero: h.name, amount: ev.amount }), team: h.team }
    }
    case 'skip_turn': {
      const u = unit(ev.unitId)
      return { text: t('log.skip_turn', { unit: u.name }), team: u.team }
    }
    case 'hero_strike': {
      const h = hero(ev.heroUid)
      return { text: t('log.hero_strike', { hero: h.name, target: unit(ev.targetId).name }), team: h.team }
    }
    case 'hero_pass': {
      const h = hero(ev.heroUid)
      return { text: t('log.hero_pass', { hero: h.name }), team: h.team }
    }
    case 'surrender': {
      const h = hero(ev.heroUid)
      return { text: t('log.surrender', { hero: h.name }), team: h.team }
    }
    default:
      return null
  }
}
