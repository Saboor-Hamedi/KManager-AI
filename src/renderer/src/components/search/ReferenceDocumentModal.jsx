import React, { useState, useEffect, useRef } from 'react'
import { FileText, X } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'

const ReferenceDocumentModal = ({ selectedPdf, onClose, fileExists }) => {
  const [isReady, setIsReady] = useState(false)
  const [visible, setVisible] = useState(false)
  const closingRef = useRef(false)

  // Animate in
  useEffect(() => {
    if (selectedPdf) {
      closingRef.current = false
      const raf = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(raf)
    }
  }, [selectedPdf])

  // Animate out then call onClose
  const handleClose = () => {
    if (closingRef.current) return
    closingRef.current = true
    setVisible(false)
    setTimeout(onClose, 180)
  }

  // ESC key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handleKey)
    if (window.api?.system?.registerEscape) window.api.system.registerEscape()
    return () => {
      window.removeEventListener('keydown', handleKey)
      if (window.api?.system?.unregisterEscape) window.api.system.unregisterEscape()
    }
  }, [onClose])

  useEffect(() => {
    if (selectedPdf) {
      setIsReady(false)
      const t = setTimeout(() => setIsReady(true), 60)
      return () => clearTimeout(t)
    }
  }, [selectedPdf])

  if (!selectedPdf) return null

  const isPdf = selectedPdf.category === 'PDF' ||
    (selectedPdf.vault_path || '').toLowerCase().endsWith('.pdf')

  // Strip title from the start of body content to avoid showing it twice
  const stripTitleFromContent = (content, title) => {
    if (!content || !title) return content
    const titleClean = title.replace(/\.[^/.]+$/, '').trim().toLowerCase()
    const contentStart = content.slice(0, title.length + 5).toLowerCase()
    if (contentStart.startsWith(titleClean) || contentStart.startsWith(title.toLowerCase())) {
      return content.slice(title.length).replace(/^[\s\-:#\n]+/, '')
    }
    return content
  }

  const bodyContent = stripTitleFromContent(selectedPdf.content, selectedPdf.title)

  const fileSrc = selectedPdf.vault_path
    ? `file:///${selectedPdf.vault_path.replace(/\\/g, '/')}`
    : null

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        opacity: visible ? 1 : 0,
        transition: 'opacity 180ms ease',
        backgroundColor: visible ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(4px)' : 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '64rem',
          height: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)',
          transition: 'opacity 200ms ease, transform 200ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* Subtle titlebar */}
        <div
          className="flex items-center justify-between shrink-0 select-none px-3"
          style={{ height: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <FileText size={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
            <span
              className="text-[11.5px] font-medium truncate leading-none"
              style={{ color: 'var(--text-muted)' }}
            >
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
            onClick={handleClose}
            className="flex items-center justify-center border-0 rounded-[4px] transition-colors"
            style={{ width: '24px', height: '24px', color: 'var(--text-faint)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#e81123'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-faint)' }}
            title="Close (Esc)"
          >
            <X size={12} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden relative select-text">
          {isPdf && fileExists && fileSrc ? (
            <webview
              src={fileSrc}
              plugins="true"
              className="w-full h-full border-none bg-white"
            />
          ) : (
            <div className="w-full h-full overflow-y-auto p-6 custom-scrollbar text-justify cursor-default"
              style={{ background: 'var(--bg-app)' }}>
              <div className="max-w-3xl mx-auto">
                {!isReady ? (
                  <div className="flex flex-col gap-4 animate-pulse py-6">
                    <div className="h-5 w-1/3 rounded" style={{ background: 'var(--border-subtle)', opacity: 0.7 }} />
                    <div className="h-4 w-full rounded" style={{ background: 'var(--border-subtle)', opacity: 0.5 }} />
                    <div className="h-4 w-5/6 rounded" style={{ background: 'var(--border-subtle)', opacity: 0.4 }} />
                    <div className="h-4 w-2/3 rounded" style={{ background: 'var(--border-subtle)', opacity: 0.3 }} />
                  </div>
                ) : bodyContent ? (
                  <DocumentRenderer
                    content={bodyContent}
                    category={selectedPdf.category}
                    fileTitle={selectedPdf.title}
                    className="text-[13.5px] leading-relaxed max-w-full overflow-visible text-justify"
                    style={{ color: 'var(--text-main)' }}
                  />
                ) : (
                  <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>
                    No content available for this file.
                  </div>
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
