import { test, expect } from '@playwright/test'

test.describe('KManager AI E2E', () => {
  test('application loads with correct title', async ({ browser }) => {
    const electronApp = await require('electron')
    const app = await electronApp.launch({ args: ['.'] })
    const window = await app.firstWindow()
    await expect(window).toHaveTitle(/Knowledge Management Studio|KManager AI/)
    await app.close()
  })

  test('search input is present', async ({ browser }) => {
    const electronApp = await require('electron')
    const app = await electronApp.launch({ args: ['.'] })
    const window = await app.firstWindow()
    const searchPlaceholder = await window.locator('textarea[placeholder*="Ask anything"]')
    await expect(searchPlaceholder).toBeVisible({ timeout: 10000 })
    await app.close()
  })

  test('sidebar navigation renders', async ({ browser }) => {
    const electronApp = await require('electron')
    const app = await electronApp.launch({ args: ['.'] })
    const window = await app.firstWindow()
    await expect(window.locator('text=Search')).toBeVisible({ timeout: 10000 })
    await expect(window.locator('text=Analytics')).toBeVisible()
    await expect(window.locator('text=Users')).toBeVisible()
    await app.close()
  })
})
