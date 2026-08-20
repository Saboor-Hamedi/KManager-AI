import React, { useState, useEffect } from 'react'
import { FileText, X } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'
import PulseLoader from '../PulseLoader'

const Preview = ({ selectedPdf, fullText, loadingText, onClose, fileExists }) => {
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
    <div className="w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-150 relative">

        {/* Titlebar — matches HoverWikilink style */}
        <div
          className="flex items-center justify-between shrink-0 select-none pl-3 pr-0"
          style={{ height: '28px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <FileText size={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <span className="text-[11.5px] font-medium truncate leading-none" style={{ color: 'var(--text-muted)' }}>
              {selectedPdf.title}
            </span>
            {selectedPdf.category && (
              <span
                className="shrink-0 text-[9px] font-mono leading-none px-1 py-0.5 rounded-[3px]"
                style={{ color: 'var(--text-faint)', background: 'rgba(255,255,255,0.04)' }}
              >
                {selectedPdf.category}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-6 h-6 rounded-[4px] border-0 shrink-0 transition-colors text-[var(--text-faint)] hover:bg-[#e81123] hover:text-white"
            title="Close (Esc)"
          >
            <X size={12} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden relative select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
          
          {/* Shared Loader Overlay (Visible while loadingText or !isReady is true) */}
          {(loadingText || !isReady) && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm animate-in fade-in duration-300">
              <PulseLoader text="Loading Document" size="md" />
            </div>
          )}

          {/* ── PDF: render directly via file:// ── */}
          {isPdf && fileExists && fileSrc ? (
            <webview
              src={fileSrc}
              plugins="true"
              className="w-full h-full border-none bg-white relative z-0"
            />
          ) : isPdf && !fileExists ? (
            /* ── PDF but file missing: fallback to stored text ── */
            <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar bg-[var(--bg-app)] text-justify select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
              <div className="max-w-3xl mx-auto pb-32">
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  Original file no longer on disk — showing archived text from database.
                </div>
                {!(loadingText || !isReady) && (fullText || selectedPdf.content ? (
                  <DocumentRenderer
                    className={`text-[var(--text-main)] text-[15px] leading-relaxed max-w-full overflow-visible text-justify select-text ${selectedPdf.category === 'TXT' ? 'whitespace-pre-wrap' : ''}`}
                    content={fullText || selectedPdf.content}
                    category={selectedPdf.category}
                    fileTitle={selectedPdf.title}
                  />
                ) : (
                  <div className="text-[var(--text-faint)] text-sm mt-10 text-center">No archived content available.</div>
                ))}
              </div>
            </div>
          ) : (
            /* ── Non-PDF (MD, TXT, JSON, CSV, etc.) ── */
            <div
              className="w-full h-full overflow-y-auto p-6 lg:p-10 custom-scrollbar bg-[var(--bg-app)] text-justify select-text"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            >
              <div className="max-w-3xl mx-auto pb-40">
                {!(loadingText || !isReady) && (fullText || selectedPdf.content ? (
                  <DocumentRenderer
                    className={`text-[var(--text-main)] text-[15px] leading-relaxed max-w-full overflow-visible text-justify select-text ${selectedPdf.category === 'TXT' ? 'whitespace-pre-wrap font-mono text-[13px]' : ''} ${selectedPdf.category === 'JSON' ? 'font-mono text-[13px]' : ''}`}
                    content={fullText || selectedPdf.content}
                    category={selectedPdf.category}
                    fileTitle={selectedPdf.title}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center mt-20 opacity-50">
                    <FileText size={48} className="text-[var(--text-muted)] mb-4" />
                    <div className="text-[var(--text-faint)] text-[13px] font-medium tracking-wide">No content available for this file.</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
    </div>
  )
}

export default Preview
