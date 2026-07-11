import React, { useState, useEffect, useRef, useCallback, memo, Suspense, lazy } from 'react'
import { Search, FileText, Send, Copy, ThumbsUp, ThumbsDown, Check } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '../../lib/utils'

const ReactMarkdown = lazy(() => import('react-markdown'))

const markdownComponents = {
  h1: ({node, ...props}) => <h1 className="text-base font-bold text-gray-200 mt-4 mb-2" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-sm font-bold text-gray-200 mt-3 mb-1.5 border-b border-[#2a2a2a] pb-1" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-xs font-semibold text-gray-300 mt-2.5 mb-1 uppercase tracking-wide" {...props} />,
  h4: ({node, ...props}) => <h4 className="text-xs font-semibold text-gray-300 mt-2 mb-1" {...props} />,
  p: ({node, ...props}) => <div className="mb-4 leading-relaxed font-normal text-gray-300 text-[14px]" {...props} />,
  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1.5 marker:text-[#a855f7] font-normal text-gray-300 text-[14px]" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 marker:text-[#a855f7] font-normal text-gray-300 text-[14px]" {...props} />,
  li: ({node, ...props}) => <li className="pl-1 font-normal" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold text-gray-100" {...props} />,
  code: ({node, inline, className, children, ...props}) => {
    let match = /language-(\w+)/.exec(className || '')
    let lang = match ? match[1] : null
    let codeString = String(children).replace(/\n$/, '')

    if (!lang) {
      const fallback = /^(python|sql|javascript|js|jsx|ts|tsx|json|bash|sh|html|css)\b\s*(.*)/is.exec(codeString)
      if (fallback) {
        lang = fallback[1]
        codeString = fallback[2]
      }
    }

    const isBlock = !inline || Boolean(lang) || codeString.includes('\n')

    if (isBlock) {
      if (lang === 'python' || !lang) {
        codeString = codeString
          .replace(/\s+(import\s+\w)/g, '\n$1')
          .replace(/\s+(from\s+\w+\s+import)/g, '\n$1')
          .replace(/\s+(def\s+\w+\()/g, '\n$1')
          .replace(/\s+(class\s+\w+)/g, '\n$1')
          .replace(/\s+(#\s+[^#\n]+?)\s+(?=[a-zA-Z_]\w*\s*[=.\(\[])/g, '$1\n')
          .replace(/\s+([a-zA-Z_]\w*\s*=)/g, '\n$1')
          .replace(/\]\s+(plt\.)/g, ']\n$1')
          .replace(/\)\s+(plt\.)/g, ')\n$1')
          .replace(/\)\s+(fig\.)/g, ')\n$1')
          .replace(/\)\s+(ax\.)/g, ')\n$1')
      } else if (lang === 'sql') {
        codeString = codeString
          .replace(/\s+(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|LEFT JOIN|RIGHT JOIN|GROUP BY|ORDER BY|LIMIT)\b/gi, '\n$1')
      }
    }

    return isBlock ? (
      <div className="my-5 rounded-xl overflow-hidden border border-[#2e2e2e] shadow-lg shadow-black/20">
        <div className="bg-[#1c1c1c] px-4 py-1.5 border-b border-[#2e2e2e] flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
          {lang || 'CODE'}
        </div>
        <SyntaxHighlighter
          {...props}
          children={codeString.trim()}
          style={vscDarkPlus}
          language={lang || 'text'}
          PreTag="div"
          customStyle={{ margin: 0, background: '#141414', fontSize: '13px', padding: '1.25rem', overflowX: 'auto' }}
          wrapLines={true}
          wrapLongLines={true}
        />
      </div>
    ) : (
      <code className="bg-[#2a2a2a] px-1.5 py-0.5 rounded text-[13px] text-[#a855f7] font-mono break-words whitespace-pre-wrap" {...props}>{children}</code>
    )
  },
  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-[#a855f7] bg-[#a855f7]/5 rounded-r-lg p-4 pl-5 text-gray-400 italic my-6" {...props} />,
  a: ({node, ...props}) => <a className="text-[#a855f7] hover:underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />,
  hr: ({node, ...props}) => <hr className="border-[#333] my-8" {...props} />,
  table: ({node, ...props}) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-[#2e2e2e]">
      <table className="w-full text-left border-collapse text-[13px] text-gray-300" {...props} />
    </div>
  ),
  thead: ({node, ...props}) => <thead className="bg-[#1c1c1c] border-b border-[#2e2e2e] font-bold text-gray-200" {...props} />,
  tbody: ({node, ...props}) => <tbody className="divide-y divide-[#2a2a2a]" {...props} />,
  tr: ({node, ...props}) => <tr className="hover:bg-[#1f1f1f]/60 transition-colors" {...props} />,
  th: ({node, ...props}) => <th className="px-4 py-2.5 font-semibold text-gray-200 uppercase tracking-wider text-[11px]" {...props} />,
  td: ({node, ...props}) => <td className="px-4 py-2.5" {...props} />,
  em: ({node, ...props}) => <em className="italic text-purple-300 font-normal" {...props} />,
}

const ChunkActionBar = memo(({ item, query }) => {
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
    const score = type === 'like' ? 1 : -1
    if (window.electron && window.electron.ipcRenderer) {
      // Direct invoke if window.api doesn't have the updated signature yet, 
      // but we will update preload so window.api.db.submitFeedback works too.
      window.api.db.submitFeedback(query, score, item.id, item.document_id)
    }
  }

  return (
    <div className="flex items-center gap-2 mt-4 text-gray-500">
      <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-[#2f2f2f] transition-colors" title="Copy text">
        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      </button>
      <button onClick={() => handleFeedback('like')} className={`p-1.5 rounded-md hover:bg-[#2f2f2f] transition-colors ${feedback === 'like' ? 'text-green-500 bg-[#2f2f2f]' : ''}`} title="Good result">
        <ThumbsUp size={14} className={feedback === 'like' ? "fill-current" : ""} />
      </button>
      <button onClick={() => handleFeedback('dislike')} className={`p-1.5 rounded-md hover:bg-[#2f2f2f] transition-colors ${feedback === 'dislike' ? 'text-red-500 bg-[#2f2f2f]' : ''}`} title="Bad result">
        <ThumbsDown size={14} className={feedback === 'dislike' ? "fill-current" : ""} />
      </button>
    </div>
  )
})

const formatMarkdownContent = (text) => {
  if (!text) return ""
  let formatted = text

  // 1. Ensure any opening or closing ``` code fences start on a new line when preceded by text
  formatted = formatted.replace(/([^\n`]+?)\s*```([a-zA-Z0-9_-]*)/g, '$1\n\n```$2')
  
  // 2. Ensure code or text immediately following ```lang on the same line is moved to the next line
  formatted = formatted.replace(/^(\s*```[a-zA-Z0-9_-]*)[ \t]+(\S.*)$/gm, '$1\n$2')

  // 3. Balance unclosed fenced code blocks if odd number of ``` fences
  const fenceCount = (formatted.match(/^\s*```/gm) || []).length
  if (fenceCount % 2 !== 0) {
    formatted += '\n```\n'
  }

  // 4. Process line-by-line so we don't convert # comments inside code blocks into Markdown headers
  const lines = formatted.split('\n')
  let inCodeBlock = false
  const processedLines = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^\s*```/.test(line)) {
      inCodeBlock = !inCodeBlock
      processedLines.push(line)
      continue
    }

    if (inCodeBlock) {
      processedLines.push(line)
    } else {
      let l = line
      l = l.replace(/(?<!^)\s+(#{1,6})\s+([A-Z0-9_.a-z])/g, '\n\n$1 $2')
      l = l.replace(/(---\s*)(#{1,6}\s+)/g, '$1\n\n$2')
      l = l.replace(/(#{1,6}\s+[^#\n]{2,60}?)\s+(Links:|Tags:|Summary:|Author:|Date:)/gi, '$1\n\n$2')
      processedLines.push(l)
    }
  }

  return processedLines.join('\n')
}

const ChatChunk = memo(({ item, query, handleSelect }) => {
  const [expanded, setExpanded] = useState(false)
  const Icon = item.icon
  const isLong = item.content.length > 250
  
  let content = formatMarkdownContent(item.content || "")
  content = content.charAt(0).toUpperCase() + content.slice(1)
  
  return (
    <div className="flex flex-col mb-8 pb-6 border-b border-[#2a2a2a] last:border-0 last:pb-0">
      {/* Title Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => handleSelect(item)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-[13px] font-semibold text-gray-200 transition-colors border border-[#444] shadow-sm"
        >
          <Icon size={14} className="text-[#a855f7]" />
          <span className="truncate max-w-[250px]">{item.title}</span>
        </button>
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold bg-[#1e1e1e] px-2 py-1 rounded border border-[#333]">
          {Math.round(item.similarity * 100)}% Match
        </span>
      </div>

      {/* Markdown Content with CSS Truncation */}
      <div className="relative">
        <div className={cn(
          "text-[15px] leading-relaxed text-gray-300 font-normal",
          !expanded && isLong && "max-h-[180px] overflow-hidden"
        )}>
          <Suspense fallback={<div className="animate-pulse text-gray-500">Loading formatting...</div>}>
            <ReactMarkdown components={markdownComponents}>
              {content}
            </ReactMarkdown>
          </Suspense>
        </div>
        
        {/* Fade Out Gradient */}
        {!expanded && isLong && (
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--bg-app)] to-transparent pointer-events-none" />
        )}
      </div>

      {isLong && (
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-[13px] font-bold text-[#a855f7] mt-3 hover:underline focus:outline-none self-start"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      {/* Action Bar */}
      <ChunkActionBar item={item} query={query} />
    </div>
  )
})

const DashboardSearch = ({ focusTrigger, onResultSelect }) => {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([]) // Array of { id, query, results, isLoading }
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [pdfPort, setPdfPort] = useState(null)
  const [fullText, setFullText] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const [fileExists, setFileExists] = useState(true)
  const [viewMode, setViewMode] = useState('text') // 'pdf' | 'text'
  
  const inputRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    window.api.db.query('SELECT 1').then(() => {}).catch(() => {}) // Wake up
    if (window.electron && window.electron.ipcRenderer) {
      // Fetch pdf port from main process
      window.electron.ipcRenderer.invoke('get-pdf-port').then(port => setPdfPort(port))
    }
  }, [focusTrigger])

  // Scroll to bottom whenever history changes
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history, selectedPdf])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (selectedPdf) {
          e.preventDefault()
          setSelectedPdf(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [selectedPdf])

  useEffect(() => {
    if (!selectedPdf) {
      setFullText('')
      return
    }
    setLoadingText(true)

    // 1. Check if original file still exists on disk
    if (window.api.system && window.api.system.fileExists) {
      window.api.system.fileExists(selectedPdf.vault_path).then(exists => {
        setFileExists(exists)
        setViewMode(exists && selectedPdf.category === 'PDF' ? 'pdf' : 'text')
      })
    } else {
      setFileExists(true)
      setViewMode(selectedPdf.category === 'PDF' ? 'pdf' : 'text')
    }

    // 2. Always fetch full text from PostgreSQL database as permanent archive
    window.api.db.query('SELECT content FROM documents WHERE id = $1', [selectedPdf.document_id])
      .then(res => {
        if (res.rows && res.rows.length > 0) {
          setFullText(res.rows[0].content)
        } else {
          setFullText('Archived content not found.')
        }
      })
      .catch(err => setFullText('Error loading content: ' + err.message))
      .finally(() => setLoadingText(false))
  }, [selectedPdf])

  const debounceTimeoutRef = useRef(null)
  const isSearchingRef = useRef(false)

  const submitSearch = async () => {
    if (!query || query.trim() === '' || isSearchingRef.current) return

    // Debounce guard: prevent duplicate submissions fired within 300ms
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    isSearchingRef.current = true

    // Clear selected PDF when doing a new search
    if (selectedPdf) setSelectedPdf(null)

    const searchQuery = query.trim()
    const messageId = Date.now().toString()
    
    setQuery('') // clear input immediately
    
    // Add pending message to history
    setHistory(prev => {
      const newHistory = [...prev, { id: messageId, query: searchQuery, results: null, isLoading: true }]
      if (newHistory.length > 30) {
        return newHistory.slice(newHistory.length - 30)
      }
      return newHistory
    })

    try {
      const res = await window.api.db.search(searchQuery, 15)
      
      if (res && res.success) {
        const mapped = res.rows.map(row => ({
          id: row.id,
          document_id: row.document_id,
          category: row.file_type ? row.file_type.toUpperCase() : 'DOCUMENT',
          title: row.file_name,
          content: row.content,
          icon: FileText,
          similarity: row.similarity,
          vault_path: row.vault_path
        }))
        setHistory(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, results: mapped, isLoading: false, error: mapped.length === 0 ? 'No results found in the database.' : null } : msg
        ))
      } else {
        setHistory(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, results: [], isLoading: false, error: res.message || 'Unknown search error' } : msg
        ))
      }
    } catch (err) {
      console.error('Search error:', err)
      setHistory(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, results: [], isLoading: false, error: err.message } : msg
      ))
    } finally {
      debounceTimeoutRef.current = setTimeout(() => {
        isSearchingRef.current = false
      }, 300)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitSearch()
    }
  }

  const handleSelect = useCallback((item) => {
    if (item.vault_path) {
      setSelectedPdf(item)
    } else if (onResultSelect) {
      onResultSelect(item)
    }
  }, [onResultSelect])

  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-[var(--bg-app)]">
      
      {/* Standalone Subtle Reference Modal */}
      {selectedPdf && (
        <div 
          tabIndex={0}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Escape') setSelectedPdf(null)
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedPdf(null)
          }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 outline-none animate-in fade-in duration-150"
        >
          <div className="bg-[#181818] border border-[#2c2c2c] rounded-[5px] w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Native OS Window-Style Title Bar */}
            <div className="h-9 border-b border-[#2a2a2a] bg-[#1e1e1e] flex items-center justify-between shrink-0 pl-3 pr-0 select-none">
              <div className="min-w-0 flex-1 mr-4 flex items-center gap-3">
                <span className="text-xs font-normal text-gray-300 truncate block">{selectedPdf.title}</span>
                {!fileExists ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                    Archived in DB (Disk file removed)
                  </span>
                ) : (
                  selectedPdf.category === 'PDF' && (
                    <div className="flex items-center bg-[#141414] rounded p-0.5 border border-[#2a2a2a]">
                      <button
                        onClick={() => setViewMode('pdf')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          viewMode === 'pdf' ? 'bg-[#a855f7] text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        PDF Viewer
                      </button>
                      <button
                        onClick={() => setViewMode('text')}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                          viewMode === 'text' ? 'bg-[#a855f7] text-white' : 'text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        Extracted Text
                      </button>
                    </div>
                  )
                )}
              </div>
              
              <button 
                onClick={() => setSelectedPdf(null)}
                className="h-full px-4 hover:bg-[#e81123] hover:text-white text-gray-400 transition-colors flex items-center justify-center text-sm shrink-0"
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden relative bg-[#131313]">
              {selectedPdf.category === 'PDF' && viewMode === 'pdf' && fileExists ? (
                pdfPort ? (
                  <webview 
                    ref={(el) => {
                      if (el && !el._escAttached) {
                        el._escAttached = true
                        el.addEventListener('before-input-event', (e) => {
                          if (e.key === 'Escape') {
                            setSelectedPdf(null)
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
                <div className="w-full h-full overflow-y-auto p-5 custom-scrollbar">
                  {loadingText ? (
                    <div className="flex items-center justify-center h-full text-gray-500 animate-pulse text-sm font-medium">Loading document content...</div>
                  ) : (
                    <div className="max-w-3xl mx-auto">
                      {selectedPdf.category === 'JSON' ? (
                        <pre className="bg-[#1a1a1a] p-5 rounded-xl border border-[#2a2a2a] text-[13px] text-gray-300 overflow-x-auto custom-scrollbar">
                          <code>{fullText}</code>
                        </pre>
                      ) : (
                        <div className="text-gray-300 text-[14.5px] leading-relaxed">
                          <Suspense fallback={<div className="flex items-center justify-center py-10 text-gray-500 animate-pulse text-sm">Loading markdown renderer...</div>}>
                            <ReactMarkdown components={markdownComponents}>
                              {formatMarkdownContent(fullText)}
                            </ReactMarkdown>
                          </Suspense>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat History Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8 custom-scrollbar space-y-10 scroll-smooth"
      >
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-50">
            <Search size={48} className="text-[var(--text-muted)] mb-6" />
            <h2 className="text-2xl font-black text-[var(--text-main)]">How can I help you?</h2>
            <p className="text-sm font-bold text-[var(--text-muted)] mt-2">Type a query below to search your Knowledge Hub.</p>
          </div>
        ) : (
          history.map(msg => (
            <div key={msg.id} className="w-full max-w-3xl mx-auto flex flex-col gap-8 animate-in fade-in duration-300">
              
              {/* User Message Bubble */}
              <div className="flex justify-end w-full pl-12">
                <div className="bg-[#2f2f2f] text-gray-100 px-5 py-3.5 rounded-3xl rounded-br-md max-w-[75%]">
                  <p className="text-[15px] leading-relaxed">{msg.query}</p>
                </div>
              </div>

              {/* AI Response Area */}
              <div className="flex justify-start w-full pr-12">
                <div className="w-full flex flex-col">
                  {msg.isLoading ? (
                    <div className="flex items-center gap-3 text-[var(--text-muted)] p-2">
                      <div className="w-4 h-4 border-2 border-[var(--text-accent)] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">Searching knowledge base...</span>
                    </div>
                  ) : msg.error ? (
                    <div className="flex flex-col gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                      <strong className="font-semibold">Search Failed</strong>
                      <p>{msg.error}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {msg.results.map((item) => (
                        <ChatChunk key={item.id} item={item} query={msg.query} handleSelect={handleSelect} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Anchored at Bottom */}
      <div className="w-full shrink-0 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent pt-10 pb-6 px-6 relative z-10">
        <div className="max-w-3xl mx-auto w-full relative">
          <div className="flex items-center bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-2xl overflow-hidden transition-colors hover:border-[var(--text-muted)] focus-within:border-[var(--text-accent)]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none outline-none text-base font-medium text-[var(--text-main)] py-4 pl-6 pr-4 placeholder:text-[var(--text-muted)]"
              autoComplete="off"
              spellCheck="false"
            />
            <button 
              onClick={submitSearch}
              disabled={!query || query.trim() === ''}
              className="mr-2 p-2 rounded-xl bg-[var(--text-accent)] text-[var(--bg-app)] disabled:opacity-30 disabled:bg-[var(--bg-active)] disabled:text-[var(--text-muted)] transition-all hover:scale-105 active:scale-95"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          </div>
          <div className="text-center mt-3 text-[10px] font-bold tracking-widest text-[var(--text-faint)] uppercase">
            Knowledge Hub Search
          </div>
        </div>
      </div>

    </div>
  )
}

export default DashboardSearch
