import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Search, Send, Plus, ChevronDown, Mic, ArrowUp, RotateCcw, Sparkles } from 'lucide-react'
import SearchResultCard from './SearchResultCard'
import Preview from './Preview'
import Autocompletion, { getSuggestion } from './Autocompletion'
import PDFUploadZone from './PDFUploadZone'
import EmptySearchState from './EmptySearchState'
import InlineChat from './InlineChat'
import RagAnswer from './RagAnswer'
import HistoryFeed from './HistoryFeed'
import { getSetting, saveSetting } from '../../lib/settings'
import { streamRagAnswer, streamOfflineExtractiveRag, checkIsConversational, isCasualGreeting } from '../../lib/LLMProvider'
import { rerankChunks } from '../../lib/reranker'
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

  // Listen for AI query injection from ChatBot
  useEffect(() => {
    const handleFillSearch = (e) => {
      const { query: newQuery } = e.detail || {}
      if (newQuery) {
        setQuery(newQuery)
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.value = newQuery
            textareaRef.current.focus()
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
          }
        }, 50)
      }
    }
    window.addEventListener('fill-search', handleFillSearch)
    return () => window.removeEventListener('fill-search', handleFillSearch)
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

  useEffect(() => {
    window.__openCitationPreviewModal = (itemOrId, title) => {
      if (typeof itemOrId === 'object' && itemOrId !== null) {
        handleSelect(itemOrId)
      } else {
        let found = null
        const numIdx = !isNaN(Number(itemOrId)) ? Number(itemOrId) - 1 : -1

        for (const msg of history) {
          if (msg.results && Array.isArray(msg.results) && msg.results.length > 0) {
            if (numIdx >= 0 && numIdx < msg.results.length) {
              found = msg.results[numIdx]
            } else {
              found = msg.results.find(r => String(r.id) === String(itemOrId) || String(r.document_id) === String(itemOrId) || r.title === title)
            }
            if (found) break
          }
        }

        if (!found && numIdx >= 0 && window.__currentSearchMappedResults && Array.isArray(window.__currentSearchMappedResults) && numIdx < window.__currentSearchMappedResults.length) {
          found = window.__currentSearchMappedResults[numIdx]
        }

        if (found) {
          handleSelect(found)
        } else if (window.api?.db?.query) {
          const strId = String(itemOrId).trim()
          window.api.db.query(
            `SELECT dc.id, dc.document_id, dc.content, d.file_type, d.file_name, d.vault_path 
             FROM embedding_documents dc 
             LEFT JOIN documents d ON dc.document_id = d.id 
             WHERE dc.id::text = $1 OR dc.chunk_index::text = $1 OR d.file_name ILIKE $2 
             LIMIT 1`,
            [strId, title ? `%${title}%` : '']
          )
            .then(res => {
              const rows = res?.rows || res
              if (rows && rows[0]) {
                handleSelect({
                  id: rows[0].id,
                  document_id: rows[0].document_id,
                  category: rows[0].file_type ? rows[0].file_type.toUpperCase() : 'DOCUMENT',
                  title: title || rows[0].file_name || `Source #${itemOrId}`,
                  content: rows[0].content,
                  vault_path: rows[0].vault_path
                })
              }
            }).catch(() => {})
        }
      }
    }
    return () => {
      delete window.__openCitationPreviewModal
    }
  }, [history, handleSelect])

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
    if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current)
    setShowAutocomplete(false)
    setAutocompleteResults([])
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

      const isCasual = isCasualGreeting(searchQuery) || await checkIsConversational(searchQuery, provider, apiKey)
      if (isCasual) {
        window.__currentSearchMappedResults = []
        setHistory(prev => prev.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            results: [], 
            isLoading: false, 
            error: null,
            ragStatus: 'generating',
            ragAnswer: ''
          } : msg
        ))

        streamRagAnswer(searchQuery, [], provider, apiKey, (accumulated) => {
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
        return
      }

      // Dynamically fetch context limit (default to 3) to provide controlled AI context
      const searchLimitStr = await getSetting('SEARCH_RESULT_LIMIT', 3)
      const searchLimit = parseInt(searchLimitStr) || 3
      const ragLimit = Math.max(searchLimit, 12)
      const res = await window.api.db.search(searchQuery, ragLimit)
      
      if (res && res.success) {
        const mappedAll = res.rows.map(row => ({
          id: row.id,
          document_id: row.document_id,
          category: row.file_type ? row.file_type.toUpperCase() : 'DOCUMENT',
          title: row.file_name,
          content: row.content,
          similarity: row.similarity,
          vault_path: row.vault_path,
          created_at: row.created_at
        }))
        const rerankedAll = rerankChunks(searchQuery, mappedAll, { 
          topK: Math.max(searchLimit, 6), 
          mmrLambda: 0.75, 
          minScoreThreshold: 0.18 
        })
        const mapped = rerankedAll.slice(0, searchLimit)
        window.__currentSearchMappedResults = mapped
        const shouldRunRag = enableRag
        setHistory(prev => prev.map(msg => 
          msg.id === messageId ? { 
            ...msg, 
            results: mapped, 
            isLoading: false, 
            error: null,
            ragStatus: shouldRunRag ? 'generating' : 'disabled',
            ragAnswer: ''
          } : msg
        ))

        if (shouldRunRag) {
          const priorHistory = history.slice(-6).flatMap(msg => [
            { role: 'user', content: msg.query || '' },
            { role: 'assistant', content: msg.ragAnswer || '' }
          ]).filter(m => m.content.trim() !== '')

          // Only feed high-confidence re-ranked chunks to RAG to prevent hallucinated citations to irrelevant documents
          const ragContextChunks = rerankedAll.slice(0, 6)
          streamRagAnswer(searchQuery, ragContextChunks, provider, apiKey, (accumulated) => {
            setHistory(prev => prev.map(msg => 
              msg.id === messageId ? { ...msg, ragAnswer: accumulated } : msg
            ))
          }, priorHistory).then(() => {
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
        let relevantChunks = targetItem
          ? [targetItem]
          : (parentMsg.results || []).slice(0, 12)

        if (!targetItem && relevantChunks.length < 6) {
          const extraRes = await window.api.db.search(`${parentMsg.query} ${replyText}`, 12)
          if (extraRes && extraRes.success && extraRes.rows) {
            relevantChunks = extraRes.rows.map(row => ({
              id: row.id,
              document_id: row.document_id,
              category: row.file_type ? row.file_type.toUpperCase() : 'DOCUMENT',
              title: row.file_name,
              content: row.content,
              similarity: row.similarity,
              vault_path: row.vault_path
            }))
          }
        }

        const conversationHistory = [
          { role: 'user', content: parentMsg.query || '' },
          { role: 'assistant', content: parentMsg.ragAnswer || '' },
          ...(parentMsg.replies || []).filter(r => r.id !== messageId).flatMap(r => [
            { role: 'user', content: r.query || '' },
            { role: 'assistant', content: r.ragAnswer || '' }
          ])
        ].filter(m => m.content.trim() !== '')

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
        }, conversationHistory);

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

  const handleUpdateAnswer = useCallback((msgId, newAnswer) => {
    setHistory(prev => prev.map(m => m.id === msgId ? { ...m, ragAnswer: newAnswer } : m))
  }, [])

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
      if (isSearchingRef.current || !textareaRef.current || textareaRef.current.value.trim() === '') return
      try {
        const results = await window.api.db.lexicalSearch(val, 20)
        if (isSearchingRef.current || !textareaRef.current || textareaRef.current.value.trim() === '') return
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
        if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current)
        setShowAutocomplete(false)
        setAutocompleteResults([])
        const newQuery = selectedRes.suggestion || extractSuggestion(selectedRes.content, query)
        setQuery(newQuery)
        setTimeout(() => submitSearch(newQuery), 50)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (autocompleteTimeoutRef.current) clearTimeout(autocompleteTimeoutRef.current)
      setShowAutocomplete(false)
      setAutocompleteResults([])
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
          <div className="h-full flex flex-col items-center justify-center gap-5 px-6 select-none">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-9 h-9 rounded-[8px] bg-[var(--bg-panel)] border-0 flex items-center justify-center text-[var(--text-accent)] shadow-none">
                <span className="text-[13px] font-bold tracking-tight">KM</span>
              </div>
              <div>
                <h2 className="text-[13.5px] font-semibold text-[var(--text-main)] tracking-tight">
                  Knowledge Management
                </h2>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 font-normal">
                  Ask anything across your entire knowledge base
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {[
                'Summarize key insights across documents',
                'Find core concepts and definitions',
                'Compare two related topics'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="px-3 py-1.5 rounded-[5px] border-0 bg-white/[0.03] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.06] transition-colors font-normal"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )
    }

    return (
      <HistoryFeed
        history={history}
        handleSelect={handleSelect}
        activeReplyId={activeReplyId}
        setActiveReplyId={setActiveReplyId}
        collapsedReplies={collapsedReplies}
        setCollapsedReplies={setCollapsedReplies}
        submitFollowUp={submitFollowUp}
        enableRag={enableRag}
        handleSaveResponse={handleSaveResponse}
        savedResponses={savedResponses}
        setQuery={setQuery}
        textareaRef={textareaRef}
        onUpdateAnswer={handleUpdateAnswer}
      />
    )
  }, [history, savedResponses, handleSelect, enableRag, activeReplyId, collapsedReplies, handleUpdateAnswer])

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
      <div className="px-4 pr-16 md:px-6 pb-2 pt-1 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent shrink-0">
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

          <div className={`flex flex-col bg-[var(--bg-panel)] border border-white/[0.05] transition-all duration-200 overflow-hidden shadow-none ${showAutocomplete && autocompleteResults.length > 0 ? 'rounded-b-[6px] rounded-t-none' : 'rounded-[6px]'}`}>
            {/* Top Row: Auto-growing Textarea */}
            <textarea 
              ref={textareaRef}
              rows={1}
              value={query}
              onChange={handleInput}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything across your knowledge base..."
              className="w-full bg-transparent border-none outline-none text-[13px] font-normal text-[var(--text-main)] py-2.5 px-3.5 placeholder-[var(--text-muted)]/60 resize-none leading-relaxed overflow-y-auto custom-scrollbar max-h-40"
              autoComplete="off"
              spellCheck="false"
            />

            {/* Bottom Row: Actions & Model Pill */}
            <div className="flex items-center justify-between px-2 pb-2 pt-0 select-none border-0">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'data' } }))}
                  className="p-1 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors border-0"
                  title="Upload Data (Settings)"
                >
                  <Plus size={14} />
                </button>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleNewSession}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-[4px] hover:bg-[var(--bg-active)] text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors animate-in fade-in duration-200 border-0"
                    title="Clear chat history and start a new session"
                  >
                    <RotateCcw size={12} />
                    <span>New session</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleRag}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] text-[10.5px] font-mono font-medium transition-colors border-0 ${
                    enableRag
                      ? 'bg-[var(--text-accent)]/15 text-[var(--text-accent)] hover:bg-[var(--text-accent)]/25'
                      : 'hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                  title={enableRag ? 'RAG Synthesis Enabled (Click to toggle)' : 'RAG Synthesis Disabled (Click to toggle)'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${enableRag ? 'bg-[var(--text-accent)]' : 'bg-[var(--text-muted)] opacity-50'}`} />
                  <span>RAG: {enableRag ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  className="p-1 rounded-[4px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors border-0"
                  title="Voice Search"
                >
                  <Mic size={14} />
                </button>
                <button 
                  onClick={submitSearch}
                  disabled={!query || query.trim() === ''}
                  className="w-6 h-6 rounded-[4px] bg-[var(--text-accent)] hover:opacity-90 text-white disabled:opacity-30 transition-all duration-150 flex items-center justify-center shadow-none border-0 shrink-0"
                  title="Send message"
                >
                  <ArrowUp size={14} strokeWidth={2.5} />
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
