const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('SpotLite Palette E2E', () => {
  const launch = async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    // Wait for the app shell to finish mounting so key listeners are registered
    await expect(window.getByText('KManager AI').first()).toBeVisible({ timeout: 15000 })
    return { electronApp, window }
  }

  test('opens on Ctrl+K with search input', async () => {
    const { electronApp, window } = await launch()
    await window.keyboard.press('Control+k')
    await expect(window.locator('input[placeholder="Search your library..."]')).toBeVisible({ timeout: 10000 })
    await electronApp.close()
  })

  test('switches between Library and Ask AI modes', async () => {
    const { electronApp, window } = await launch()
    await window.keyboard.press('Control+k')
    await expect(window.locator('input[placeholder="Search your library..."]')).toBeVisible()
    const aiToggle = window.getByRole('button', { name: 'Ask AI', exact: true })
    await expect(aiToggle).toBeEnabled()
    await aiToggle.click()
    await expect(window.getByText('KManager AI').first()).toBeVisible({ timeout: 5000 })
    await window.getByRole('button', { name: 'Library', exact: true }).click()
    await expect(window.locator('input[placeholder="Search your library..."]')).toBeVisible()
    await electronApp.close()
  })

  test('closes on Escape', async () => {
    const { electronApp, window } = await launch()
    await window.keyboard.press('Control+k')
    await expect(window.locator('input[placeholder="Search your library..."]')).toBeVisible()
    // Playwright keyboard.press is unreliable with the focused modal input in Electron,
    // so dispatch the native keydown directly through the renderer.
    await window.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))
    })
    await expect(window.locator('input[placeholder="Search your library..."]')).not.toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })
})
