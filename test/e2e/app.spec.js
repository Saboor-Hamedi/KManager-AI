const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('KManager AI E2E', () => {
  test('application launches and shows the search view', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByRole('heading', { name: 'Knowledge Management' })).toBeVisible({ timeout: 15000 })
    await electronApp.close()
  })

  test('search input is present and interactable', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const searchInput = window.locator('textarea[placeholder*="Ask anything"]')
    await expect(searchInput).toBeVisible({ timeout: 15000 })
    await searchInput.fill('prostate cancer biomarkers')
    await expect(searchInput).toHaveValue('prostate cancer biomarkers')
    await electronApp.close()
  })

  test('sidebar navigation contains expected items', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByRole('button', { name: 'Search', exact: true })).toBeVisible({ timeout: 15000 })
    await expect(window.getByRole('button', { name: 'Analytics', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Users', exact: true })).toBeVisible()
    await electronApp.close()
  })
})
