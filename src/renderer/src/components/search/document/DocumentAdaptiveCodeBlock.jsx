import React, { useState, useEffect, useRef } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

export const CodeCopyButton = ({ code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded-[4px] flex items-center justify-center transition-colors border-0 ${
        copied 
          ? 'text-emerald-400 bg-emerald-500/10' 
          : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.1]'
      }`}
      title="Copy code"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

export const fastJsonHighlight = (jsonString) => {
  if (typeof jsonString !== 'string') return ''
  // Escape HTML characters safely before highlighting
  const escaped = jsonString
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
  
  return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
    let cls = 'text-[#ce9178]' // string color
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'text-[#9cdcfe]' // key color
      }
    } else if (/true|false/.test(match)) {
      cls = 'text-[#569cd6]' // boolean
    } else if (/null/.test(match)) {
      cls = 'text-[#569cd6]' // null
    } else {
      cls = 'text-[#b5cea8]' // number
    }
    return `<span class="${cls}">${match}</span>`
  })
}

const DocumentAdaptiveCodeBlock = ({ code, language, title, showLineNumbers = false }) => {
  const [expanded, setExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const contentRef = useRef(null)
  const maxHeight = 400

  useEffect(() => {
    if (!contentRef.current) return
    const checkOverflow = () => {
      if (!contentRef.current) return
      const sh = contentRef.current.scrollHeight
      setContentHeight(prev => prev !== sh ? sh : prev)
      setIsOverflowing(sh > maxHeight + 20)
    }
    checkOverflow()
    const ro = new ResizeObserver(() => checkOverflow())
    if (contentRef.current) {
      ro.observe(contentRef.current)
      if (contentRef.current.firstElementChild) ro.observe(contentRef.current.firstElementChild)
    }
    return () => ro.disconnect()
  }, [code])

  return (
    <div className="my-6 rounded-[8px] overflow-hidden bg-[var(--bg-panel)] shadow-sm max-w-full border border-[var(--border-dim)] relative group/code">
      {/* Persistent Small Header - Ultra Subtle */}
      <div className="flex items-center justify-between px-3 py-1 bg-black/[0.08] select-none border-b border-[var(--border-subtle)] h-[24px]">
        <div className="text-[10px] font-bold text-[var(--text-muted)]/50 uppercase tracking-widest pl-1">
          {language || title || 'TEXT'}
        </div>
        <div className="flex items-center opacity-70 hover:opacity-100 transition-opacity h-full gap-3">
          {isOverflowing && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="text-[10px] font-semibold text-[var(--text-accent)] uppercase tracking-wide hover:text-white transition-colors border-0 bg-transparent flex items-center gap-1"
            >
              {expanded ? 'Show Less' : 'Show More'}
            </button>
          )}
          <CodeCopyButton code={code} />
        </div>
      </div>
      
      <div 
        ref={contentRef}
        className="transition-[max-height] duration-500 ease-in-out overflow-hidden relative"
        style={{ 
          maxHeight: expanded ? `${Math.max(contentHeight, maxHeight + 20)}px` : (isOverflowing ? `${maxHeight}px` : 'none') 
        }}
      >
        <div className="overflow-x-auto bg-transparent custom-scrollbar relative">
          {/* Right edge fade indicator for horizontal scroll */}
          <div className="absolute top-0 bottom-0 right-0 w-8 bg-gradient-to-l from-[var(--bg-panel)] to-transparent pointer-events-none" />
          
          {language === 'json' ? (
            <pre 
              className="m-0 bg-transparent text-[var(--text-main)] opacity-90 text-[12.5px] leading-[1.6] px-[1.25rem] py-[1rem] overflow-x-auto font-mono"
              dangerouslySetInnerHTML={{ __html: fastJsonHighlight(code) }}
            />
          ) : (
            <SyntaxHighlighter
              children={code}
              style={vscDarkPlus}
              language={language || 'text'}
              showLineNumbers={showLineNumbers}
              PreTag="div"
              className="custom-scrollbar"
              customStyle={{
                margin: 0,
                background: 'transparent',
                color: 'var(--text-main)',
                fontSize: '13px',
                padding: '1rem 1.25rem',
                overflowX: 'auto',
                lineHeight: '1.6'
              }}
              wrapLines={true}
              wrapLongLines={false}
            />
          )}
        </div>
        {/* Gradient Fade (Only when overflowing and collapsed) */}
        {isOverflowing && !expanded && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--bg-panel)] to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  )
}

export default DocumentAdaptiveCodeBlock
