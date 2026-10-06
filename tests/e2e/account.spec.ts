import { expect, test } from '@playwright/test'
import { guestWithHero, id } from './helpers'

test('регистрация по email → герой 1-го уровня → смена языка → выход', async ({ page }) => {
  const email = `e2e${Date.now()}${Math.floor(Math.random() * 1000)}@test.dev`
  await page.goto('/')
  await id(page, 'toggle-mode').click()
  await id(page, 'email').fill(email)
  await id(page, 'password').fill('secret123')
  await id(page, 'submit-email').click()

  await id(page, 'hero-name').fill('Arthur')
  await id(page, 'race-knight').click()
  await id(page, 'create-hero').click()
  await expect(id(page, 'hero-level')).toContainText('Level 1')

  await id(page, 'menu-profile').click()
  await expect(id(page, 'stat-points')).toContainText('0')
  await id(page, 'back').click()

  await id(page, 'menu-settings').click()
  await expect(id(page, 'account-info')).toContainText(email)
  await id(page, 'language-ru').click()
  await id(page, 'back').click()
  await expect(id(page, 'menu-bot')).toHaveText('Бой с ботом')

  await id(page, 'menu-settings').click()
  await id(page, 'sign-out').click()
  await expect(id(page, 'guest')).toBeVisible()

  // Повторный вход тем же аккаунтом — герой на месте
  await id(page, 'email').fill(email)
  await id(page, 'password').fill('secret123')
  await id(page, 'submit-email').click()
  await expect(id(page, 'hero-display-name')).toHaveText('Arthur')
})

test('гость распределяет очки; прогресс сохраняется после перезагрузки', async ({ page }) => {
  await guestWithHero(page, 'Allocator', 'elf')
  await id(page, 'menu-profile').click()
  await expect(id(page, 'stat-points')).toContainText('4')
  await id(page, 'add-stat-attack').click()
  await expect(id(page, 'stat-attack')).toHaveText('2')
  await expect(id(page, 'stat-points')).toContainText('3')
  await id(page, 'add-skill-necro').click()
  await expect(id(page, 'skill-necro')).toHaveText('1')
  await expect(id(page, 'add-skill-elf')).toBeDisabled()

  await page.reload()
  await expect(id(page, 'stat-attack')).toHaveText('2')
})

test('гость привязывает email: создаётся герой 1-го уровня', async ({ page }) => {
  await guestWithHero(page, 'Linker', 'demon')
  await id(page, 'menu-settings').click()
  await id(page, 'link-email').fill(`link${Date.now()}@test.dev`)
  await id(page, 'link-password').fill('secret123')
  await id(page, 'link-account').click()
  await expect(page.getByText('Account linked')).toBeVisible()
  await id(page, 'back').click()
  await expect(id(page, 'hero-level')).toContainText('Level 1')
})
