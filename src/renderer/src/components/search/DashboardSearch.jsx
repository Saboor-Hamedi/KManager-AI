import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Send, Plus, ChevronDown, Mic, ArrowUp, RotateCcw } from 'lucide-react'
import SearchResultCard from './SearchResultCard'
import ReferenceDocumentModal from './ReferenceDocumentModal'

const SearchLoadingSkeleton = () => (
  <div className="flex flex-col gap-6 py-3 animate-in fade-in duration-200">
    <div className="flex items-center gap-2.5 text-[var(--text-muted)] text-[13px] font-medium">
      <span className="w-2 h-2 rounded-full bg-[var(--text-accent)] animate-ping" />
      <span>Searching knowledge base...</span>
    </div>

    {[1, 2].map((idx) => (
      <div
        key={idx}
        className="flex flex-col gap-3 pb-4 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-40 rounded bg-[var(--border-subtle)]/40" />
          <div className="h-5 w-48 rounded bg-[var(--border-subtle)]/30" />
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <div className="h-3 w-11/12 rounded bg-[var(--border-subtle)]/30" />
          <div className="h-3 w-4/5 rounded bg-[var(--border-subtle)]/25" />
          <div className="h-3 w-2/3 rounded bg-[var(--border-subtle)]/20" />
        </div>
      </div>
    ))}
  </div>
)

const EmptySearchState = ({ query }) => (
  <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)]/40 text-center gap-3 my-2 animate-in fade-in duration-200">
    <div className="w-10 h-10 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] text-base">
      ◈
    </div>
    <div className="flex flex-col gap-1 max-w-sm">
      <h4 className="text-[13.5px] font-semibold text-[var(--text-main)]">
        No matching documents found
      </h4>
      <p className="text-[12.5px] text-[var(--text-muted)] leading-relaxed">
        We couldn’t find documents matching <span className="font-mono text-[var(--text-main)]">“{query}”</span>. Try adjusting keywords or check your spelling.
      </p>
    </div>
  </div>
)

const PLACEHOLDERS = [
  'Ask anything across your knowledge base...',
  'Search documents or @mention a specific note...',
  'Summarize recent insights or compare concepts...',
  'Type / for quick actions and workflow tools...'
]

const DashboardSearch = () => {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [pdfPort, setPdfPort] = useState(null)
  const [fileExists, setFileExists] = useState(true)
  const [viewMode, setViewMode] = useState('text')
  const [fullText, setFullText] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  
  const scrollRef = useRef(null)
  const savedScrollTopRef = useRef(0)
  const debounceTimeoutRef = useRef(null)
  const isSearchingRef = useRef(false)
  const textareaRef = useRef(null)

  const [placeholderIdx, setPlaceholderIdx] = useState(0)
  const [typedPlaceholder, setTypedPlaceholder] = useState('')

  useEffect(() => {
    let currentText = PLACEHOLDERS[placeholderIdx]
    let charIdx = 0
    let isDeleting = false
    let timeoutId

    const typeStep = () => {
      if (!isDeleting) {
        charIdx++
        setTypedPlaceholder(currentText.slice(0, charIdx))
        if (charIdx === currentText.length) {
          isDeleting = true
          timeoutId = setTimeout(typeStep, 2800)
        } else {
          timeoutId = setTimeout(typeStep, 38)
        }
      } else {
        charIdx--
        setTypedPlaceholder(currentText.slice(0, charIdx))
        if (charIdx === 0) {
          isDeleting = false
          setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDERS.length)
        } else {
          timeoutId = setTimeout(typeStep, 18)
        }
      }
    }

    timeoutId = setTimeout(typeStep, 800)
    return () => clearTimeout(timeoutId)
  }, [placeholderIdx])

  // Get HTTP PDF viewer port
  useEffect(() => {
    if (window.api && window.api.server && window.api.server.getPort) {
      window.api.server.getPort().then(port => setPdfPort(port))
    }
  }, [])

  const handleSelect = useCallback((item) => {
    // Save current scroll position before opening modal
    if (scrollRef.current) {
      savedScrollTopRef.current = scrollRef.current.scrollTop
    }
    setSelectedPdf(item)
  }, [])

  const handleCloseModal = useCallback(() => {
    setSelectedPdf(null)
  }, [])

  // Auto-scroll chat to bottom only when history updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history])

  // Escape key closes open reference modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (selectedPdf) {
          e.preventDefault()
          handleCloseModal()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [selectedPdf, handleCloseModal])

  // Load document content and check disk file existence when modal opens
  useEffect(() => {
    if (!selectedPdf) {
      setFullText('')
      // Reliably restore scroll position after modal closes
      const savedTop = savedScrollTopRef.current
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current && savedTop !== undefined) {
            scrollRef.current.scrollTop = savedTop
          }
        })
      })
      return
    }
    setLoadingText(true)

    if (window.api.system && window.api.system.fileExists) {
      window.api.system.fileExists(selectedPdf.vault_path).then(exists => {
        setFileExists(exists)
        setViewMode(exists && selectedPdf.category === 'PDF' ? 'pdf' : 'text')
      })
    } else {
      setFileExists(true)
      setViewMode(selectedPdf.category === 'PDF' ? 'pdf' : 'text')
    }

    // Always fetch full text from PostgreSQL database as permanent archive
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

  const submitSearch = async () => {
    if (!query || query.trim() === '' || isSearchingRef.current) return

    // Debounce guard: prevent duplicate submissions fired within 300ms
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    isSearchingRef.current = true

    if (selectedPdf) setSelectedPdf(null)

    const searchQuery = query.trim()
    const messageId = Date.now().toString()
    
    setQuery('')
    
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
          similarity: row.similarity,
          vault_path: row.vault_path
        }))
        setHistory(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, results: mapped, isLoading: false, error: null } : msg
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      if (query && query.trim() !== '') {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
      }
    }
  }, [query])

  const handleInput = (e) => {
    setQuery(e.target.value)
  }

  const handlePaste = (e) => {
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
      }
    }, 0)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitSearch()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleNewSession = () => {
    setHistory([])
    setQuery('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-app)] overflow-hidden relative">
      
      {/* Reference Document Popup Modal */}
      <ReferenceDocumentModal
        selectedPdf={selectedPdf}
        onClose={handleCloseModal}
        fileExists={fileExists}
        viewMode={viewMode}
        setViewMode={setViewMode}
        loadingText={loadingText}
        fullText={fullText}
        pdfPort={pdfPort}
      />

      {/* Chat History Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-8 pb-48 custom-scrollbar space-y-10 scroll-smooth"
      >
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-4 select-none px-6">
            <div className="text-center">
              <h2 className="text-[15px] font-semibold text-[var(--text-main)] tracking-tight">
                Knowledge Management
              </h2>
              <p className="text-[12px] text-[var(--text-muted)] mt-1 font-normal">
                Ask anything across your entire knowledge base
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 max-w-md pt-1">
              {[
                'Summarize recent notes',
                'Find concepts in my vault',
                'Compare two topics'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)]/50 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-main)] hover:bg-[var(--bg-active)] transition-colors font-normal"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          history.map(msg => (
            <div key={msg.id} className="w-full max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
              
              {/* User Message Bubble matching Antigravity card style */}
              <div className="flex justify-end w-full">
                <div className="bg-[var(--bg-panel)] text-[var(--text-main)] px-5 py-3.5 rounded-2xl rounded-br-sm max-w-[80%] border border-[var(--border-subtle)] shadow-sm">
                  <p className="text-[14px] leading-relaxed font-normal">{msg.query}</p>
                </div>
              </div>

              {/* AI Response Area centered with same width */}
              <div className="w-full flex flex-col">
                {msg.isLoading ? (
                  <SearchLoadingSkeleton />
                ) : msg.error ? (
                  <div className="flex flex-col gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    <strong className="font-semibold">Search Failed</strong>
                    <p>{msg.error}</p>
                  </div>
                ) : msg.results.length === 0 ? (
                  <EmptySearchState query={msg.query} />
                ) : (
                  <div className="flex flex-col w-full">
                    {msg.results.map((item) => (
                      <SearchResultCard
                        key={item.id}
                        item={item}
                        query={msg.query}
                        handleSelect={handleSelect}
                      />
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* Antigravity-Style AI Composer Card */}
      <div className="px-6 pb-2 pt-1 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col bg-[var(--bg-card)] border border-[var(--border-main)] focus-within:border-[var(--text-accent)] rounded-2xl transition-all duration-200 overflow-hidden">
            {/* Top Row: Auto-growing Textarea with Animated Typewriter Placeholder */}
            <textarea 
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={handleInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder={typedPlaceholder || PLACEHOLDERS[0]}
              className="w-full bg-transparent border-none outline-none text-[14px] font-normal text-[var(--text-main)] pt-3.5 pb-2.5 px-4 placeholder-[var(--text-muted)]/70 resize-none leading-relaxed overflow-y-auto custom-scrollbar max-h-40"
              autoComplete="off"
              spellCheck="false"
            />

            {/* Bottom Row: Actions & Model Pill */}
            <div className="flex items-center justify-between px-2.5 pb-2.5 pt-1 border-t border-[var(--border-dim)] select-none">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors"
                  title="Add Attachment"
                >
                  <Plus size={16} />
                </button>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-main)]">
                  <span>KManager AI</span>
                  <ChevronDown size={13} className="text-[var(--text-muted)]" />
                </div>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleNewSession}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]/80 hover:bg-[var(--bg-active)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors animate-in fade-in duration-200"
                    title="Clear chat history and start a new session"
                  >
                    <RotateCcw size={13} />
                    <span>New session</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors"
                  title="Voice Search"
                >
                  <Mic size={16} />
                </button>
                <button 
                  onClick={submitSearch}
                  disabled={!query || query.trim() === ''}
                  className="w-7 h-7 rounded-full bg-[var(--text-accent)] hover:opacity-90 text-white disabled:opacity-30 transition-all duration-150 flex items-center justify-center shadow-sm"
                  title="Send message"
                >
                  <ArrowUp size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default DashboardSearch
