import React, { useState, useEffect } from 'react'
import { FileText, X } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'

const ReferenceDocumentModal = ({ selectedPdf, onClose, fileExists }) => {
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
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--bg-app)] rounded-[5px] shadow-[var(--shadow-modal)] w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">

        {/* Compact GlobalTitleBar-Styled Header identical to HoverWikilink */}
        <div className="h-[26px] bg-[#0e1117] border-b border-white/[0.08] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-1.5 px-2.5 min-w-0 flex-1 mr-2 h-full">
            <FileText size={13} className="text-[var(--text-accent)] shrink-0" />
            <span className="text-[11px] font-semibold text-[var(--text-main)] truncate tracking-tight">{selectedPdf.title}</span>
            {selectedPdf.category && (
              <span className="px-1 py-0.5 rounded-[3px] text-[9.5px] font-mono text-[var(--text-muted)] bg-[var(--bg-active)] shrink-0 leading-none">
                {selectedPdf.category}
              </span>
            )}
            {!fileExists && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9.5px] font-bold shrink-0 leading-none">
                Archived (disk file removed)
              </span>
            )}
          </div>
          <div className="flex items-center h-full shrink-0">
            <button
              onClick={onClose}
              className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center border-0"
              title="Close (Esc)"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden relative select-text">
          {/* ── PDF: render directly via file:// ── */}
          {isPdf && fileExists && fileSrc ? (
            <webview
              src={fileSrc}
              plugins="true"
              className="w-full h-full border-none bg-white"
            />
          ) : isPdf && !fileExists ? (
            /* ── PDF but file missing: fallback to stored text ── */
            <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar bg-[var(--bg-app)] text-justify cursor-default">
              <div className="max-w-3xl mx-auto">
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-medium">
                  Original file no longer on disk — showing archived text from database.
                </div>
                {isReady && selectedPdf.content ? (
                  <DocumentRenderer
                    content={selectedPdf.content}
                    category={selectedPdf.category}
                    fileTitle={selectedPdf.title}
                    className="text-[13.5px] text-[var(--text-main)] leading-relaxed max-w-full overflow-visible text-justify"
                  />
                ) : (
                  <div className="text-[var(--text-faint)] text-[11px]">No archived content available.</div>
                )}
              </div>
            </div>
          ) : (
            /* ── Non-PDF (MD, TXT, JSON, CSV, etc.) ── */
            <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar bg-[var(--bg-app)] text-justify cursor-default">
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
                    className="text-[13.5px] text-[var(--text-main)] leading-relaxed max-w-full overflow-visible text-justify"
                  />
                ) : (
                  <div className="text-[var(--text-faint)] text-[11px]">No content available for this file.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReferenceDocumentModal
