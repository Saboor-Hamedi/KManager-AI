const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Analytics Dashboard', () => {
  test('analytics view renders when navigated to', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Analytics', { exact: true }).click()
    await expect(window.getByRole('heading', { name: 'Hybrid RAG Analytics' })).toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })

  test('analytics section tabs are present', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Analytics', { exact: true }).click()
    await window.waitForTimeout(1000)
    
    // The sidebar has 4 tab buttons
    const viewButtons = window.locator('button').filter({ hasText: /(Overview|Performance Charts|Raw Telemetry|Activity Feed)/ })
    await expect(viewButtons).toHaveCount(4)
    
    await electronApp.close()
  })
})
