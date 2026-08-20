import React, { useLayoutEffect, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, FileText } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'

const cleanPreviewText = (text) => {
  if (!text || typeof text !== 'string') return ''
  return text
    .replace(/([.,;:!?\)\]])([a-zA-Z0-9])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d{4,})/g, '$1 $2')
    .replace(/  +/g, ' ')
    .trim()
}

// Neighboring chunks carry a ~250-char overlap tail (for retrieval quality), so the
// aggregated result content repeats the same sentences. Drop segments that exactly
// repeat the end of the already-accumulated text.
const dedupeOverlap = (text) => {
  if (!text || typeof text !== 'string') return text
  const out = []
  let acc = ''
  for (const raw of text.split(/\n\s*\n/)) {
    const part = raw.trim()
    if (!part) continue
    if (part.length >= 30 && acc && acc.slice(-part.length) === part) continue
    out.push(part)
    acc += part
  }
  return out.join('\n\n')
}

const getCoords = (anchorRef) => {
  if (anchorRef?.current) {
    const rect = anchorRef.current.getBoundingClientRect()
    let top = rect.bottom + 10
    if (top + 340 > window.innerHeight) top = Math.max(16, rect.top - 340)
    let left = rect.left
    if (left + 420 > window.innerWidth - 16) left = Math.max(16, window.innerWidth - 436)
    return { top, left, ready: true }
  }
  return { top: -9999, left: -9999, ready: false }
}

const HoverWikilink = ({ item, setShowWikiHover, onSelect, anchorRef }) => {
  const [coords, setCoords] = useState(() => getCoords(anchorRef))
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  useLayoutEffect(() => {
    if (anchorRef?.current) setCoords(getCoords(anchorRef))
    const myCloser = () => setShowWikiHover(false)
    if (window.__activeHoverWikilinkClose && window.__activeHoverWikilinkClose !== myCloser) {
      window.__activeHoverWikilinkClose()
    }
    window.__activeHoverWikilinkClose = myCloser
    return () => {
      if (window.__activeHoverWikilinkClose === myCloser) window.__activeHoverWikilinkClose = null
    }
  }, [anchorRef, setShowWikiHover])

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') setShowWikiHover(false) }
    const handleClickOutside = (e) => {
      if (!e.target.closest('#hover-wikilink-container') &&
          (!anchorRef?.current || !anchorRef.current.contains(e.target))) {
        setShowWikiHover(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setShowWikiHover, anchorRef])

  if (!coords.ready && coords.top === -9999) return null

  const isJsonOrCode = ['JSON','CODE','TS','JS','PY','SQL','HTML','CSS','SH','BASH','JAVA','CPP','C','RUST','GO']
    .includes(item.category?.toUpperCase() || '') ||
    (item.title && ['json','py','js','jsx','ts','tsx','sql','html','css','sh','bash','java','cpp','c','rust','go']
      .includes(item.title.split('.').pop().toLowerCase()))

  let displayContent = isJsonOrCode
    ? item.content
    : cleanPreviewText(item.content || 'Preview content not available.')

  // Strip title if it appears at the very start of content (avoids showing it twice)
  if (item.title && typeof displayContent === 'string') {
    const titleClean = item.title.replace(/\.[^/.]+$/, '').trim().toLowerCase()
    const contentStart = displayContent.slice(0, item.title.length + 5).toLowerCase()
    if (contentStart.startsWith(titleClean) || contentStart.startsWith(item.title.toLowerCase())) {
      displayContent = displayContent.slice(item.title.length).replace(/^[\s\-:#]+/, '').trim()
    }
  }

  // Collapse repeated chunk-overlap sentences from the aggregated neighbor context
  if (!isJsonOrCode && typeof displayContent === 'string') {
    displayContent = dedupeOverlap(displayContent)
  }

  if (typeof displayContent === 'string' && displayContent.length > 600) {
    displayContent = displayContent.slice(0, 600) + '...'
  }

  const content = (
    <div
      id="hover-wikilink-container"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        width: '420px',
        maxWidth: '95vw',
        zIndex: 999999,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(-5px) scale(0.97)',
        transition: 'opacity 160ms ease, transform 160ms cubic-bezier(0.16,1,0.3,1)',
        backgroundColor: 'var(--bg-panel, #141822)',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 shrink-0 select-none"
        style={{ height: '32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <FileText size={11} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          <span className="text-[11.5px] font-medium truncate leading-none" style={{ color: 'var(--text-muted)' }}>
            {item.title}
          </span>
          {item.category && (
            <span
              className="shrink-0 text-[9px] font-mono leading-none px-1 py-0.5 rounded-[3px]"
              style={{ color: 'var(--text-faint)', background: 'rgba(255,255,255,0.04)' }}
            >
              {item.category}
            </span>
          )}
        </div>

        {onSelect && (
          <button
            onClick={() => { onSelect(item); setShowWikiHover(false) }}
            className="flex items-center gap-1 ml-2 shrink-0 text-[10px] font-medium border-0 rounded-[4px] px-1.5 py-1 transition-all"
            style={{ color: 'var(--text-faint)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-accent)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-faint)'; e.currentTarget.style.background = 'transparent' }}
            title="Open full source"
          >
            <ExternalLink size={10} />
            <span>Open</span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        <div
          className="overflow-y-auto custom-scrollbar px-3.5 pt-3 pb-5 text-[12.5px] leading-relaxed break-words"
          style={{ maxHeight: '300px', color: 'var(--text-main)' }}
        >
          <DocumentRenderer
            className="text-[12.5px] leading-relaxed max-w-full overflow-visible"
            content={displayContent}
            category={item.category || 'TEXT'}
            fileTitle={item.title}
            maxLength={isJsonOrCode ? 500 : undefined}
          />
        </div>
        {/* Gradient fade-out at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--bg-panel, #141822))' }}
        />
      </div>
    </div>
  )

  return createPortal(content, document.body)
}

export default HoverWikilink
