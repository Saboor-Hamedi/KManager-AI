import React, { useState, useEffect } from 'react'
import DocumentRenderer from './DocumentRenderer'

const ReferenceDocumentModal = ({
  selectedPdf,
  onClose,
  fileExists,
  viewMode,
  setViewMode,
  loadingText,
  fullText,
  pdfPort
}) => {
  const [isReadyToRender, setIsReadyToRender] = useState(false)

  useEffect(() => {
    if (selectedPdf) {
      setIsReadyToRender(false)
      const timer = setTimeout(() => setIsReadyToRender(true), 50)
      return () => clearTimeout(timer)
    }
  }, [selectedPdf, fullText])

  if (!selectedPdf) return null

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[5px] w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Native OS Window-Style Title Bar */}
        <div className="h-9 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 pl-3 pr-0 select-none">
          <div className="min-w-0 flex-1 mr-4 flex items-center gap-3">
            <span className="text-xs font-normal text-[var(--text-main)] truncate block">{selectedPdf.title}</span>
            {!fileExists ? (
              <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                Archived in DB (Disk file removed)
              </span>
            ) : (
              selectedPdf.category === 'PDF' && (
                <div className="flex items-center bg-[var(--bg-app)] rounded p-0.5 border border-[var(--border-subtle)]">
                  <button
                    onClick={() => setViewMode('pdf')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      viewMode === 'pdf' ? 'bg-[var(--text-accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    PDF Viewer
                  </button>
                  <button
                    onClick={() => setViewMode('text')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                      viewMode === 'text' ? 'bg-[var(--text-accent)] text-white' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    Extracted Text
                  </button>
                </div>
              )
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

        {/* Modal Body */}
        <div className="flex-1 overflow-hidden relative bg-[var(--bg-app)]">
          {selectedPdf.category === 'PDF' && viewMode === 'pdf' && fileExists ? (
            pdfPort ? (
              <webview 
                ref={(el) => {
                  if (el && !el._escAttached) {
                    el._escAttached = true
                    el.addEventListener('before-input-event', (e) => {
                      if (e.key === 'Escape') {
                        onClose()
                      }
                    })
                  }
                }}
                src={`file:///${selectedPdf.vault_path.replace(/\\/g, '/')}#search=${encodeURIComponent(selectedPdf.content.substring(0, 30))}&toolbar=0&navpanes=0`} 
                plugins="true"
                className="w-full h-full border-none bg-white"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-xs">Loading PDF Viewer...</div>
            )
          ) : (
            <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar">
              {loadingText || !isReadyToRender ? (
                <div className="flex flex-col gap-4 max-w-3xl mx-auto py-6 animate-pulse">
                  <div className="h-6 w-1/3 rounded bg-[var(--border-subtle)]/70 mb-2" />
                  <div className="h-4 w-full rounded bg-[var(--border-subtle)]/50" />
                  <div className="h-4 w-5/6 rounded bg-[var(--border-subtle)]/40" />
                  <div className="h-4 w-2/3 rounded bg-[var(--border-subtle)]/30" />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  <DocumentRenderer
                    content={fullText}
                    category={selectedPdf.category}
                    fileTitle={selectedPdf.title}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReferenceDocumentModal
