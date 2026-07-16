import React, { useState, useEffect } from 'react'
import DocumentRenderer from './DocumentRenderer'

const Preview = ({ selectedPdf, onClose, fileExists }) => {
  const [isReady, setIsReady] = useState(false)

  // Global ESC handler — works even when <webview> has stolen focus
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    
    // Register global OS-level Escape catcher for PDF plugin
    if (window.api?.system?.registerEscape) {
      window.api.system.registerEscape()
    }

    return () => {
      window.removeEventListener('keydown', handleKey)
      if (window.api?.system?.unregisterEscape) {
        window.api.system.unregisterEscape()
      }
    }
  }, [onClose])

  useEffect(() => {
    if (selectedPdf) {
      setIsReady(false)
      const t = setTimeout(() => setIsReady(true), 50)
      return () => clearTimeout(t)
    }
  }, [selectedPdf])

  if (!selectedPdf) return null

  const isPdf = selectedPdf.category === 'PDF' ||
    (selectedPdf.vault_path || '').toLowerCase().endsWith('.pdf')

  const fileSrc = selectedPdf.vault_path
    ? `file:///${selectedPdf.vault_path.replace(/\\/g, '/')}`
    : null

  return (
    <div className="bg-[var(--bg-card)] w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-150 relative">

        {/* Title Bar */}
        <div className="h-9 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 pl-3 pr-0 select-none">
          <div className="min-w-0 flex-1 mr-4 flex items-center gap-3">
            <span className="text-xs font-normal text-[var(--text-main)] truncate">{selectedPdf.title}</span>
            {!fileExists && (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                Archived (disk file removed)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-full px-4 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center text-sm shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden relative">
          {/* ── PDF: render directly via file:// ── */}
          {isPdf && fileExists && fileSrc ? (
            <webview
              src={fileSrc}
              plugins="true"
              className="w-full h-full border-none bg-white"
            />
          ) : isPdf && !fileExists ? (
            /* ── PDF but file missing: fallback to stored text ── */
            <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar bg-[var(--bg-app)]">
              <div className="max-w-3xl mx-auto">
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  Original file no longer on disk — showing archived text from database.
                </div>
                {isReady && selectedPdf.content ? (
                  <DocumentRenderer
                    content={selectedPdf.content}
                    category={selectedPdf.category}
                    fileTitle={selectedPdf.title}
                  />
                ) : (
                  <div className="text-[var(--text-faint)] text-sm">No archived content available.</div>
                )}
              </div>
            </div>
          ) : (
            /* ── Non-PDF (MD, TXT, JSON, CSV, etc.) ── */
            <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar bg-[var(--bg-app)]">
              <div className="max-w-3xl mx-auto">
                {!isReady ? (
                  <div className="flex flex-col gap-4 animate-pulse py-6">
                    <div className="h-5 w-1/3 rounded bg-[var(--border-subtle)]/70" />
                    <div className="h-4 w-full rounded bg-[var(--border-subtle)]/50" />
                    <div className="h-4 w-5/6 rounded bg-[var(--border-subtle)]/40" />
                    <div className="h-4 w-2/3 rounded bg-[var(--border-subtle)]/30" />
                  </div>
                ) : selectedPdf.content ? (
                  <DocumentRenderer
                    content={selectedPdf.content}
                    category={selectedPdf.category}
                    fileTitle={selectedPdf.title}
                  />
                ) : (
                  <div className="text-[var(--text-faint)] text-sm">No content available for this file.</div>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

export default Preview
