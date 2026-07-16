const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Navigation & Sidebar', () => {
  test('sidebar has three nav items', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByRole('button', { name: 'Search', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Analytics', exact: true })).toBeVisible()
    await expect(window.getByRole('button', { name: 'Users', exact: true })).toBeVisible()
    await electronApp.close()
  })

  test('sidebar footer has Appearance and Settings', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByText('Appearance')).toBeVisible()
    await expect(window.getByText('Settings')).toBeVisible()
    await electronApp.close()
  })

  test('clicking Analytics navigates to analytics view', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: 'Analytics', exact: true }).click()
    await expect(window.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })

  test('clicking Users navigates to users view', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByRole('button', { name: 'Users', exact: true }).click()
    // Users title is in App.jsx h1
    await expect(window.getByRole('heading', { name: 'Users Management' })).toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })

  test('search view is default and shows empty state', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByRole('heading', { name: 'Knowledge Management' })).toBeVisible()
    await expect(window.locator('text=Ask anything across your entire knowledge base')).toBeVisible()
    await electronApp.close()
  })

  test('shows suggestion buttons on empty search', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.locator('text=Summarize recent notes')).toBeVisible()
    await expect(window.locator('text=Find concepts in my vault')).toBeVisible()
    await expect(window.locator('text=Compare two topics')).toBeVisible()
    await electronApp.close()
  })
})
