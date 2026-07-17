import React, { useState, useRef, useEffect, memo, Suspense, lazy } from 'react'
import { Copy, ThumbsUp, ThumbsDown, Check, Eye, X, MessageSquarePlus } from 'lucide-react'
import HoverWikilink from './HoverWikilink'
import DocumentRenderer, { cleanMarkdownComponents, formatMarkdownText, remarkMath, rehypeKatex } from './DocumentRenderer'
import remarkGfm from 'remark-gfm'
import Wrapper from '../code/Wrapper'

const ReactMarkdown = lazy(() => import('react-markdown'))

/**
 * Highlight query keywords inside a plain text string.
 * Returns an array of React elements with matching words in the accent color.
 * When disabled (e.g. result has been clicked/opened), renders plain text.
 */
const HighlightedText = memo(({ text, query, disabled }) => {
  if (disabled || !query || !text) return <>{text}</>

  const words = query
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2)
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))

  if (words.length === 0) return <>{text}</>

  const pattern = new RegExp(`(${words.join('|')})`, 'gi')
  const parts = text.split(pattern)

  return (
    <>
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <span key={i} className="text-[var(--text-accent)] font-semibold">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
})



const UnifiedActionBar = memo(({ item, query, handleSelect, onReply, isActiveReply }) => {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(item.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFeedback = (type) => {
    if (feedback === type) return
    setFeedback(type)
    if (window.api && window.api.db && window.api.db.feedback) {
      window.api.db.feedback({
        chunkId: item.id,
        documentId: item.document_id,
        query,
        rating: type === 'helpful' ? 1 : -1
      }).catch(err => console.error('Feedback error:', err))
    }
  }

  return (
    <div className="flex items-center bg-[var(--bg-panel)]/80 border-0 rounded-[5px] overflow-hidden h-6 shrink-0 select-none">
      {/* Slide-over Preview Drawer Button */}
      <button 
        onClick={(e) => {
          e.stopPropagation()
          if (window.__openCitationPreviewModal) {
            window.__openCitationPreviewModal(item)
          } else {
            handleSelect(item)
          }
        }}
        className="h-full px-2 hover:bg-[var(--bg-active)] text-[var(--text-accent)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0 gap-1"
        title="Open citation preview drawer"
      >
        <Eye size={12} />
        <span className="text-[10px] font-semibold hidden sm:inline">Preview</span>
      </button>

      {/* Copy Button */}
      <button 
        onClick={handleCopy}
        className="h-full px-2 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
        title="Copy section text"
      >
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      </button>

      {/* Like / Helpful Button */}
      <button 
        onClick={() => handleFeedback('helpful')}
        className={`h-full px-2 transition-colors flex items-center justify-center border-0 ${
          feedback === 'helpful' ? 'text-[#a855f7]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
        }`}
        title="Helpful result"
      >
        <ThumbsUp size={12} />
      </button>

      {/* Dislike / Unhelpful Button */}
      <button 
        onClick={() => handleFeedback('unhelpful')}
        className={`h-full px-2 transition-colors flex items-center justify-center border-0 ${
          feedback === 'unhelpful' ? 'text-red-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
        }`}
        title="Not helpful"
      >
        <ThumbsDown size={12} />
      </button>
    </div>
  )
})

const SearchResultCard = memo(({ item, query, handleSelect, onReply, isActiveReply }) => {
  // Ensure similarity is clamped between 0 and 1, handling raw float scores safely
  const rawSim = item.similarity !== undefined && item.similarity !== null ? item.similarity : 0.75
  const simPercent = Math.min(100, Math.max(0, Math.round(rawSim * 100)))
  const [selected, setSelected] = useState(false)
  const [showWikiHover, setShowWikiHover] = useState(false)
  const hoverTimeoutRef = useRef(null)

  const onSelect = (item) => {
    setSelected(true)
    handleSelect(item)
  }

  const handleMouseEnter = () => {
    if (showWikiHover) return
    hoverTimeoutRef.current = setTimeout(() => {
      setShowWikiHover(true)
    }, 150)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }

  useEffect(() => {
    if (!showWikiHover) return
    const handleClickOutside = () => {
      setShowWikiHover(false)
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [showWikiHover])

  // Format created_at as a human-readable relative or short date
  const formatDate = (ts) => {
    if (!ts) return null
    const d = new Date(ts)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return 'just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  const createdLabel = formatDate(item.created_at)

  return (
    <div className="group relative transition-all duration-200 overflow-visible">
      {/* Header: title + match badge + action bar */}
      <div className="flex items-center justify-between gap-4 mb-1.5">
        <div 
          onClick={() => onSelect(item)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="relative flex items-center gap-2 cursor-pointer min-w-0 flex-1 group/title"
        >
          <h4 className="text-[13px] font-semibold text-[var(--text-main)] truncate group-hover/title:text-[var(--text-accent)] transition-colors">
            {item.title}
          </h4>
          <span className="px-1.5 py-0.5 rounded-[5px] text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-active)] border-0 shrink-0">
            {simPercent}%
          </span>

          {/* NotebookLM-Style Wiki Hover Popover */}
          {showWikiHover && (
            <HoverWikilink item={item} setShowWikiHover={setShowWikiHover} onSelect={onSelect} />
          )}
        </div>

        {/* Action Bar */}
        <UnifiedActionBar item={item} query={query} handleSelect={onSelect} onReply={onReply} isActiveReply={isActiveReply} />
      </div>

      {/* Created At timestamp */}
      {createdLabel && (
        <div className="mb-2 text-[10px] text-[var(--text-faint)] tracking-wide">
          {createdLabel}
        </div>
      )}

      {/* Content Chunk Body */}
      <div className="text-[14px] text-[var(--text-main)] leading-relaxed font-normal max-w-full overflow-hidden text-justify">
        <Wrapper maxHeight={300}>
          <Suspense fallback={<div className="text-[var(--text-muted)] text-xs py-2">Rendering chunk...</div>}>
            {(() => {
              const ext = item.title ? item.title.split('.').pop().toLowerCase() : ''
              const isJsonOrCode = ['json', 'py', 'js', 'jsx', 'ts', 'tsx', 'sql', 'html', 'css', 'sh', 'bash', 'java', 'cpp', 'c', 'rust', 'go'].includes(ext) || item.category === 'JSON'

              if (isJsonOrCode) {
                return (
                  <DocumentRenderer
                    content={item.content}
                    category={item.category || ext.toUpperCase()}
                    fileTitle={item.title}
                  />
                )
              }

              // Build highlight-aware markdown component overrides
              const highlightComponents = {
                ...cleanMarkdownComponents,
                p: ({ node, children, ...props }) => (
                  <p className="mb-1.5 last:mb-0 text-justify" {...props}>
                    {typeof children === 'string'
                      ? <HighlightedText text={children} query={query} disabled={selected} />
                      : children}
                  </p>
                ),
                li: ({ node, children, ...props }) => (
                  <li {...props}>
                    {typeof children === 'string'
                      ? <HighlightedText text={children} query={query} disabled={selected} />
                      : children}
                  </li>
                ),
              }

              return (
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={highlightComponents}>
                  {formatMarkdownText(item.content)}
                </ReactMarkdown>
              )
            })()}
          </Suspense>
        </Wrapper>
      </div>

      {/* Reply Button below response */}
      <div className="mt-2 flex justify-start">
        <button 
          type="button"
          onPointerDown={(e) => {
            e.preventDefault() // prevent focus loss just in case
            if (onReply) onReply()
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-200 ${
            isActiveReply 
              ? 'bg-[var(--bg-active)] text-[var(--text-main)]' 
              : 'text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]'
          }`}
        >
          {isActiveReply ? <X size={12} strokeWidth={2.5} /> : <MessageSquarePlus size={12} />}
          {isActiveReply ? 'Close Chat' : 'Reply'}
        </button>
      </div>
    </div>
  )
})

export default SearchResultCard
export { UnifiedActionBar }
