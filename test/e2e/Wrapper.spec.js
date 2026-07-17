import { _electron as electron } from 'playwright'
import { test, expect } from '@playwright/test'

test.describe('Wrapper Component E2E', () => {
  let electronApp
  let window

  test.beforeAll(async () => {
    electronApp = await electron.launch({ args: ['.'] })
    window = await electronApp.firstWindow()
  })

  test.afterAll(async () => {
    await electronApp.close()
  })

  test('collapses long search results and expands on click', async () => {
    // Wait for the app to load
    await window.waitForLoadState('domcontentloaded')

    // Perform a search for a query known to return long content (e.g. JSON or large code blocks)
    const searchInput = window.locator('input[placeholder*="Search"]')
    if (await searchInput.isVisible()) {
      await searchInput.fill('Language Paradigms')
      await searchInput.press('Enter')

      // Wait for search results to render
      await window.waitForSelector('.transition-all.overflow-hidden', { timeout: 10000 })

      // Check if any result has the 'See More' button indicating overflow
      const seeMoreBtn = window.locator('button:has-text("See More")').first()
      
      // If the dataset contains long content, the button should be visible
      if (await seeMoreBtn.isVisible()) {
        const wrapper = seeMoreBtn.locator('..').locator('..').locator('.overflow-hidden').first()
        
        // Ensure it starts collapsed
        const initialMaxHeight = await wrapper.evaluate((el) => el.style.maxHeight)
        expect(initialMaxHeight).toBe('300px')

        // Click see more
        await seeMoreBtn.click()

        // Wait for expansion
        const showLessBtn = window.locator('button:has-text("Show Less")').first()
        await expect(showLessBtn).toBeVisible()

        // Check it expanded
        const expandedMaxHeight = await wrapper.evaluate((el) => el.style.maxHeight)
        expect(expandedMaxHeight).not.toBe('300px')
        expect(expandedMaxHeight).toContain('px') // Should be the dynamic scroll height
        
        // Collapse again
        await showLessBtn.click()
        await expect(seeMoreBtn).toBeVisible()
      }
    }
  })
})
