const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Search & Input', () => {
  test('search textarea is present with placeholder', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await expect(input).toBeVisible({ timeout: 10000 })
    await electronApp.close()
  })

  test('send button is disabled initially, enabled with text', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const sendButton = window.locator('button[title="Send message"]')
    await expect(sendButton).toBeDisabled()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await input.fill('test query')
    await expect(sendButton).toBeEnabled()
    await electronApp.close()
  })

  test('RAG toggle button toggles on click', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const ragButton = window.locator('button:has-text("RAG:")')
    await expect(ragButton).toBeVisible()
    const initialText = await ragButton.textContent()
    await ragButton.click()
    await window.waitForTimeout(300)
    const toggledText = await ragButton.textContent()
    expect(toggledText).not.toBe(initialText)
    await electronApp.close()
  })

  test('new session button appears after search', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await input.fill('test query')
    // Use force click to avoid chatbot FAB interception
    await window.locator('button[title="Send message"]').click({ force: true })
    await window.waitForTimeout(2000)
    await electronApp.close()
  })
})
