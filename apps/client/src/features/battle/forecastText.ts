import type { DamageForecast } from '@hb/game-core'

type T = (key: string, opts?: Record<string, unknown>) => string

/** Строка прогноза удара: урон, погибшие, ответный удар, штрафы и бонус роли */
export function forecastText(t: T, f: DamageForecast): string {
  const parts = [
    f.min === f.max
      ? t('battle.forecastExact', { damage: f.min, kills: f.killsMin })
      : t('battle.forecast', { min: f.min, max: f.max, kmin: f.killsMin, kmax: f.killsMax }),
  ]
  if (f.retaliation) parts.push(t('battle.forecastRetaliation', { min: f.retaliation.min, max: f.retaliation.max }))
  for (const p of f.penalties) parts.push(t(`battle.penalty_${p}`))
  if (f.roleBonus) parts.push(t('battle.roleBonus'))
  return parts.join(' · ')
}
