import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, Send, Plus, ChevronDown, Mic, ArrowUp, RotateCcw, Sparkles } from 'lucide-react'
import SearchResultCard from './SearchResultCard'
import Preview from './Preview'
import Autocompletion, { getSuggestion } from './Autocompletion'
import PDFUploadZone from './PDFUploadZone'
import EmptySearchState from './EmptySearchState'
import InlineChat from './InlineChat'
import RagAnswer from './RagAnswer'
import { getSetting, saveSetting } from '../../lib/settings'
import { streamRagAnswer, checkIsConversational } from '../../lib/LLMProvider'
import './horizontal.css'

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
  const [autocompleteResults, setAutocompleteResults] = useState([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [previewItem, setPreviewItem] = useState(null)
  const [activeReplyId, setActiveReplyId] = useState(null)
  const [collapsedReplies, setCollapsedReplies] = useState({})

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
  const autocompleteTimeoutRef = useRef(null)
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

  // Smooth auto-scroll chat to bottom only when history length changes (new message added/removed)
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current
      const maxScroll = el.scrollHeight - el.clientHeight
      if (maxScroll - el.scrollTop < 150) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      }
    }
  }, [history.length])

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

  const submitSearch = async (overrideQuery = null) => {
    const q = (typeof overrideQuery === 'string') ? overrideQuery : query
    if (!q || q.trim() === '' || isSearchingRef.current) return

    // Debounce guard: prevent duplicate submissions fired within 300ms
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    isSearchingRef.current = true

    if (selectedPdf) setSelectedPdf(null)

    const searchQuery = q.trim()
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
      const provider = await getSetting('ACTIVE_LLM_PROVIDER', 'deepseek')
      const apiKey = await getSetting(`${provider.toUpperCase()}_API_KEY`, '')
      const isConv = await checkIsConversational(searchQuery, provider, apiKey)
      
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
          vault_path: row.vault_path,
          created_at: row.created_at
        }))
        setHistory(prev => prev.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            results: mapped, 
            isLoading: false, 
            error: null,
            isFallback: res.isFallback || false,
            ragStatus: enableRag && mapped.length > 0 ? 'generating' : 'disabled',
            ragAnswer: ''
          } : msg
        ))

        if (enableRag && mapped.length > 0) {
          const provider = await getSetting('ACTIVE_LLM_PROVIDER', 'deepseek')
          const apiKey = await getSetting(`${provider.toUpperCase()}_API_KEY`, '')
          
          if (!apiKey || apiKey === 'your_deepseek_api_key_here' || apiKey === 'your_api_key_here') {
            setHistory(prev => prev.map(m => m.id === messageId ? { ...m, ragStatus: 'error', ragAnswer: 'API key not configured in Settings.' } : m))
            return
          }
          
          streamRagAnswer(searchQuery, mapped.slice(0, 5), provider, apiKey, (accumulated) => {
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

  const submitFollowUp = async (replyText, parentMsg, targetItem) => {
    if (!replyText || replyText.trim() === '') return;
    
    const messageId = Date.now().toString();
    const resultId = targetItem ? (targetItem.uniqueResultId || targetItem.id) : null;

    // Add reply to parent message's replies array
    const newReply = {
      id: messageId,
      resultId: resultId,
      query: replyText,
      ragStatus: 'generating',
      ragAnswer: '',
      ragError: null
    };

    setHistory(prev => prev.map(msg =>
      msg.id === parentMsg.id
        ? { ...msg, replies: [...(msg.replies || []), newReply] }
        : msg
    ));

    setCollapsedReplies(prev => ({ ...prev, [parentMsg.id]: false }));

    if (enableRag) {
      try {
        const provider = await getSetting('ACTIVE_LLM_PROVIDER', 'deepseek')
        const apiKey = await getSetting(`${provider.toUpperCase()}_API_KEY`, '')
        const relevantChunks = targetItem
          ? [targetItem]
          : (parentMsg.results || []).slice(0, 5)

        await streamRagAnswer(replyText, relevantChunks, provider, apiKey, (accumulated) => {
          setHistory(prev => prev.map(msg =>
            msg.id === parentMsg.id
              ? { ...msg, replies: msg.replies.map(r => r.id === messageId ? { ...r, ragAnswer: accumulated } : r) }
              : msg
          ));
          if (scrollRef.current) {
            const el = scrollRef.current
            const maxScroll = el.scrollHeight - el.clientHeight
            if (maxScroll - el.scrollTop < 100) {
              el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
            }
          }
        });

        setHistory(prev => prev.map(msg =>
          msg.id === parentMsg.id
            ? { ...msg, replies: msg.replies.map(r => r.id === messageId ? { ...r, ragStatus: 'done' } : r) }
            : msg
        ));
      } catch (err) {
        console.error('Follow-up RAG error:', err);
        setHistory(prev => prev.map(msg =>
          msg.id === parentMsg.id
            ? { ...msg, replies: msg.replies.map(r => r.id === messageId ? { ...r, ragStatus: 'error', ragError: err.message } : r) }
            : msg
        ));
      }
    } else {
      setHistory(prev => prev.map(msg =>
        msg.id === parentMsg.id
          ? { ...msg, replies: msg.replies.map(r => r.id === messageId ? { ...r, ragStatus: 'disabled' } : r) }
          : msg
      ));
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

  const handleInput = useCallback((e) => {
    const val = e.target.value
    setQuery(val)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
    }

    if (val.trim() === '') {
      setAutocompleteResults([])
      setShowAutocomplete(false)
      return
    }

    if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current)
    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await window.api.db.lexicalSearch(val, 20)
        if (results && results.length > 0) {
          const uniqueResults = []
          const seen = new Set()
          for (const res of results) {
            const suggestionObj = getSuggestion(res.content, val)
            const text = suggestionObj.text || ''
            if (!seen.has(text)) {
              seen.add(text)
              uniqueResults.push({ ...res, suggestionText: text, suggestionMatchIdx: suggestionObj.matchIdx })
            }
          }
          setAutocompleteResults(uniqueResults)
          setShowAutocomplete(true)
          setSelectedIndex(-1)
        } else {
          setAutocompleteResults([])
          setShowAutocomplete(false)
        }
      } catch(err) {
        console.error(err)
      }
    }, 150)
  }, [])

  const handlePaste = (e) => {
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
      }
    }, 0)
  }


  const handleKeyDown = (e) => {
    const extractSuggestion = (content, queryStr) => {
      if (!content || !queryStr) return ''
      // Strip common markdown characters to clean up the snippet
      const cleanContent = content.replace(/[*_~`>#\[\]]/g, '')
      const lowerContent = cleanContent.toLowerCase()
      const lowerQuery = queryStr.toLowerCase().trim()
      const matchIdx = lowerContent.indexOf(lowerQuery)
      if (matchIdx === -1) return cleanContent.substring(0, 50).replace(/\n/g, ' ') + '...'
      
      let start = matchIdx
      while (start > 0 && !/[\s\n.!?]/.test(cleanContent[start - 1])) start--
      
      let end = matchIdx + lowerQuery.length
      let spaceCount = 0
      while (end < cleanContent.length && spaceCount < 8) {
        if (cleanContent[end] === ' ' || cleanContent[end] === '\n') spaceCount++
        if (['.', '!', '?'].includes(cleanContent[end])) { end++; break }
        end++
      }
      return cleanContent.substring(start, Math.min(end, start + 80)).replace(/\n/g, ' ').trim()
    }

    if (showAutocomplete && autocompleteResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev < autocompleteResults.length - 1 ? prev + 1 : 0))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : autocompleteResults.length - 1))
        return
      }
      if (e.key === 'Enter' && !e.shiftKey && selectedIndex >= 0) {
        e.preventDefault()
        const selectedRes = autocompleteResults[selectedIndex]
        setShowAutocomplete(false)
        const newQuery = selectedRes.suggestion || extractSuggestion(selectedRes.content, query)
        setQuery(newQuery)
        setTimeout(() => submitSearch(newQuery), 50)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setShowAutocomplete(false)
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

  const memoizedHistoryFeed = useMemo(() => {
    if (history.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center gap-5  px-6">
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
        )
    }

    return history.map(msg => (
      <div key={msg.id} className="w-full max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
              
              {/* User Prompt Text without background, aligned flush with response boundary */}
              <div className="flex justify-end w-full py-1">
                <div className="bg-transparent max-w-[85%] border-0 shadow-none text-justify">
                  <p className="text-[14px] leading-relaxed font-normal text-[var(--text-main)] whitespace-pre-wrap break-words text-justify">{msg.query}</p>
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
                    {msg.isFallback && (
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <span className="text-[10px] font-medium text-[var(--text-muted)] italic">
                          No exact match for <span className="text-[var(--text-main)] font-mono not-italic">"{msg.query}"</span> — showing closest semantic results
                        </span>
                      </div>
                    )}
                    {!msg.isFollowUp && msg.results.map((item, idx) => (
                      <div key={`${item.id || 'res'}-${idx}`} className="flex flex-col gap-2">
                        <SearchResultCard
                          item={item}
                          query={msg.query}
                          handleSelect={handleSelect}
                          onReply={() => {
                            if (activeReplyId === `${msg.id}-${idx}`) {
                              setActiveReplyId(null);
                            } else {
                              setActiveReplyId(`${msg.id}-${idx}`);
                            }
                          }}
                          isActiveReply={activeReplyId === `${msg.id}-${idx}`}
                          isLast={idx === msg.results.length - 1}
                        />
                        <div className="mt-2 mb-4">
                          <InlineChat 
                            resultId={`${item.id || 'res'}-${idx}`}
                            msg={msg}
                            activeReplyId={activeReplyId}
                            compositeId={`${msg.id}-${idx}`}
                            collapsedReplies={collapsedReplies}
                            setCollapsedReplies={setCollapsedReplies}
                            submitFollowUp={(val) => submitFollowUp(val, msg, { ...item, uniqueResultId: `${item.id || 'res'}-${idx}` })}
                          />
                        </div>
                      </div>
                    ))}

                    {/* RAG Synthesized Answer */}
                    <RagAnswer 
                      msg={msg}
                      handleSaveResponse={handleSaveResponse}
                      savedResponses={savedResponses}
                      setQuery={setQuery}
                      textareaRef={textareaRef}
                      activeReplyId={activeReplyId}
                      setActiveReplyId={setActiveReplyId}
                      collapsedReplies={collapsedReplies}
                      setCollapsedReplies={setCollapsedReplies}
                      submitFollowUp={submitFollowUp}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
  }, [history, savedResponses, handleSelect, enableRag, activeReplyId, collapsedReplies])

  return (
    <div className="flex-1 flex flex-row h-full bg-[var(--bg-app)] overflow-hidden relative">
      
      {/* Left Area: Chat Feed */}
      <div className={`flex flex-col h-full overflow-hidden transition-all duration-300 ${selectedPdf ? 'w-1/2 border-r border-[var(--border-subtle)]' : 'w-full'}`}>


      {/* Smart PDF & Multi-Format Ingestion Bar & Drop Zone */}
      <PDFUploadZone />

      {/* Chat History Feed */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pt-8 pb-48 custom-scrollbar space-y-10 scroll-smooth"
      >
        {memoizedHistoryFeed}
      </div>

      {/* Antigravity-Style AI Composer Card */}
      <div className="px-4 sm:px-6 pb-2 pt-1 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent shrink-0">
        <div className="max-w-2xl mx-auto relative">
          
          <Autocompletion 
            results={autocompleteResults} 
            visible={showAutocomplete} 
            query={query} 
            selectedIndex={selectedIndex}
            onClose={() => setShowAutocomplete(false)}
            onSelect={(res) => {
              setShowAutocomplete(false)
              const newQuery = res.suggestion || (res.content ? res.content.substring(0, 50) : '')
              setQuery(newQuery)
              setTimeout(() => submitSearch(newQuery), 50)
            }} 
          />

          <div className={`flex flex-col bg-[var(--bg-card)] transition-all duration-200 overflow-hidden shadow-sm ${showAutocomplete && autocompleteResults.length > 0 ? 'rounded-b-xl rounded-t-none' : 'rounded-xl'}`}>
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

      {/* Right Reference Panel */}
      {selectedPdf && (
        <div className="w-1/2 h-full flex flex-col bg-[var(--bg-app)] border-l border-[var(--border-subtle)] overflow-hidden animate-in slide-in-from-right duration-200">
          <Preview
            selectedPdf={selectedPdf}
            onClose={handleCloseModal}
            fileExists={fileExists}
          />
        </div>
      )}

    </div>
  )
}

export default DashboardSearch
