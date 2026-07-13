import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Send, Plus, ChevronDown, Mic, ArrowUp, RotateCcw, Sparkles } from 'lucide-react'
import SearchResultCard from './SearchResultCard'
import ReferenceDocumentModal from './ReferenceDocumentModal'
import DocumentRenderer from './DocumentRenderer'
import { getSetting, saveSetting } from '../../lib/settings'
import { streamRagAnswer, checkIsConversational } from '../../lib/deepseek'

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
  <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-[var(--bg-panel)]/40 shadow-sm text-center gap-3 my-2 animate-in fade-in duration-200">
    <div className="w-10 h-10 rounded-full bg-[var(--bg-panel)]/50 flex items-center justify-center text-[var(--text-faint)]">
      <Sparkles size={16} className="opacity-60" />
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



const DashboardSearch = () => {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [selectedPdf, setSelectedPdf] = useState(null)
  const [pdfPort, setPdfPort] = useState(null)
  const [fileExists, setFileExists] = useState(true)
  const [viewMode, setViewMode] = useState('text')
  const [fullText, setFullText] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const [enableRag, setEnableRag] = useState(true)
  const [savedResponses, setSavedResponses] = useState({})

  const handleSaveResponse = async (msgId, query, answer) => {
    setSavedResponses(prev => ({ ...prev, [msgId]: 'saving' }))
    try {
      const res = await window.electron.ipcRenderer.invoke('db:ingest-text', { title: query, text: answer })
      if (res.success) {
        setSavedResponses(prev => ({ ...prev, [msgId]: 'saved' }))
      } else {
        setSavedResponses(prev => ({ ...prev, [msgId]: 'error' }))
        console.error('Failed to save response:', res.message)
      }
    } catch (err) {
      setSavedResponses(prev => ({ ...prev, [msgId]: 'error' }))
      console.error('Failed to save response:', err)
    }
  }

  useEffect(() => {
    getSetting('ENABLE_RAG', true).then(val => {
      setEnableRag(val !== false && val !== 'false')
    })
  }, [])

  const toggleRag = async () => {
    const nextVal = !enableRag
    setEnableRag(nextVal)
    await saveSetting('ENABLE_RAG', nextVal)
  }
  
  const scrollRef = useRef(null)
  const savedScrollTopRef = useRef(0)
  const debounceTimeoutRef = useRef(null)
  const isSearchingRef = useRef(false)
  const textareaRef = useRef(null)



  // Get HTTP PDF viewer port
  useEffect(() => {
    if (window.api && window.api.server && window.api.server.getPort) {
      window.api.server.getPort().then(port => setPdfPort(port))
    }
  }, [])

  // Global Ctrl+P to focus textarea
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        e.stopPropagation()
        setSelectedPdf(null) // Ensure modal is closed
        if (textareaRef.current) {
          setTimeout(() => {
            if (textareaRef.current) {
              textareaRef.current.focus()
              const length = textareaRef.current.value.length
              textareaRef.current.setSelectionRange(length, length)
            }
          }, 50)
        }
      }
    }
    // Use capture phase to ensure this runs before other listeners
    window.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true)
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

  // Smooth auto-scroll chat to bottom only when history updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
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
      const apiKey = await getSetting('DEEPSEEK_API_KEY', '')
      const isConv = await checkIsConversational(searchQuery, apiKey)
      
      if (isConv) {
        setHistory(prev => prev.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            results: [], 
            isLoading: false, 
            error: null,
            ragStatus: 'done',
            ragAnswer: 'Hello! I am your KManager AI assistant. What would you like to search for in your knowledge base today?'
          } : msg
        ))
        return
      }

      // We now limit to 3 results to provide hyper-focused context to the AI, reducing noise
      const res = await window.api.db.search(searchQuery, 3)
      
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
          msg.id === messageId ? { 
            ...msg, 
            results: mapped, 
            isLoading: false, 
            error: null,
            ragStatus: enableRag && mapped.length > 0 ? 'generating' : 'disabled',
            ragAnswer: ''
          } : msg
        ))

        if (enableRag && mapped.length > 0) {
          getSetting('DEEPSEEK_API_KEY', '').then(apiKey => {
            streamRagAnswer(searchQuery, mapped.slice(0, 5), apiKey, (accumulated) => {
              setHistory(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, ragAnswer: accumulated } : msg
              ))
            }).then(() => {
              setHistory(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, ragStatus: 'done' } : msg
              ))
            }).catch(ragErr => {
              setHistory(prev => prev.map(msg => 
                msg.id === messageId ? { ...msg, ragStatus: 'error', ragError: ragErr.message } : msg
              ))
            })
          })
        }
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
      />

      {/* Chat History Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-8 pb-48 custom-scrollbar space-y-10 scroll-smooth"
      >
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-5 select-none px-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-accent)] shadow-sm">
                <span className="text-sm font-black tracking-tighter">KM</span>
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[var(--text-main)] tracking-tight">
                  Knowledge Management
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5 font-normal">
                  Ask anything across your entire knowledge base
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
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
                  <div className="flex items-center justify-between p-5 rounded-xl bg-[#873636]/10 shadow-sm animate-in fade-in duration-200">
                    <div className="flex flex-col gap-1.5">
                      <strong className="text-[13px] font-semibold text-red-400">Search Failed</strong>
                      <p className="text-[12px] text-red-400/80">{msg.error}</p>
                    </div>
                    {msg.error.toLowerCase().includes('database') || msg.error.toLowerCase().includes('connect') ? (
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'database' } }))}
                        className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-[#394b5e] hover:bg-[#4a5d72] border border-[#4e6074] text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all flex-shrink-0 ml-4"
                      >
                        Connect Database
                      </button>
                    ) : null}
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

                    {/* RAG Synthesized Answer Card BELOW retrieved sources */}
                    {msg.ragStatus && msg.ragStatus !== 'disabled' && (
                      <div className="w-full mt-8 mb-8 pt-6 border-t border-[var(--border-subtle)] animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-accent)]">
                            DeepSeek Synthesis
                          </span>
                        </div>

                        {msg.ragStatus === 'generating' && !msg.ragAnswer && (
                          <div className="flex items-center gap-2 py-2 text-xs text-[var(--text-muted)]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-accent)] animate-pulse" />
                            Synthesizing answer from {msg.results?.length || 0} sources...
                          </div>
                        )}

                        {msg.ragAnswer && (
                          <div className="flex flex-col gap-3">
                            <div className="text-[14px] leading-relaxed text-[var(--text-main)] max-w-none">
                              <DocumentRenderer content={msg.ragAnswer} category="DOCUMENT" />
                              {msg.ragStatus === 'generating' && (
                                <span className="inline-block w-2 h-4 ml-1 bg-[var(--text-accent)] animate-pulse align-middle" />
                              )}
                            </div>
                            
                            {/* Save to DB Button */}
                            {msg.ragStatus === 'complete' && (
                              <div className="flex justify-start mt-2">
                                <button
                                  onClick={() => handleSaveResponse(msg.id, msg.query, msg.ragAnswer)}
                                  disabled={savedResponses[msg.id] === 'saving' || savedResponses[msg.id] === 'saved'}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                                    savedResponses[msg.id] === 'saved'
                                      ? 'bg-green-500/10 text-green-400 cursor-default'
                                      : savedResponses[msg.id] === 'saving'
                                        ? 'bg-[var(--bg-panel)]/50 text-[var(--text-muted)] cursor-wait opacity-70'
                                        : 'bg-[var(--bg-panel)]/40 hover:bg-[#394b5e]/40 text-[var(--text-muted)] hover:text-gray-300 shadow-sm'
                                  }`}
                                >
                                  {savedResponses[msg.id] === 'saved' ? (
                                    <>
                                      <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-green-500/20 text-green-400">
                                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="2.5 6 5 8.5 9.5 3.5"></polyline>
                                        </svg>
                                      </div>
                                      Saved to Knowledge Base
                                    </>
                                  ) : savedResponses[msg.id] === 'saving' ? (
                                    <>
                                      <span className="w-3 h-3 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Plus size={13} />
                                      Save to Knowledge Base
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {msg.ragStatus === 'error' && (
                          <div className="py-2 text-xs text-red-400">
                            RAG Synthesis failed: {msg.ragError} (Check API key in AI Settings)
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ))
        )}
      </div>

      {/* Antigravity-Style AI Composer Card */}
      <div className="pl-6 pr-14 sm:px-6 pb-2 pt-1 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col bg-[var(--bg-card)] rounded-xl transition-all duration-200 overflow-hidden shadow-sm">
            {/* Top Row: Auto-growing Textarea */}
            <textarea 
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={handleInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything across your knowledge base..."
              className="w-full bg-transparent border-none outline-none text-[13.5px] font-normal text-[var(--text-main)] py-3 px-4 placeholder-[var(--text-muted)]/60 resize-none leading-relaxed overflow-y-auto custom-scrollbar max-h-40"
              autoComplete="off"
              spellCheck="false"
            />

            {/* Bottom Row: Actions & Model Pill */}
            <div className="flex items-center justify-between px-2 pb-2 pt-0 select-none">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'data' } }))}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors"
                  title="Upload Data (Settings)"
                >
                  <Plus size={16} />
                </button>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleNewSession}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[var(--bg-active)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors animate-in fade-in duration-200"
                    title="Clear chat history and start a new session"
                  >
                    <RotateCcw size={13} />
                    <span>New session</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleRag}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    enableRag
                      ? 'bg-[var(--text-accent)]/10 text-[var(--text-accent)] hover:bg-[var(--text-accent)]/20'
                      : 'hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title={enableRag ? 'RAG Synthesis Enabled (Click to toggle)' : 'RAG Synthesis Disabled (Click to toggle)'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${enableRag ? 'bg-[var(--text-accent)] shadow-[0_0_5px_var(--text-accent)]' : 'bg-[var(--text-muted)] opacity-50'}`} />
                  <span>RAG: {enableRag ? 'ON' : 'OFF'}</span>
                </button>
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
