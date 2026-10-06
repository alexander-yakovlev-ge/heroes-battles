import { expect, type Page } from '@playwright/test'

export const id = (page: Page, testId: string) => page.getByTestId(testId)

/** Вход гостем и создание героя */
export async function guestWithHero(page: Page, name: string, race = 'necro') {
  await page.goto('/')
  await id(page, 'guest').click()
  await id(page, 'hero-name').fill(name)
  await id(page, `race-${race}`).click()
  await id(page, 'create-hero').click()
  await expect(id(page, 'hero-level')).toContainText('5')
}

interface BattleHook {
  phase: 'loading' | 'prep' | 'battle'
  stacks?: number
  heroTurn: boolean
  aim: string | null
  forecast: { min: number; max: number } | null
  attackCells: string[]
  shoots: string[]
  heroStrikes: string[]
  queue: string[]
  /** id цели → клетки, с которых её можно атаковать */
  attacks: Record<string, string[]>
  status: string
  playerTurn: boolean
  cell: number
  moves: string[]
  targets: string[]
  activeId: string | null
  units: { id: string; team: string; x: number; y: number; count: number }[]
}

export const battle = (page: Page) => page.evaluate(() => (globalThis as { __hbBattle?: unknown }).__hbBattle as BattleHook | undefined)

/** Дождаться хода игрока (юнита или героя) */
export async function waitPlayerTurn(page: Page) {
  await expect.poll(async () => (await battle(page))?.playerTurn, { timeout: 60_000 }).toBe(true)
}

/** Дождаться хода юнита игрока; ход героя пропускается */
export async function waitPlayerUnitTurn(page: Page) {
  for (let i = 0; i < 10; i++) {
    await waitPlayerTurn(page)
    if (!(await battle(page))!.heroTurn) return
    await id(page, 'action-hero-pass').click()
    await expect.poll(async () => (await battle(page))?.heroTurn).toBe(false)
  }
  throw new Error('no unit turn')
}

/** Дождаться хода героя игрока; юниты защищаются */
export async function waitPlayerHeroTurn(page: Page) {
  for (let i = 0; i < 30; i++) {
    await waitPlayerTurn(page)
    if ((await battle(page))!.heroTurn) return
    await id(page, 'action-defend').click()
    await expect.poll(async () => (await battle(page))?.playerTurn, { timeout: 60_000 }).toBeDefined()
  }
  throw new Error('no hero turn')
}

/** Клик по клетке поля боя */
export async function clickCell(page: Page, x: number, y: number) {
  const b = await battle(page)
  const box = await id(page, 'battle-board').boundingBox()
  if (!b || !box) throw new Error('battle board not ready')
  await page.mouse.click(box.x + (x + 0.5) * b.cell, box.y + (y + 0.5) * b.cell)
}
