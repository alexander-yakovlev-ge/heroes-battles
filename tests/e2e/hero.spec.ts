import { expect, test } from '@playwright/test'
import { battle, clickCell, guestWithHero, id, waitPlayerHeroTurn } from './helpers'

test('герой в очереди хода: удар героя и заклинание выбираются явно', async ({ page }) => {
  test.setTimeout(240_000)
  await guestWithHero(page, 'Herald', 'necro')

  // Подсказки к статам в профиле
  await id(page, 'menu-profile').click()
  await expect(id(page, 'hint-power')).toContainText('Lightning Bolt: 16')
  await expect(id(page, 'hero-in-battle')).toContainText('initiative 10')
  await id(page, 'back').click()

  await id(page, 'menu-castle').click()
  await id(page, 'add-necro_skeleton').click()
  await id(page, 'to-battle').click()
  await id(page, 'start-battle').click()
  await id(page, 'prep-start').click()

  // Герой на шкале очереди, справка открывается
  await expect(page.locator('[data-testid^="queue-hero-"]').first()).toBeVisible()
  await id(page, 'action-help').click()
  await expect(id(page, 'help')).toContainText('initiative 10')
  await id(page, 'help-close').click()

  // Ход героя: удар — выбрать «Удар», прицелиться (прогноз), подтвердить
  await waitPlayerHeroTurn(page)
  await expect(id(page, 'action-wait')).toHaveCount(0)
  await id(page, 'action-hero-strike').click()
  let b = (await battle(page))!
  const targetId = b.heroStrikes[0]!
  const target = b.units.find((u) => u.id === targetId)!
  await clickCell(page, target.x, target.y)
  await expect(id(page, 'forecast')).toContainText('Damage')
  await clickCell(page, target.x, target.y)
  await expect(id(page, 'battle-log')).toContainText('strikes')

  // Следующий ход героя: заклинание «Молния» по врагу
  await waitPlayerHeroTurn(page)
  await id(page, 'action-spells').click()
  await id(page, 'spell-lightning_bolt').click()
  b = (await battle(page))!
  const enemy = b.units.find((u) => u.team === 'blue' && u.count > 0)!
  await clickCell(page, enemy.x, enemy.y)
  await expect(id(page, 'battle-log')).toContainText('Lightning Bolt')
})
