import { describe, it, expect } from 'vitest'
import { getTheme, getThemeIds, THEMES } from '../../../../../src/renderer/src/components/theme/themeDefinitions'

describe('themeDefinitions', () => {
  it('exports THEMES object with multiple themes', () => {
    expect(Object.keys(THEMES).length).toBeGreaterThan(10)
  })

  it('each theme has required properties', () => {
    Object.values(THEMES).forEach(theme => {
      expect(theme).toHaveProperty('id')
      expect(theme).toHaveProperty('name')
      expect(theme).toHaveProperty('description')
      expect(theme).toHaveProperty('colors')
      expect(theme.colors).toHaveProperty('--bg-app')
      expect(theme.colors).toHaveProperty('--text-main')
      expect(theme.colors).toHaveProperty('--text-accent')
      expect(theme.colors).toHaveProperty('--border-dim')
    })
  })

  it('getTheme returns correct theme', () => {
    expect(getTheme('dark').name).toBe('Dark')
    expect(getTheme('nord').name).toBe('Nord')
  })

  it('getTheme falls back to dark for unknown theme', () => {
    expect(getTheme('nonexistent').id).toBe('dark')
  })

  it('getThemeIds returns all theme IDs', () => {
    const ids = getThemeIds()
    expect(ids).toContain('dark')
    expect(ids).toContain('dracula')
    expect(ids).toContain('nord')
  })
})
