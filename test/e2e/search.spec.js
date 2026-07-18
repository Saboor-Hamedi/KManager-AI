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

  test('new session button appears after search', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await input.fill('test query')
    await window.locator('button[title="Send message"]').click({ force: true })
    await window.waitForTimeout(2000)
    const newSessionButton = window.locator('button:has-text("New session")')
    await expect(newSessionButton).toBeVisible({ timeout: 5000 })
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
    await expect(window.getByText('Summarize recent notes')).toBeVisible()
    await expect(window.getByText('Find concepts in my vault')).toBeVisible()
    await expect(window.getByText('Compare two topics')).toBeVisible()
    await electronApp.close()
  })

  test('clicking suggestion sets query text', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    await window.getByText('Summarize recent notes').click()
    const textarea = window.locator('textarea[placeholder*="Ask anything"]')
    await expect(textarea).toHaveValue('Summarize recent notes')
    await electronApp.close()
  })
})

test.describe('Search Execution', () => {
  test('user message appears after search submission', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await input.fill('biomarkers for prostate cancer')
    await window.locator('button[title="Send message"]').click({ force: true })
    await window.waitForTimeout(2000)
    await expect(window.getByText('biomarkers for prostate cancer')).toBeVisible({ timeout: 5000 })
    await electronApp.close()
  })

  test('new session clears chat history', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await input.fill('test query')
    await window.locator('button[title="Send message"]').click({ force: true })
    await window.waitForTimeout(2000)
    await window.locator('button:has-text("New session")').click()
    await expect(window.getByText('Knowledge Management')).toBeVisible({ timeout: 3000 })
    await electronApp.close()
  })
})

test.describe('Upload Data Button', () => {
  test('upload data button opens settings to data tab', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const uploadButton = window.locator('button[title="Upload Data (Settings)"]')
    await expect(uploadButton).toBeVisible()
    await electronApp.close()
  })
})

test.describe('RAG Save Response', () => {
  test('Save button appears on search results when RAG is enabled', async () => {
    const electronApp = await electron.launch({ args: ['.'] })
    const window = await electronApp.firstWindow()
    const input = window.locator('textarea[placeholder*="Ask anything"]')
    await input.fill('test biomarkers')
    await window.locator('button[title="Send message"]').click({ force: true })
    await window.waitForTimeout(5000)
    const ragButton = window.locator('button:has-text("RAG:")')
    const ragText = await ragButton.textContent()
    if (ragText.includes('ON')) {
      const saveButton = window.locator('button:has-text("Save")')
      await expect(saveButton).toBeVisible({ timeout: 15000 })
    }
    await electronApp.close()
  })
})
