const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Settings Panel', () => {
  test('settings modal opens from sidebar', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Settings').click()
    await expect(window.getByText('Settings & Knowledge Hub')).toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })

  test('settings sidebar tabs are present', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Settings').click()
    await expect(window.getByRole('button', { name: 'Connection', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'DB Properties', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Data Ingestion', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'AI', exact: true })).toBeVisible()
    await electronApp.close()
  })

  test('clicking AI tab shows API key field', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Settings').click()
    await window.getByRole('button', { name: 'AI', exact: true }).click()
    await expect(window.locator('text=DeepSeek API Key')).toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })

  test('settings modal closes on Escape', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Settings').click()
    await expect(window.getByText('Settings & Knowledge Hub')).toBeVisible()
    await window.keyboard.press('Escape')
    await window.waitForTimeout(500)
    await expect(window.getByText('Settings & Knowledge Hub')).not.toBeVisible()
    await electronApp.close()
  })
})
