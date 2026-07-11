import React, { useState, memo, Suspense, lazy } from 'react'
import { Copy, ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import DocumentRenderer, { cleanMarkdownComponents, formatMarkdownText } from './DocumentRenderer'
import remarkGfm from 'remark-gfm'

const ReactMarkdown = lazy(() => import('react-markdown'))

const UnifiedActionBar = memo(({ item, query, handleSelect }) => {
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
    <div className="flex items-center bg-[var(--bg-panel)]/60 border border-[var(--border-subtle)] rounded-md overflow-hidden h-6 shrink-0 select-none">
      {/* Open Source Button */}
      <button
        onClick={() => handleSelect(item)}
        className="h-full px-2.5 text-[10.5px] font-medium text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors flex items-center border-r border-[var(--border-subtle)]"
      >
        Open Source
      </button>

      {/* Copy Button */}
      <button 
        onClick={handleCopy}
        className="h-full px-2 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-r border-[var(--border-subtle)]"
        title="Copy section text"
      >
        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      </button>

      {/* Like / Helpful Button */}
      <button 
        onClick={() => handleFeedback('helpful')}
        className={`h-full px-2 transition-colors flex items-center justify-center border-r border-[var(--border-subtle)] ${
          feedback === 'helpful' ? 'bg-purple-500/20 text-[#a855f7]' : 'hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
        }`}
        title="Helpful result"
      >
        <ThumbsUp size={12} />
      </button>

      {/* Dislike / Unhelpful Button */}
      <button 
        onClick={() => handleFeedback('unhelpful')}
        className={`h-full px-2 transition-colors flex items-center justify-center ${
          feedback === 'unhelpful' ? 'bg-red-500/20 text-red-500' : 'hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
        }`}
        title="Not helpful"
      >
        <ThumbsDown size={12} />
      </button>
    </div>
  )
})

const SearchResultCard = memo(({ item, query, handleSelect }) => {
  const simPercent = Math.round((item.similarity || 0.75) * 100)

  return (
    <div className="group relative transition-all duration-200 overflow-hidden mb-2">
      {/* Sleek Compact Header without Icon or Boxy Background */}
      <div className="flex items-center justify-between gap-4 mb-2.5">
        <div 
          onClick={() => handleSelect(item)}
          className="flex items-center gap-2 cursor-pointer min-w-0 flex-1 hover:opacity-80 transition-opacity"
        >
          <h4 className="text-[13px] font-semibold text-[var(--text-main)] truncate hover:text-[var(--text-accent)] transition-colors">
            {item.title}
          </h4>
          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-panel)]/60 text-[10px] text-[var(--text-muted)] font-mono tracking-wider uppercase shrink-0">
            {simPercent}% match
          </span>
        </div>

        {/* Unified Action Bar (Same Height & Harmonious Styling) */}
        <UnifiedActionBar item={item} query={query} handleSelect={handleSelect} />
      </div>

      {/* Content Chunk Body */}
      <div className="text-[14px] text-[var(--text-main)] leading-relaxed font-normal max-w-full overflow-hidden">
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

            return (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={cleanMarkdownComponents}>
                {formatMarkdownText(item.content)}
              </ReactMarkdown>
            )
          })()}
        </Suspense>
      </div>

      {/* Centered Horizontal Line: Narrow/Faded on Left & Right, Slightly Thicker in Center */}
      <div className="w-1/2 max-w-sm mx-auto h-[2px] bg-gradient-to-r from-transparent via-[var(--border-main)] to-transparent my-6 group-last:hidden opacity-85" />
    </div>
  )
})

export default SearchResultCard
export { UnifiedActionBar }
