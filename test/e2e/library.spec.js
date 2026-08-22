const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('My Library E2E', () => {
  test('opens Library view from sidebar', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: /Library/ }).first().click()
    await expect(window.locator('input[placeholder*="Search documents by name"]')).toBeVisible({ timeout: 10000 })
    await electronApp.close()
  })

  test('library has sort and layout controls', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: /Library/ }).first().click()
    await expect(window.locator('button[title="Large Grid"]')).toBeVisible()
    await expect(window.locator('button[title="Small Grid"]')).toBeVisible()
    await expect(window.locator('button[title="List View"]')).toBeVisible()
    await expect(window.getByText('All Files')).toBeVisible()
    await electronApp.close()
  })

  test('returns to search view from library', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: /Library/ }).first().click()
    await expect(window.locator('input[placeholder*="Search documents by name"]')).toBeVisible()
    await window.getByRole('button', { name: /Search/, exact: true }).click()
    await expect(window.locator('textarea[placeholder*="Ask anything"]')).toBeVisible()
    await electronApp.close()
  })
})
