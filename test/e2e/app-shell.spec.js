const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Application Shell', () => {
  test('launches with correct window title', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const title = await window.title()
    expect(title).toContain('KManager AI')
    await electronApp.close()
  })

  test('displays custom title bar with app name', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.locator('.text-\\[var\\(--text-main\\)\\] >> text=KManager AI')).toBeVisible()
    await expect(window.locator('text=Knowledge Management Studio')).toBeVisible()
    await electronApp.close()
  })

  test('shows window control buttons', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.locator('button[title="Minimize"]')).toBeVisible()
    await expect(window.locator('button[title="Maximize"]')).toBeVisible()
    await expect(window.locator('button[title="Close"]')).toBeVisible()
    await electronApp.close()
  })

  test('shows sidebar branding', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByText('KMANAGER', { exact: true })).toBeVisible()
    await electronApp.close()
  })
})
