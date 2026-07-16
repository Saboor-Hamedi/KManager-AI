const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Analytics Dashboard', () => {
  test('analytics view renders when navigated to', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: 'Analytics', exact: true }).click()
    await expect(window.getByRole('heading', { name: 'Hybrid RAG Analytics' })).toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })

  test('analytics section tabs are present', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: 'Analytics', exact: true }).click()
    await window.waitForTimeout(1000)
    await expect(window.getByRole('button', { name: 'Overview', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Cards', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Charts', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Table', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Feed', exact: true })).toBeVisible()
    await electronApp.close()
  })
})
