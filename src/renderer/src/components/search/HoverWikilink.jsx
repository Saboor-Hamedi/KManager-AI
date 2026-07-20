import React, { useLayoutEffect, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, FileText } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'

const cleanPreviewText = (text) => {
  if (!text || typeof text !== 'string') return ''
  return text
    // Fix period, comma, colon, semicolon, question mark, or closing bracket immediately followed by a letter or number (e.g. `licenses.Mdto` -> `licenses. Mdto`)
    .replace(/([.,;:!?\)\]])([a-zA-Z0-9])/g, '$1 $2')
    // Fix lowercase letter immediately followed by uppercase letter (e.g. `Mdto` -> `Md to`, `IntroductionBack` -> `Introduction Back`)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Fix letter followed immediately by 4+ digits (e.g. `Backin2007` -> `Backin 2007`)
    .replace(/([a-zA-Z])(\d{4,})/g, '$1 $2')
    // Fix multiple consecutive spaces
    .replace(/  +/g, ' ')
    .trim()
}

const getInitialCoords = (anchorRef) => {
  if (anchorRef?.current) {
    const rect = anchorRef.current.getBoundingClientRect()
    let top = rect.bottom + 8
    if (top + 380 > window.innerHeight) {
      top = Math.max(20, rect.top - 360)
    }
    let left = rect.left
    if (left + 460 > window.innerWidth - 20) {
      left = Math.max(20, window.innerWidth - 480)
    }
    return { top, left, ready: true }
  }
  return { top: -9999, left: -9999, ready: false }
}

const HoverWikilink = ({ item, setShowWikiHover, onSelect, anchorRef }) => {
  const [coords, setCoords] = useState(() => getInitialCoords(anchorRef))

  useLayoutEffect(() => {
    if (anchorRef?.current) {
      setCoords(getInitialCoords(anchorRef))
    }
    const myCloser = () => setShowWikiHover(false)
    if (window.__activeHoverWikilinkClose && window.__activeHoverWikilinkClose !== myCloser) {
      window.__activeHoverWikilinkClose()
    }
    window.__activeHoverWikilinkClose = myCloser
    return () => {
      if (window.__activeHoverWikilinkClose === myCloser) {
        window.__activeHoverWikilinkClose = null
      }
    }
  }, [anchorRef, setShowWikiHover])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowWikiHover(false)
      }
    }
    const handleClickOutside = (e) => {
      if (
        !e.target.closest('#hover-wikilink-container') &&
        (!anchorRef?.current || !anchorRef.current.contains(e.target))
      ) {
        setShowWikiHover(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setShowWikiHover, anchorRef])

  if (!coords.ready && coords.top === -9999) {
    return null
  }

  const popoverContent = (
    <div 
      id="hover-wikilink-container"
      onClick={(e) => e.stopPropagation()}
      style={{ 
        position: 'fixed',
        top: `${coords.top}px`,
        left: `${coords.left}px`,
        backgroundColor: '#141822', 
        opacity: 1, 
        backdropFilter: 'none' 
      }}
      className="z-[999999] w-[460px] max-w-[95vw] rounded-[5px] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden text-left select-text"
    >
      {/* Compact GlobalTitleBar-Styled Header without blur */}
      <div className="h-[26px] bg-[#0e1117] border-b border-white/[0.08] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5 px-2.5 min-w-0 flex-1 mr-2 h-full">
          <FileText size={13} className="text-[var(--text-accent)] shrink-0" />
          <span className="text-[11px] font-semibold text-[var(--text-main)] truncate tracking-tight">{item.title}</span>
          {item.category && (
            <span className="px-1 py-0.5 rounded-[3px] text-[9.5px] font-mono text-[var(--text-muted)] bg-[var(--bg-active)] shrink-0 leading-none">
              {item.category}
            </span>
          )}
        </div>
        <div className="flex items-center h-full shrink-0">
          <button
            onClick={() => setShowWikiHover(false)}
            className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center border-0"
            title="Close popover"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Solid Body Content */}
      <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-3.5 text-[13px] text-[var(--text-main)] leading-relaxed font-sans break-words bg-[#141822]">
        <DocumentRenderer 
          className="text-[var(--text-main)] text-[13px] leading-relaxed max-w-full overflow-visible" 
          content={cleanPreviewText(item.content || 'Preview content not available.')} 
          category={item.category || 'TEXT'}
          fileTitle={item.title}
        />
      </div>
    </div>
  )

  return createPortal(popoverContent, document.body)
}

export default HoverWikilink
