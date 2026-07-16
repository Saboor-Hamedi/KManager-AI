import React, { useState, useMemo, useEffect } from 'react'
import { X, Check, Palette } from 'lucide-react'
import { useTheme } from './useTheme'

/**
 * ThemeModal Component
 * Beautiful theme selector modal with preview cards
 */
const ThemeModal = ({ isOpen, onClose }) => {
  const { theme, setTheme, allThemes } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleThemeSelect = (themeId) => {
    setTheme(themeId)
  }

  const filteredThemes = useMemo(() => {
    const query = searchQuery.toLowerCase()
    return allThemes.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        (t.description && t.description.toLowerCase().includes(query))
    )
  }, [allThemes, searchQuery])

  if (!isOpen) return null

  return (
    <div className="modal-overlay theme-modal-overlay" onClick={onClose}>
      <div className="modal-container theme-modal-container bg-[var(--bg-app)]" onClick={(e) => e.stopPropagation()}>
        <div className="h-8 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center shrink-0 select-none">
          <div className="flex items-center gap-2 px-3">
            <Palette size={15} className="text-[var(--text-accent)]" />
            <h2 className="text-xs font-semibold text-[var(--text-main)]">Appearance</h2>
          </div>
          <div className="flex-1" />
          <button onClick={onClose} className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center" title="Close (Esc)">
            <X size={16} />
          </button>
        </div>

        <div className="theme-modal-toolbar">
          <div className="theme-search-wrapper">
            <input
              type="text"
              className="theme-search-input"
              placeholder="Filter themes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="theme-modal-stats">Showing {filteredThemes.length} themes</div>
        </div>

        <div className="theme-modal-grid">
          {filteredThemes.map((t) => {
            const isActive = theme === t.id

            return (
              <div
                key={t.id}
                className={`theme-modal-card ${isActive ? 'active' : ''}`}
                onClick={() => handleThemeSelect(t.id)}
              >
                <div className="theme-card-header">
                  <div className="theme-title-row">
                    <span className="theme-modal-name">{t.name}</span>
                    {isActive ? (
                      <span className="theme-check-badge">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    ) : (
                      <span className="theme-badge installed">INSTALLED</span>
                    )}
                  </div>
                </div>

                <div className="theme-modal-preview-wrapper">
                  <div className="theme-modal-preview" style={{ background: t.colors['--bg-app'] }}>
                    <div
                      className="theme-preview-sidebar"
                      style={{
                        background: t.colors['--bg-sidebar'],
                        borderRight: `1px solid ${t.colors['--border-dim']}`
                      }}
                    >
                      <div
                        className="theme-preview-sidebar-item"
                        style={{ background: t.colors['--bg-active'] }}
                      />
                      <div
                        className="theme-preview-sidebar-item"
                        style={{ background: t.colors['--border-subtle'] }}
                      />
                      <div
                        className="theme-preview-sidebar-item"
                        style={{ background: t.colors['--border-subtle'] }}
                      />
                    </div>
                    <div
                      className="theme-preview-editor"
                      style={{ background: t.colors['--bg-editor'] }}
                    >
                      <div
                        className="theme-preview-code-line"
                        style={{ background: t.colors['--text-accent'], width: '60%' }}
                      />
                      <div
                        className="theme-preview-code-line"
                        style={{ background: t.colors['--text-main'], width: '80%' }}
                      />
                      <div
                        className="theme-preview-code-line"
                        style={{ background: t.colors['--text-muted'], width: '40%' }}
                      />
                      <div
                        className="theme-preview-code-line"
                        style={{ background: t.colors['--text-main'], width: '70%' }}
                      />
                      <div
                        className="theme-preview-code-line"
                        style={{ background: t.colors['--icon-secondary'], width: '50%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ThemeModal