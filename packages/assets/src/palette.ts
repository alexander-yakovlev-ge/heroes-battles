import type { RaceId } from '@hb/game-core'

/** Палитра расы (§10.1): единая гамма для всех юнитов расы и элементов UI */
export interface RacePalette {
  /** Основной цвет расы (рамки, акценты UI) */
  primary: string
  /** Второй цвет (ткань, доспех) */
  secondary: string
  /** Акцент (глаза, магия, огонь) */
  accent: string
  /** Тени и контур */
  dark: string
  /** Блики */
  light: string
}

export const RACE_PALETTES: Record<RaceId, RacePalette> = {
  knight: { primary: '#2f5fb3', secondary: '#c9a227', accent: '#f4e7b0', dark: '#1b2b4d', light: '#e8eef8' },
  necro: { primary: '#5b4b7a', secondary: '#3c4a3f', accent: '#7cf2c4', dark: '#1a1622', light: '#e6e0cf' },
  wizard: { primary: '#2a8fb0', secondary: '#8c7ad6', accent: '#ffd36b', dark: '#173445', light: '#e3f4fa' },
  elf: { primary: '#3f8f3a', secondary: '#9c6b3a', accent: '#d8f27a', dark: '#1f3a1c', light: '#eef7e2' },
  barbarian: { primary: '#a8582a', secondary: '#6b7a3a', accent: '#f2c14e', dark: '#3a2010', light: '#f6e6d6' },
  demon: { primary: '#b02a2a', secondary: '#4a1f1f', accent: '#ffb02e', dark: '#2a0c0c', light: '#f6dada' },
  dungeon: { primary: '#6a2a8f', secondary: '#2a3a5a', accent: '#c46bff', dark: '#1c1028', light: '#ece0f6' },
  fortress: { primary: '#8a6a3a', secondary: '#5a6a7a', accent: '#ff8a2e', dark: '#2e2416', light: '#f2ead8' },
}
