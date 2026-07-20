const { _electron: electron } = require('playwright')
const { test, expect } = require('@playwright/test')

test.describe('Search & Input', () => {
  test('search textarea is present with placeholder', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await expect(input).toBeVisible({ timeout: 15000 })
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
})

test.describe('RAG Toggle', () => {
  test('RAG toggle button is visible and toggles on click', async () => {
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

  test('RAG toggle shows ON/OFF text', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const ragButton = window.locator('button:has-text("RAG:")')
    const text = await ragButton.textContent()
    expect(text).toMatch(/RAG: (ON|OFF)/)
    await electronApp.close()
  })

  test('RAG toggle has status indicator dot', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const ragButton = window.locator('button:has-text("RAG:")')
    const dot = ragButton.locator('span.rounded-full')
    await expect(dot).toBeVisible()
    await electronApp.close()
  })
})

test.describe('Empty State', () => {
  test('shows Knowledge Management heading when no history', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByText('Knowledge Management')).toBeVisible()
    await electronApp.close()
  })

  test('shows suggestion buttons in empty state', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await expect(window.getByText('Summarize key insights across documents').first()).toBeVisible()
    await expect(window.getByText('Find core concepts and definitions').first()).toBeVisible()
    await expect(window.getByText('Compare two related topics').first()).toBeVisible()
    await electronApp.close()
  })

  test('clicking suggestion sets query text', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Summarize key insights across documents').first().click()
    const textarea = window.locator('textarea[placeholder*="Ask anything"]')
    await expect(textarea).toHaveValue('Summarize key insights across documents')
    await electronApp.close()
  })
})

test.describe('Search Execution', () => {
  test('user message appears after search submission', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await input.fill('biomarkers')
    await window.locator('button[title="Send message"]').click({ force: true })
    await expect(window.getByText('biomarkers')).toBeVisible({ timeout: 10000 })
    await electronApp.close()
  })
})

test.describe('Upload Data Button', () => {
  test('upload data button is visible', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const uploadButton = window.locator('button[title="Upload Data (Settings)"]')
    await expect(uploadButton).toBeVisible()
    await electronApp.close()
  })
})
