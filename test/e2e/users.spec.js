const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Users View', () => {
  test('users table displays mock data', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: 'Users', exact: true }).click()
    await expect(window.locator('text=Alex Morgan')).toBeVisible({ timeout: 5000 })
    await expect(window.locator('text=Sarah Chen')).toBeVisible()
    await expect(window.locator('text=Harvey Specter')).toBeVisible()
    await electronApp.close()
  })

  test('users view has search filter', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: 'Users', exact: true }).click()
    const search = window.locator('input[placeholder="Search users..."]')
    await expect(search).toBeVisible()
    await search.fill('Alex')
    await window.waitForTimeout(200)
    await expect(window.locator('text=Alex Morgan')).toBeVisible()
    await electronApp.close()
  })

  test('users view has Add User button', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: 'Users', exact: true }).click()
    await expect(window.locator('button:has-text("Add User")')).toBeVisible()
    await electronApp.close()
  })
})
