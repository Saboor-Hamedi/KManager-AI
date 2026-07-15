import React, { useState, useEffect, memo } from 'react'
import { Copy, Check, ExternalLink, X } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'

const CitationPreviewModal = memo(({ previewItem, onClose, onOpenFullFile, query }) => {
  const [copied, setCopied] = useState(false)
  const [fullContextText, setFullContextText] = useState('')
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  const [showFullContext, setShowFullContext] = useState(false)

  // ESC handler for slide-over drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (previewItem) {
          e.preventDefault()
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [previewItem, onClose])

  // Reset or load surrounding full document text when a chunk is opened
  useEffect(() => {
    if (!previewItem) {
      setFullContextText('')
      setShowFullContext(false)
      return
    }

    if (previewItem.document_id && window.api?.db?.query) {
      setIsLoadingContext(true)
      window.api.db.query('SELECT content FROM documents WHERE id = $1', [previewItem.document_id])
        .then(res => {
          if (res && res[0] && res[0].content) {
            setFullContextText(res[0].content)
          } else {
            setFullContextText('')
          }
        })
        .catch(() => setFullContextText(''))
        .finally(() => setIsLoadingContext(false))
    } else {
      setFullContextText('')
    }
  }, [previewItem])

  if (!previewItem) return null

  const handleCopy = () => {
    const textToCopy = showFullContext && fullContextText ? fullContextText : previewItem.content
    navigator.clipboard.writeText(textToCopy || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rawSim = previewItem.similarity !== undefined && previewItem.similarity !== null ? previewItem.similarity : null
  const simPercent = rawSim !== null ? Math.min(100, Math.max(0, Math.round(rawSim * 100))) : null

  return (
    <div className="fixed top-9 bottom-0 left-0 right-0 z-40 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div
        className="fixed top-9 bottom-0 left-0 right-0 bg-black/50 backdrop-blur-[1px] transition-opacity duration-300 animate-in fade-in pointer-events-auto"
        onClick={onClose}
      />

      {/* Slide-Over Drawer Panel without left border or any white border */}
      <div className="relative w-full max-w-xl h-full bg-[var(--bg-card)] border-0 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 select-none pointer-events-auto">
        
        {/* Sleek Header Bar without border-b */}
        <div className="h-9 px-4 border-0 bg-[var(--bg-panel)] flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2 min-w-0 flex-1 mr-3">
            <span className="text-xs font-semibold text-[var(--text-main)] truncate">
              {previewItem.title || 'Preview'}
            </span>
            {previewItem.category && (
              <span className="px-1.5 py-0.5 rounded-[5px] text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-active)] border-0 shrink-0">
                {previewItem.category}
              </span>
            )}
            {simPercent !== null && (
              <span className="px-1.5 py-0.5 rounded-[5px] text-[10px] font-mono text-[var(--text-accent)] bg-[var(--text-accent)]/15 font-semibold shrink-0">
                {simPercent}% match
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {fullContextText && (
              <button
                onClick={() => setShowFullContext(!showFullContext)}
                className={`px-2 py-1 rounded-[5px] text-[10.5px] font-medium transition-all border-0 ${
                  showFullContext
                    ? 'bg-[var(--bg-active)] text-[var(--text-main)] font-semibold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]/50'
                }`}
              >
                {showFullContext ? 'Showing Full Context' : 'Show Full Document'}
              </button>
            )}

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-[5px] bg-[var(--bg-active)]/70 hover:bg-[var(--bg-active)] text-[var(--text-main)] border-0 text-[10.5px] font-medium transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {onOpenFullFile && previewItem.vault_path && (
              <button
                onClick={() => {
                  onClose()
                  onOpenFullFile(previewItem)
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-[5px] bg-[var(--bg-active)]/70 hover:bg-[var(--bg-active)] text-[var(--text-main)] hover:text-[var(--text-accent)] border-0 text-[10.5px] font-medium transition-colors"
              >
                <ExternalLink size={12} />
                <span>Open Full</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-6 h-6 rounded-[5px] hover:bg-red-500/20 hover:text-red-400 text-[var(--text-muted)] transition-colors flex items-center justify-center shrink-0 border-0 ml-1"
              title="Close Drawer (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body Content without divider borders */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-[var(--bg-app)] text-[var(--text-main)] select-text">
          {isLoadingContext && showFullContext ? (
            <div className="flex items-center justify-center py-12 text-xs text-[var(--text-muted)] animate-pulse">
              Loading complete document context...
            </div>
          ) : showFullContext && fullContextText ? (
            <div className="flex flex-col gap-3">
              <div className="text-[11px] font-semibold text-[var(--text-accent)] pb-1 border-0 flex items-center justify-between select-none">
                <span>Complete Document Context</span>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{fullContextText.length.toLocaleString()} chars</span>
              </div>
              <div className="text-[14px] leading-relaxed text-justify">
                <DocumentRenderer
                  content={fullContextText}
                  category={previewItem.category || 'TEXT'}
                  fileTitle={previewItem.title}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="text-[11px] font-semibold text-[var(--text-muted)] pb-1 border-0 flex items-center justify-between select-none">
                <span>Retrieved Excerpt</span>
                {previewItem.created_at && (
                  <span className="font-normal text-[10px] text-[var(--text-faint)]">
                    Indexed {new Date(previewItem.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="text-[14px] leading-relaxed text-justify">
                <DocumentRenderer
                  content={previewItem.content || 'No content preview available.'}
                  category={previewItem.category || 'TEXT'}
                  fileTitle={previewItem.title}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
})

export default CitationPreviewModal
