const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Theme Modal', () => {
  test('opens from Appearance button', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Appearance').click()
    await window.waitForTimeout(500)
    // Check modal appeared by looking for theme name
    const themeNames = window.locator('.theme-modal-name')
    await expect(themeNames.first()).toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })

  test('shows theme cards with names', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Appearance').click()
    await window.waitForTimeout(500)
    // Use exact matching to avoid ambiguity
    await expect(window.getByText('Dark', { exact: true })).toBeVisible()
    await electronApp.close()
  })

  test('has search filter input', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Appearance').click()
    const searchInput = window.locator('input.theme-search-input')
    await expect(searchInput).toBeVisible({ timeout: 5000 })
    await searchInput.fill('nord')
    await window.waitForTimeout(300)
    await expect(window.getByText('Nord', { exact: true })).toBeVisible()
    await electronApp.close()
  })

  test('closes on Escape', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Appearance').click()
    await window.waitForTimeout(500)
    await expect(window.locator('.theme-modal-name').first()).toBeVisible()
    await window.keyboard.press('Escape')
    await window.waitForTimeout(500)
    await expect(window.locator('.theme-modal-name').first()).not.toBeVisible()
    await electronApp.close()
  })
})
