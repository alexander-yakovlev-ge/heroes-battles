import { expect, test } from '@playwright/test'
import { battle, clickCell, guestWithHero, id, waitPlayerUnitTurn } from './helpers'

test('атака: первое нажатие — прицел с прогнозом и клетками, второе — удар с выбранной клетки', async ({ page }) => {
  test.setTimeout(240_000)
  await guestWithHero(page, 'Striker', 'necro')
  await id(page, 'menu-castle').click()
  await id(page, 'add-necro_skeleton').click()
  await id(page, 'add-necro_ghost').click()
  await id(page, 'to-battle').click()
  await id(page, 'difficulty-normal').click()
  await id(page, 'start-battle').click()
  await id(page, 'prep-start').click()

  // Защищаемся, пока враг не окажется в досягаемости с нескольких клеток
  for (let turn = 0; turn < 60; turn++) {
    await waitPlayerUnitTurn(page)
    const b = (await battle(page))!
    const entry = Object.entries(b.attacks).find(([tid, cells]) => cells.length >= 2 && !b.shoots.includes(tid))
    if (entry) {
      const [targetId, cells] = entry
      const target = b.units.find((u) => u.id === targetId)!
      const activeId = b.activeId!
      await clickCell(page, target.x, target.y)
      await expect.poll(async () => (await battle(page))?.aim).toBe(targetId)
      await expect(id(page, 'forecast')).toBeVisible()
      expect((await battle(page))!.forecast!.min).toBeGreaterThan(0)
      expect((await battle(page))!.attackCells.length).toBeGreaterThanOrEqual(cells.length)

      // Бьём с последней из предложенных клеток
      const [fx, fy] = cells[cells.length - 1]!.split(',').map(Number) as [number, number]
      await clickCell(page, fx, fy)
      await expect
        .poll(async () => {
          const u = (await battle(page))?.units.find((x) => x.id === activeId)
          return u && u.count > 0 ? `${u.x},${u.y}` : 'dead'
        })
        .toMatch(new RegExp(`^(${fx},${fy}|dead)$`))
      await expect(id(page, 'battle-log')).toContainText('damage')
      return
    }
    if (b.status !== 'active') break
    await id(page, 'action-defend').click()
  }
  throw new Error('враг так и не подошёл')
})
