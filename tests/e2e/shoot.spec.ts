import { expect, test } from '@playwright/test'
import { battle, clickCell, guestWithHero, id, waitPlayerUnitTurn } from './helpers'

test('лучник: прицел, затем голубая клетка — подход и выстрел за один ход', async ({ page }) => {
  test.setTimeout(240_000)
  await guestWithHero(page, 'Archer', 'necro')
  // Скелет-лучник открывается навыком некромантов 4: у гостя есть очко навыка
  await id(page, 'menu-profile').click()
  await id(page, 'add-skill-necro').click()
  await expect(id(page, 'skill-necro')).toHaveText('4')
  await id(page, 'back').click()
  await id(page, 'menu-castle').click()
  await id(page, 'add-necro_skeleton_archer').click()
  // на уровне берётся один вариант (§6.2): скелет теперь только «Заменить» — второй стак — зомби
  await expect(id(page, 'swap-necro_skeleton')).toBeVisible()
  await id(page, 'add-necro_zombie').click()
  await id(page, 'to-battle').click()
  await id(page, 'start-battle').click()
  await id(page, 'prep-start').click()

  for (let turn = 0; turn < 40; turn++) {
    await waitPlayerUnitTurn(page)
    const b = (await battle(page))!
    const entry = Object.entries(b.shootMoves).find(([, cells]) => cells.length > 0)
    if (entry) {
      const [targetId, cells] = entry
      const target = b.units.find((u) => u.id === targetId)!
      const archerId = b.activeId!
      await clickCell(page, target.x, target.y)
      await expect.poll(async () => (await battle(page))?.shootCells.length).toBeGreaterThan(0)
      const [fx, fy] = cells[cells.length - 1]!.split(',').map(Number) as [number, number]
      await clickCell(page, fx, fy)
      await expect
        .poll(async () => {
          const u = (await battle(page))?.units.find((x) => x.id === archerId)
          return u ? `${u.x},${u.y}` : null
        })
        .toBe(`${fx},${fy}`)
      await expect(id(page, 'battle-log')).toContainText('Skeleton Archer deals')
      return
    }
    if (b.status !== 'active') break
    await id(page, 'action-defend').click()
  }
  throw new Error('лучник так и не получил ход')
})
