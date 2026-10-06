import { create } from 'zustand'
import type { BotDifficulty } from '@hb/game-core'

/** Параметры следующего боя с ботом: выбираются на экране «Бой с ботом», читаются экраном боя */
interface BattleSetup {
  difficulty: BotDifficulty
  /** Номер боя — меняется при каждом старте, чтобы экран боя пересоздал бой */
  battleId: number
  seed: number
  start: (difficulty: BotDifficulty) => void
}

export const useBattleSetup = create<BattleSetup>((set) => ({
  difficulty: 'normal',
  battleId: 0,
  seed: 1,
  start: (difficulty) =>
    set((s) => ({ difficulty, battleId: s.battleId + 1, seed: Math.floor(Math.random() * 0x7fffffff) })),
}))
