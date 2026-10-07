export const RACES = [
  'knight',
  'necro',
  'wizard',
  'elf',
  'barbarian',
  'demon',
  'dungeon',
  'fortress',
] as const
export type RaceId = (typeof RACES)[number]

export const STATS = ['attack', 'defense', 'power', 'knowledge'] as const
export type StatId = (typeof STATS)[number]
export type HeroStats = Record<StatId, number>

export type Tier = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type Mode = '1v1' | '2v2' | '3v3'
export type Team = 'red' | 'blue'

export type AbilityId =
  | 'double_attack'
  | 'no_retaliation'
  | 'life_drain'
  | 'area_attack'
  | 'poison'
  | 'fire_breath'
  | 'unlimited_retaliation'
  | 'charge'
  | 'entangle'
  | 'petrify'
  | 'stun'
  | 'regeneration'
  | 'rebirth'
  | 'incorporeal'
  | 'magic_resist'
  | 'aura_magic_resist'
  | 'aura_defense'
  | 'aura_dread'
  | 'fire_aura'
  | 'mana_drain'
  | 'caster'
  | 'chain_attack'
  | 'return_strike'
  | 'teleport'
  | 'ignore_range_penalty'
  | 'no_melee_penalty'
  | 'all_around_attack'
  | 'deadly_strike'
  | 'initiative_drain'
  | 'curse_on_hit'
  | 'dispel_on_hit'
  | 'undead'
  | 'fire_immune'
  | 'poison_immune'
  | 'blind_immune'
  | 'spell_immune'

export type SpellId =
  | 'lightning_bolt'
  | 'cure'
  | 'haste'
  | 'slow'
  | 'divine_strength'
  | 'resurrection'
  | 'curse'
  | 'raise_dead'
  | 'blind'
  | 'chain_lightning'
  | 'regeneration'
  | 'entangle'
  | 'bloodlust'
  | 'war_cry'
  | 'fireball'
  | 'armageddon'
  | 'confusion'
  | 'meteor_shower'
  | 'stone_skin'
  | 'earthquake'

export type SpellSchool = 'common' | RaceId

/** Роль юнита в треугольнике «стрелки > тяжёлые > мобильные > стрелки» (§5.6) */
export type UnitRole = 'shooter' | 'heavy' | 'mobile'

export interface UnitTemplate {
  id: string
  raceId: RaceId
  tier: Tier
  variant: 'base' | 'alt'
  nameKey: string
  size: 1 | 2
  attack: number
  defense: number
  damageMin: number
  damageMax: number
  health: number
  speed: number
  initiative: number
  weight: number
  isFlying: boolean
  role: UnitRole
  ranged?: { range: number; shots: number }
  abilities: AbilityId[]
  /** Заклинания для способности `caster` (одно выбирается случайно, если их несколько) */
  casterSpells?: SpellId[]
}

export type EffectId =
  | 'haste'
  | 'slow'
  | 'divine_strength'
  | 'curse'
  | 'bloodlust'
  | 'stone_skin'
  | 'confusion'
  | 'war_cry'
  | 'regeneration'
  | 'poison'
  | 'blind'
  | 'entangled'
  | 'petrified'
  | 'stunned'
  | 'initiative_drain'
  | 'earthquake'

export interface Effect {
  id: EffectId
  /** Сколько концов раунда эффект ещё переживёт; эффект активен, пока > 0 */
  roundsLeft: number
  value?: number
}

export interface Cell {
  x: number
  y: number
}

export interface UnitState {
  id: string
  templateId: string
  owner: string
  team: Team
  count: number
  initialCount: number
  topHp: number
  x: number
  y: number
  shotsLeft?: number
  retaliatedThisRound: boolean
  waitedThisRound: boolean
  defending: boolean
  casterUsed: boolean
  rebirthUsed: boolean
  effects: Effect[]
  skinId?: string
  /** Порядок для разрешения равенства инициативы (чередование команд по жребию) */
  tieOrder: number
}

export interface Hero {
  uid: string
  level: number
  experience: number
  startingRace: RaceId
  stats: HeroStats
  raceSkills: Record<RaceId, number>
  statHistory: StatId[]
  raceSkillHistory: RaceId[]
  pendingStatPoints: number
  pendingRaceSkillPoints: number
  lastFreeRespecSeason: number | null
}

export interface BattleHero {
  uid: string
  team: Team
  realLevel: number
  stats: HeroStats
  raceSkills: Record<RaceId, number>
  spells: SpellId[]
  mana: number
  maxMana: number
  /** Инициатива героя: герой ходит в общей очереди наравне с юнитами (§5.3) */
  initiative: number
  /** Сила удара героя на уровне боя (§5.5) */
  strike: number
  /** Герой уже сделал ход в этом раунде (заклинание, удар или пропуск) */
  castThisRound: boolean
  surrendered: boolean
}

export interface ArmySlot {
  unitId: string
  count: number
  skinId?: string
}

export interface Grid {
  width: number
  height: number
  obstacles: [number, number][]
}

export type BattleEndReason = 'elimination' | 'surrender' | 'timeout' | 'round_limit'

export interface BattleState {
  status: 'active' | 'finished'
  mode: Mode
  balanceVersion: string
  battleLevel: number
  teams: Record<Team, string[]>
  heroes: Record<string, BattleHero>
  grid: Grid
  units: UnitState[]
  /** Очередь текущего раунда: id юнитов и героев (heroQueueId); queue[0] — тот, кто ходит */
  queue: string[]
  /** Ходит юнит — его id; ходит герой — null, а uid героя в activeHeroUid */
  activeUnitId: string | null
  activeHeroUid: string | null
  round: number
  seq: number
  /** Подряд пропущенные по тайм-ауту ходы игрока */
  timeouts: Record<string, number>
  winner: Team | 'draw' | null
  endReason: BattleEndReason | null
}

export type Action =
  | { type: 'move'; unitId: string; to: Cell }
  | { type: 'attack'; unitId: string; targetId: string; from: Cell }
  /** from — клетка, куда стрелок сначала переходит (не дальше shootMoveLimit, §5.6) */
  | { type: 'shoot'; unitId: string; targetId: string; from?: Cell }
  | { type: 'wait'; unitId: string }
  | { type: 'defend'; unitId: string }
  | { type: 'ability'; unitId: string; targetId: string }
  | { type: 'cast'; heroUid: string; spellId: SpellId; target: Cell }
  | { type: 'hero_strike'; heroUid: string; targetId: string }
  | { type: 'hero_pass'; heroUid: string }
  | { type: 'surrender'; heroUid: string }

export type BattleEvent =
  | { type: 'round_start'; round: number }
  | { type: 'turn_start'; unitId: string }
  | { type: 'hero_turn'; heroUid: string }
  | { type: 'hero_strike'; heroUid: string; targetId: string }
  | { type: 'hero_pass'; heroUid: string }
  | { type: 'skip_turn'; unitId: string; reason: 'blind' | 'petrified' }
  | { type: 'move'; unitId: string; from: Cell; to: Cell }
  | {
      type: 'damage'
      sourceId: string | null
      targetId: string
      damage: number
      kills: number
      kind: 'melee' | 'ranged' | 'retaliation' | 'spell' | 'ability' | 'poison' | 'aura' | 'hero'
    }
  | { type: 'evade'; sourceId: string; targetId: string }
  | { type: 'heal'; targetId: string; hp: number; raised: number }
  | { type: 'effect'; targetId: string; effect: EffectId; rounds: number }
  | { type: 'dispel'; targetId: string }
  | { type: 'death'; unitId: string }
  | { type: 'rebirth'; unitId: string; count: number }
  | { type: 'wait'; unitId: string }
  | { type: 'defend'; unitId: string }
  | { type: 'cast'; heroUid: string; spellId: SpellId; target: Cell }
  | { type: 'ability'; unitId: string; spellId: SpellId; targetId: string }
  | { type: 'mana_drain'; heroUid: string; amount: number }
  | { type: 'surrender'; heroUid: string }
  | { type: 'timeout'; heroUid: string; unitId: string | null }
  | { type: 'battle_end'; winner: Team | 'draw'; reason: BattleEndReason }
