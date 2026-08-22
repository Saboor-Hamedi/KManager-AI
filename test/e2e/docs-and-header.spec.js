const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Documentation & Header E2E', () => {
  test('opens documentation modal from sidebar footer', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Documentation').click()
    await expect(window.locator('.custom-scrollbar').first()).toBeVisible({ timeout: 10000 })
    await electronApp.close()
  })

  test('header contains sidebar toggle button', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.locator('button[title="Toggle sidebar (Ctrl+B)"]')).toBeVisible()
    await electronApp.close()
  })

  test('sidebar toggle collapses navigation', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByRole('button', { name: 'Analytics', exact: true })).toBeVisible()
    await window.locator('button[title="Toggle sidebar (Ctrl+B)"]').click()
    await expect(window.getByRole('button', { name: 'Analytics', exact: true })).not.toBeVisible()
    await electronApp.close()
  })

  test('settings opens with system tab by default', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Settings').click()
    await expect(window.getByText('Settings & Knowledge Hub')).toBeVisible({ timeout: 5000 })
    await expect(window.getByRole('button', { name: 'System', exact: true })).toBeVisible()
    await electronApp.close()
  })
})
