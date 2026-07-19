import React, { useState, useRef, useEffect, memo, Suspense, lazy } from 'react'
import { Copy, ThumbsUp, ThumbsDown, Check, Eye, X, MessageSquarePlus, Edit } from 'lucide-react'
import HoverWikilink from './HoverWikilink'
import DocumentRenderer, { cleanMarkdownComponents, formatMarkdownText, remarkMath, rehypeKatex } from './DocumentRenderer'
import remarkGfm from 'remark-gfm'
import Wrapper from '../code/Wrapper'
import './horizontal.css'

const ReactMarkdown = lazy(() => import('react-markdown'))

/**
 * Highlight query keywords inside a plain text string.
 * Returns an array of React elements with matching words in the accent color.
 * When disabled (e.g. result has been clicked/opened), renders plain text.
 */
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'are', 'was', 'were', 'not', 'but',
  'you', 'can', 'will', 'our', 'your', 'what', 'when', 'where', 'why', 'how', 'all', 'any', 'both',
  'each', 'few', 'more', 'most', 'other', 'some', 'such', 'than', 'too', 'very', 'into', 'onto',
  'upon', 'over', 'under', 'above', 'below', 'after', 'before', 'since', 'while', 'during', 'about',
  'against', 'between', 'has', 'had', 'they', 'them', 'their', 'there', 'here', 'which', 'who', 'whom',
  'whose', 'how', 'its', 'it\'s', 'he\'d', 'she\'d', 'we\'d', 'they\'d', 'would', 'could', 'should',
  'does', 'did', 'done', 'doing', 'being', 'been', 'one', 'two', 'three', 'also', 'just', 'only', 'others'
])

const HighlightedText = memo(({ text, query, disabled }) => {
  if (disabled || !query || !text) return <>{text}</>

  const words = query
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
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



const UnifiedActionBar = memo(({ item, query, handleSelect, onReply, isActiveReply, onEdit }) => {
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
    const score = type === 'helpful' ? 1 : -1
    if (window.api?.db?.submitFeedback) {
      window.api.db.submitFeedback(query || item.content?.slice(0, 80) || 'Search query', score, item.id, item.document_id)
        .catch(err => console.error('Feedback error:', err))
    } else if (window.api?.db?.feedback) {
      window.api.db.feedback({
        chunkId: item.id,
        documentId: item.document_id,
        query,
        rating: score
      }).catch(err => console.error('Feedback error:', err))
    }
  }

  return (
    <div className="flex items-center bg-[var(--bg-panel)]/80 border-0 rounded-[5px] overflow-hidden h-6 shrink-0 select-none">
      {/* Like */}
      <button 
        onClick={() => handleFeedback('helpful')}
        className={`h-full px-2 transition-colors flex items-center justify-center border-0 ${
          feedback === 'helpful' ? 'text-[#a855f7]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
        }`}
        title="Helpful result"
      >
        <ThumbsUp size={12} />
      </button>

      {/* Dislike */}
      <button 
        onClick={() => handleFeedback('unhelpful')}
        className={`h-full px-2 transition-colors flex items-center justify-center border-0 ${
          feedback === 'unhelpful' ? 'text-red-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
        }`}
        title="Not helpful"
      >
        <ThumbsDown size={12} />
      </button>

      {/* Copy */}
      <button 
        onClick={handleCopy}
        className="h-full px-2 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
        title="Copy section text"
      >
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      </button>

      {/* Preview */}
      <button 
        onClick={(e) => {
          e.stopPropagation()
          if (window.__openCitationPreviewModal) {
            window.__openCitationPreviewModal(item)
          } else {
            handleSelect(item)
          }
        }}
        className="h-full px-2 hover:bg-[var(--bg-active)] text-[var(--text-accent)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
        title="Open citation preview drawer"
      >
        <Eye size={12} />
      </button>

      {/* Edit */}
      {onEdit && (
        <button
          onClick={onEdit}
          className="h-full px-2 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
          title="Edit chunk content"
        >
          <Edit size={12} />
        </button>
      )}

      {/* Reply */}
      {onReply && (
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            onReply()
          }}
          className={`h-full px-2 flex items-center justify-center border-0 transition-colors ${
            isActiveReply
              ? 'bg-[var(--bg-active)] text-[var(--text-main)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
          }`}
          title={isActiveReply ? 'Close chat' : 'Reply'}
        >
          {isActiveReply ? <X size={12} strokeWidth={2.5} /> : <MessageSquarePlus size={12} />}
        </button>
      )}
    </div>
  )
})

const SearchResultCard = memo(({ item, query, handleSelect, onReply, isActiveReply, isLast }) => {
  // Ensure similarity is clamped between 0 and 1, handling raw float scores safely
  const rawSim = item.similarity !== undefined && item.similarity !== null ? item.similarity : 0.75
  const simPercent = Math.min(100, Math.max(0, Math.round(rawSim * 100)))
  const [selected, setSelected] = useState(false)
  const [highlightsRemoved, setHighlightsRemoved] = useState(false)
  const [showWikiHover, setShowWikiHover] = useState(false)
  const hoverTimeoutRef = useRef(null)
  const onSelect = (item) => {
    setSelected(true)
    setHighlightsRemoved(true)
    handleSelect(item)
  }

  const handleCardClick = () => {
    if (!highlightsRemoved) {
      setHighlightsRemoved(true)
    }
  }

  const [localContent, setLocalContent] = useState(item.content)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.content)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    setLocalContent(item.content)
    setEditValue(item.content)
  }, [item.content])

  // Auto-resize textarea to prevent height jumping
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [isEditing, editValue])

  const handleSaveEdit = async () => {
    // Add two trailing spaces to every line to force Markdown line breaks (<br>)
    // This perfectly preserves formatting and prevents paragraphs from squishing together
    const formattedValue = editValue.split('\n').map(line => line.trimEnd() + '  ').join('\n')

    if (!formattedValue.trim() || formattedValue === localContent) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      if (window.api && window.api.db && window.api.db.updateChunk) {
        const res = await window.api.db.updateChunk(item.id, formattedValue)
        if (res.success) {
          setLocalContent(formattedValue)
          item.content = formattedValue // prevent reversion on re-render
          setIsEditing(false)
        } else {
          console.error('Failed to update chunk:', res.error)
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
    }
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
    <div onClick={handleCardClick} className="group relative transition-all duration-200 overflow-visible py-4 shadow-none bg-transparent border-0">
      {/* Header: title + match badge + action bar */}
      <div className="flex items-center justify-between gap-4 mb-1.5">
        <div 
          onClick={() => onSelect(item)}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="relative flex items-center gap-2 cursor-pointer min-w-0 flex-1 group/title"
        >
          <h4 className="text-[14px] font-semibold text-[var(--text-main)] break-words whitespace-normal group-hover/title:text-[var(--text-accent)] transition-colors leading-snug">
            {item.title}
          </h4>
          <span className="text-[11px] font-mono text-[var(--text-muted)] shrink-0">
            {simPercent}%
          </span>

          {/* NotebookLM-Style Wiki Hover Popover */}
          {showWikiHover && (
            <HoverWikilink item={item} setShowWikiHover={setShowWikiHover} onSelect={onSelect} />
          )}
        </div>


      </div>

      {/* Created At timestamp */}
      {createdLabel && (
        <div className="mb-2 text-[10px] text-[var(--text-faint)] tracking-wide">
          {createdLabel}
        </div>
      )}

      {/* Content Chunk Body */}
      <div className="text-[14px] text-[var(--text-main)] leading-relaxed font-normal max-w-full overflow-hidden text-justify">
        {isEditing ? (
          <div className="flex flex-col gap-2 mt-2">
            <textarea
              ref={textareaRef}
              className="w-full p-3 text-[13px] font-mono bg-[var(--bg-input,var(--bg-active))] border border-[var(--border-subtle)] rounded-[5px] text-[var(--text-main)] focus:outline-none focus:border-[var(--text-accent)] focus:shadow-[0_0_0_2px_rgba(var(--text-accent-rgb,64,186,250),0.15)] overflow-hidden resize-none leading-relaxed"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              disabled={isSaving}
              style={{ minHeight: '80px' }}
            />
            <div className="flex justify-end gap-1.5 mt-2">
              <button
                onClick={() => {
                  setEditValue(localContent)
                  setIsEditing(false)
                }}
                disabled={isSaving}
                className="px-3 py-1 text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] rounded-[4px] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-3 py-1 text-[11px] font-medium bg-[var(--text-accent)] text-white rounded-[4px] hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Update'}
              </button>
            </div>
          </div>
        ) : (
          <Wrapper maxHeight={300}>
            <Suspense fallback={<div className="text-[var(--text-muted)] text-xs py-2">Rendering chunk...</div>}>
            {(() => {
              const ext = item.title ? item.title.split('.').pop().toLowerCase() : ''
              const isJsonOrCode = ['json', 'py', 'js', 'jsx', 'ts', 'tsx', 'sql', 'html', 'css', 'sh', 'bash', 'java', 'cpp', 'c', 'rust', 'go'].includes(ext) || item.category === 'JSON'

              if (isJsonOrCode) {
                return (
                  <DocumentRenderer
                    content={localContent}
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
                      ? <HighlightedText text={children} query={query} disabled={highlightsRemoved || selected} />
                      : children}
                  </p>
                ),
                li: ({ node, children, ...props }) => (
                  <li className="text-justify pl-1 font-normal break-words" {...props}>
                    {typeof children === 'string'
                      ? <HighlightedText text={children} query={query} disabled={highlightsRemoved || selected} />
                      : children}
                  </li>
                ),
              }

              return (
                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={highlightComponents}>
                  {formatMarkdownText(localContent)}
                </ReactMarkdown>
              )
            })()}
          </Suspense>
        </Wrapper>
        )}
      </div>

      {/* Footer Action Bar */}
      <div className="mt-3 flex items-center justify-start">
        <UnifiedActionBar
          item={{...item, content: localContent}}
          query={query}
          handleSelect={onSelect}
          onReply={onReply}
          isActiveReply={isActiveReply}
          onEdit={() => setIsEditing(prev => !prev)}
        />
      </div>

      {/* Centered tapered horizontal divider with 3 CSS link icons */}
      {!isLast && <div className="horizontal-divider" />}
    </div>
  )
})

export default SearchResultCard
export { UnifiedActionBar }
