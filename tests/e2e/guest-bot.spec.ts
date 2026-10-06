import { expect, test } from '@playwright/test'
import { battle, clickCell, guestWithHero, id, waitPlayerTurn, waitPlayerUnitTurn } from './helpers'

test('гость → армия в Замке → бой с ботом: ход по клику, сдача, возврат в меню', async ({ page }) => {
  await guestWithHero(page, 'GuestE2E')

  // Замок: добавляем скелетов (вкладка стартовой расы открыта по умолчанию) и идём в бой
  await id(page, 'menu-castle').click()
  await id(page, 'add-necro_skeleton').click()
  await expect(id(page, 'slot-necro_skeleton')).toBeVisible()
  await id(page, 'add-necro_zombie').click()
  await expect(id(page, 'slot-necro_zombie')).toBeVisible()
  await id(page, 'to-battle').click()

  // Экран боя с ботом
  await id(page, 'difficulty-easy').click()
  await id(page, 'start-battle').click()

  // Подготовка: противник виден, делим стак скелетов надвое
  await expect(id(page, 'preparation')).toBeVisible({ timeout: 60_000 })
  await expect(id(page, 'prep-stacks')).toContainText('2 / 7')
  await id(page, 'prep-split-0').click()
  await id(page, 'prep-split-confirm-0').click()
  await expect(id(page, 'prep-stacks')).toContainText('3 / 7')
  await id(page, 'prep-start').click()
  await expect(id(page, 'battle-board')).toBeVisible()
  expect((await battle(page))!.units.filter((u) => u.team === 'red')).toHaveLength(3)

  // Ход: клик по доступной клетке перемещения
  await waitPlayerUnitTurn(page)
  const before = (await battle(page))!
  const active = before.units.find((u) => u.id === before.activeId)!
  expect(before.moves.length).toBeGreaterThan(0)
  const [mx, my] = before.moves[before.moves.length - 1]!.split(',').map(Number) as [number, number]
  await clickCell(page, mx, my)
  await expect
    .poll(async () => {
      const u = (await battle(page))?.units.find((x) => x.id === active.id)
      return u ? `${u.x},${u.y}` : null
    })
    .toBe(`${mx},${my}`)

  // Защита следующим юнитом через панель действий
  await waitPlayerUnitTurn(page)
  await id(page, 'action-defend').click()
  await expect(id(page, 'battle-log')).toContainText('defends')

  // Сдача → поражение → меню
  await waitPlayerTurn(page)
  await id(page, 'action-surrender').click()
  await id(page, 'confirm-surrender').click()
  await expect(id(page, 'result-title')).toHaveText('Defeat')
  await id(page, 'result-menu').click()
  await expect(id(page, 'menu-bot')).toBeVisible()
})
