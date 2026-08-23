import React, { useState, useEffect } from 'react'
import { Book, FileText, Code, Database, Search, Library as LibraryIcon, X, FileSpreadsheet, FileJson, File, Calendar, Clock, Trash2, History, Copy, Check, Sparkles, Star } from 'lucide-react'
import Preview from '../search/Preview'
import PulseLoader from '../PulseLoader'
import ConfirmModal from '../layout/ConfirmModal'



const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric' 
  }).format(d)
}

const Highlight = ({ text, query }) => {
  if (!query || !text) return <span>{text || ''}</span>
  try {
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="bg-[var(--text-accent)]/20 text-[var(--text-accent)] rounded-[2px] px-0.5 font-bold">{part}</mark> 
            : <span key={i}>{part}</span>
        )}
      </span>
    )
  } catch (e) {
    return <span>{text}</span>
  }
}

const cleanSnippetText = (snippet) => {
  let clean = snippet ? snippet.trim().replace(/\n{3,}/g, '\n\n') : ''
  if (clean) {
    clean = clean
      .replace(/^#+\s+/gm, '') // Remove headers
      .replace(/```[^\n]*\n?/g, '') // Remove multi-line code block wrappers and languages
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
      .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough
      .replace(/`(.*?)`/g, '$1') // Remove inline code wrappers
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just text
      .replace(/^\s*[-*+]\s+/gm, '• ') // Make lists look nice
  }
  clean = clean.trim()
  return clean.length > 400 ? clean.slice(0, 400) + '...' : clean
}

const MyLibrary = () => {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [fullText, setFullText] = useState('')
  const [loadingText, setLoadingText] = useState(false)
  const [fileExists, setFileExists] = useState(true)
  
  // Search & Filter State
  const [search, setSearch] = useState('')
  const deferredSearch = React.useDeferredValue(search)
  const [searchResults, setSearchResults] = useState(null)
  const [isDeepSearching, setIsDeepSearching] = useState(false)
  const [visibleCount, setVisibleCount] = useState(50)
  const [sortOrder, setSortOrder] = useState('newest')
  const [layout, setLayout] = useState('grid-large') // 'grid-large', 'grid-small', 'list'
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [activeFileType, setActiveFileType] = useState('all')
  const [recentSearches, setRecentSearches] = useState([])
  const [isFocused, setIsFocused] = useState(false)
  const searchInputRef = React.useRef(null)
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState(null)

  // Load preferences
  useEffect(() => {
    if (window.api?.config?.get) {
      window.api.config.get('librarySortOrder', 'newest').then(v => setSortOrder(v))
      window.api.config.get('libraryLayout', 'grid-large').then(v => setLayout(v))
    }
  }, [])

  const handleSetSortOrder = (val) => {
    setSortOrder(val)
    if (window.api?.config?.set) window.api.config.set('librarySortOrder', val)
  }

  const handleSetLayout = (val) => {
    setLayout(val)
    if (window.api?.config?.set) window.api.config.set('libraryLayout', val)
  }

  const fileTypeCounts = React.useMemo(() => {
    const counts = { all: documents.length }
    documents.forEach(d => {
      const t = (d.file_type || '').toLowerCase()
      if (t) {
        counts[t] = (counts[t] || 0) + 1
      }
    })
    return counts
  }, [documents])

  const fileTypes = React.useMemo(() => {
    return Object.keys(fileTypeCounts).sort((a, b) => {
      if (a === 'all') return -1
      if (b === 'all') return 1
      return a.localeCompare(b)
    })
  }, [fileTypeCounts])

  // Deletion State
  const [docToDelete, setDocToDelete] = useState(null)

  const confirmDelete = async () => {
    if (!docToDelete) return
    try {
      await window.api.db.query('DELETE FROM documents WHERE id = $1', [docToDelete.id])
      setDocuments(prev => prev.filter(d => d.id !== docToDelete.id))
      if (searchResults) {
        setSearchResults(prev => prev.filter(d => d.id !== docToDelete.id))
      }
    } catch (err) {
      console.error('Failed to delete document:', err)
    } finally {
      setDocToDelete(null)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  // Fetch recent searches
  const fetchRecentSearches = async (q = '') => {
    try {
      const query = q
        ? `SELECT query_text FROM search_logs WHERE query_text ILIKE $1 GROUP BY query_text ORDER BY MAX(created_at) DESC LIMIT 20`
        : `SELECT query_text FROM search_logs GROUP BY query_text ORDER BY MAX(created_at) DESC LIMIT 20`
      const res = await window.api.db.query(query, q ? [`%${q}%`] : [])
      if (res && Array.isArray(res.rows)) {
        setRecentSearches(res.rows.map(r => r.query_text))
      }
    } catch (e) {
      console.error('Failed to fetch recent searches:', e)
    }
  }

  // Deep Content Search from Database (Fast Debounce)
  useEffect(() => {
    const s = search.trim()
    if (s.length < 2) {
      setSearchResults(null)
      setIsDeepSearching(false)
      return
    }

    let isMounted = true
    setIsDeepSearching(true)
    setSearchResults([]) // Clear to trigger the loading pulse in the grid

    const timer = setTimeout(async () => {
      try {
        // Use the advanced Hybrid Search (Semantic + FTS + Trigram RRF)
        const res = await window.api.db.search(s.trim(), 50)
        if (isMounted && res && Array.isArray(res.rows)) {
          // search_chunks returns CHUNKS, we need unique DOCUMENTS for the library grid
          const uniqueDocs = []
          const seenDocs = new Set()
          
          for (const row of res.rows) {
            if (!seenDocs.has(row.document_id)) {
              seenDocs.add(row.document_id)
              uniqueDocs.push({
                id: row.document_id,
                file_name: row.file_name,
                file_type: row.file_type,
                vault_path: row.vault_path,
                created_at: row.created_at,
                file_size: row.file_size || 0,
                snippet: row.content
              })
            }
          }
          setSearchResults(uniqueDocs)
        } else if (isMounted) {
          setSearchResults([])
        }
      } catch (err) {
        console.error('Hybrid search error:', err)
        if (isMounted) setSearchResults([])
      } finally {
        if (isMounted) setIsDeepSearching(false)
      }
    }, 250) // Slightly longer debounce (250ms) to allow typing before LLM embedding call

    return () => { 
      isMounted = false
      clearTimeout(timer)
    }
  }, [search])

  // Ctrl+F or Ctrl+/ to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'f' || e.key === '/')) {
        if (!selectedDoc) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDoc])

  const fetchDocuments = async (retryCount = 0) => {
    if (retryCount === 0) setLoading(true)
    try {
      const res = await window.api.db.query('SELECT id, file_name, file_type, vault_path, created_at, file_size, SUBSTRING(content, 1, 300) as snippet FROM documents ORDER BY created_at DESC')
      
      // IPC returns { success: false } instead of throwing if DB not connected
      if (!res || res.success === false || (!res.rows && !Array.isArray(res))) {
        throw new Error(res?.message || 'Database not ready')
      }

      if (res.rows) {
        setDocuments(res.rows)
      } else if (Array.isArray(res)) {
        setDocuments(res)
      }
      setLoading(false)
    } catch (err) {
      if (err.message === 'Not connected') {
        console.log('Documents not ready yet, retrying... (Waiting for DB connection)')
      } else {
        console.warn('Documents not ready yet, retrying...', err.message)
      }
      if (retryCount < 5) {
        setTimeout(() => fetchDocuments(retryCount + 1), 500)
      } else {
        setLoading(false)
      }
    }
  }

  const handleOpenDoc = async (doc) => {
    const mapped = {
      id: doc.id,
      document_id: doc.id,
      title: doc.file_name || 'Untitled Document',
      category: doc.file_type ? doc.file_type.toUpperCase() : 'UNKNOWN',
      vault_path: doc.vault_path
    }
    setSelectedDoc(mapped)
    setLoadingText(true)
    
    if (window.api.system && window.api.system.fileExists) {
      const exists = await window.api.system.fileExists(doc.vault_path)
      setFileExists(exists)
    } else {
      setFileExists(true)
    }

    try {
      const res = await window.api.db.query('SELECT content FROM documents WHERE id = $1', [doc.id])
      const rows = res.rows || res
      if (rows && rows[0] && rows[0].content) {
        setFullText(rows[0].content)
      } else {
        setFullText('')
      }
    } catch (e) {
      setFullText('')
    } finally {
      setLoadingText(false)
    }
  }

  const handleCloseDoc = () => {
    setSelectedDoc(null)
    setFullText('')
  }

  const filteredDocs = React.useMemo(() => {
    const baseDocs = Array.isArray(searchResults) ? searchResults : (Array.isArray(documents) ? documents : [])
    
    // Apply file type filter
    const typeFiltered = activeFileType === 'all' 
      ? baseDocs 
      : baseDocs.filter(d => (d.file_type || '').toLowerCase() === activeFileType)

    // CRITICAL: If we have AI search results, DO NOT re-sort them. 
    // They are already perfectly ordered by Hybrid RRF Semantic Similarity.
    if (searchResults !== null) {
      return typeFiltered
    }

    return [...typeFiltered].sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      if (sortOrder === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      if (sortOrder === 'az') return (a.file_name || '').localeCompare(b.file_name || '')
      if (sortOrder === 'za') return (b.file_name || '').localeCompare(a.file_name || '')
      if (sortOrder === 'size') return (b.file_size || 0) - (a.file_size || 0)
      return 0
    })
  }, [documents, searchResults, sortOrder, activeFileType])

  useEffect(() => {
    setVisibleCount(50)
  }, [deferredSearch, sortOrder])

  const renderThumbnail = (doc) => {
    const type = (doc.file_type || '').toLowerCase()
    const snippet = cleanSnippetText(doc.snippet, type)
    const isCode = ['json', 'py', 'js', 'html', 'css', 'ts', 'jsx', 'tsx'].includes(type)

    if (snippet) {
      return (
        <div className={`w-full h-full flex flex-col p-4 relative overflow-hidden ${isCode ? 'bg-[#1e1e1e]' : 'bg-[var(--bg-app)]'}`}>
          {/* File Type Badge */}
          <div className={`absolute bottom-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10 uppercase tracking-wider backdrop-blur-md border ${
            (type === 'ai_response' || type === 'ai') 
              ? 'bg-[#a855f7]/20 text-[#c084fc] border-[#a855f7]/30' 
              : 'bg-black/40 text-white/90 border-white/10'
          }`}>
            {type || 'TXT'}
          </div>
          
          <div className={`text-[10px] leading-[1.6] whitespace-pre-wrap break-words line-clamp-4 ${isCode ? 'text-[#d4d4d4]/80 font-mono' : 'text-[var(--text-muted)] font-sans'}`}>
            <Highlight text={snippet} query={search} />
          </div>
          <div className={`absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t ${isCode ? 'from-[#1e1e1e]' : 'from-[var(--bg-app)]'} to-transparent pointer-events-none`} />
        </div>
      )
    }

    return (
      <div className="w-full h-full bg-[var(--bg-app)] flex flex-col items-center justify-center p-3 relative text-[var(--text-faint)]">
        <File size={24} className="mb-2 opacity-20" />
        <span className="text-[10px] font-medium opacity-50 uppercase tracking-wider">{type || 'Document'}</span>
      </div>
    )
  }

  // ── All hooks must be ABOVE any early return ──
  const [activeIndex, setActiveIndex] = React.useState(-1)
  const dropdownRef = React.useRef(null)

  React.useEffect(() => { setActiveIndex(-1) }, [searchResults, recentSearches, search])

  const dropdownItems = React.useMemo(() => {
    if (!search) return recentSearches.map(rs => ({ type: 'recent', value: rs }))
    return (searchResults || []).slice(0, 10).map(doc => ({ type: 'doc', value: doc }))
  }, [search, searchResults, recentSearches])

  const deleteOneHistory = async (queryText, e) => {
    e.stopPropagation()
    try {
      await window.api.db.query('DELETE FROM search_logs WHERE query_text = $1', [queryText])
      setRecentSearches(prev => prev.filter(r => r !== queryText))
    } catch (err) { console.error('Delete history error:', err) }
  }

  const deleteAllHistory = async (e) => {
    e.stopPropagation()
    try {
      await window.api.db.query('DELETE FROM search_logs', [])
      setRecentSearches([])
    } catch (err) { console.error('Clear history error:', err) }
  }

  if (selectedDoc) {
    return (
      <div className="flex flex-col w-full h-full bg-[var(--bg-app)] animate-in fade-in duration-200">
        <div className="flex-1 min-h-0 relative">
          <Preview
            selectedPdf={selectedDoc}
            fullText={fullText}
            loadingText={loadingText}
            onClose={handleCloseDoc}
            fileExists={fileExists}
          />
        </div>
      </div>
    )
  }

  const sortOptions = [
    { id: 'newest', label: 'Newest' },
    { id: 'oldest', label: 'Oldest' },
    { id: 'az', label: 'A-Z' },
    { id: 'za', label: 'Z-A' },
    { id: 'size', label: 'Size' }
  ]

  const handleKeyDown = (e) => {
    if (!isFocused || dropdownItems.length === 0) {
      if (e.key === 'Enter' && search.trim().length > 0) {
        setIsFocused(false)
        window.api.db.query('INSERT INTO search_logs (query_text, latency_ms, result_count) VALUES ($1, 0, 0)', [search.trim()]).catch(() => {})
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => {
        const next = Math.min(i + 1, dropdownItems.length - 1)
        dropdownRef.current?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => {
        const next = Math.max(i - 1, 0)
        dropdownRef.current?.querySelector(`[data-idx="${next}"]`)?.scrollIntoView({ block: 'nearest' })
        return next
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < dropdownItems.length) {
        const item = dropdownItems[activeIndex]
        if (item.type === 'recent') {
          setSearch(item.value)
          setIsFocused(false)
        } else {
          handleOpenDoc(item.value)
          setIsFocused(false)
          window.api.db.query('INSERT INTO search_logs (query_text, latency_ms, result_count) VALUES ($1, 0, 0)', [search.trim()]).catch(() => {})
        }
      } else if (search.trim().length > 0) {
        setIsFocused(false)
        window.api.db.query('INSERT INTO search_logs (query_text, latency_ms, result_count) VALUES ($1, 0, 0)', [search.trim()]).catch(() => {})
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false)
    }
  }

  return (
    <div className="flex flex-col w-full h-full bg-[var(--bg-app)] relative">
      <ConfirmModal
        isOpen={!!docToDelete}
        title="Remove Document"
        message={`Are you sure you want to remove "${docToDelete?.file_name}" from the database? The physical file will remain untouched on your machine.`}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDocToDelete(null)}
      />
      {/* ── STICKY/FIXED HEADER ── */}
      <div className="w-full z-40 bg-[var(--bg-app)] pt-6 pb-2 px-6 lg:px-10 shadow-none border-b border-white/[0.02]">
        <div className="max-w-4xl mx-auto flex flex-col items-center animate-in slide-in-from-top-2 duration-300 gap-4">
          
          {/* Oily, Compact Search Input */}
          <div 
            className="relative w-full group" 
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsFocused(false)
                setActiveIndex(-1)
              }
            }}
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
              <Search size={15} className="text-[var(--text-muted)] group-focus-within:text-[var(--text-main)] transition-colors" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search documents by name, type, or deep content..."
              value={search}
              onFocus={() => { setIsFocused(true); fetchRecentSearches(search) }}
              onChange={(e) => {
                setSearch(e.target.value)
                fetchRecentSearches(e.target.value)
              }}
              onKeyDown={handleKeyDown}
              className="relative z-10 w-full pl-10 pr-16 py-2.5 bg-[var(--bg-panel)] border-0 border-transparent focus:ring-0 focus:outline-none rounded-none text-[13px] font-medium text-[var(--text-main)] placeholder-[var(--text-muted)]/50 transition-all duration-300 shadow-[0_4px_15px_-5px_rgba(0,0,0,0.2)]"
            />
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5 z-10">
              {search ? (
                <button
                  onClick={() => { setSearch(''); searchInputRef.current?.focus() }}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-none transition-colors border-0"
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-2 py-1 bg-[var(--text-muted)]/10 text-[9px] font-bold text-[var(--text-muted)]/70 tracking-widest font-mono uppercase border-0 pointer-events-none mr-2 rounded-none">
                  Ctrl F
                </kbd>
              )}
            </div>

            {/* DROPDOWN */}
            {isFocused && dropdownItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div ref={dropdownRef} className="max-h-[280px] overflow-y-auto custom-scrollbar py-2">
                  {!search ? (
                    <>
                      <div className="px-4 py-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Recent Searches</span>
                        {recentSearches.length > 0 && (
                          <button
                            onMouseDown={(e) => { e.preventDefault(); deleteAllHistory(e) }}
                            className="text-[10px] text-[var(--text-faint)] hover:text-red-400 transition-colors flex items-center gap-1 font-medium"
                          >
                            <Trash2 size={11} />
                            Clear all
                          </button>
                        )}
                      </div>
                      {dropdownItems.map((item, i) => (
                        <div
                          key={i}
                          data-idx={i}
                          onMouseEnter={() => setActiveIndex(i)}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setSearch(item.value)
                            setIsFocused(false)
                          }}
                          className={`px-4 py-2 flex items-center gap-2 cursor-pointer transition-colors ${activeIndex === i ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-active)]'}`}
                        >
                          <History size={13} className="text-[var(--text-muted)]" />
                          <span className="text-[12.5px] font-medium text-[var(--text-main)] truncate flex-1">{item.value}</span>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); deleteOneHistory(item.value, e) }}
                            className="p-1 opacity-0 hover:opacity-100 focus:opacity-100 group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {dropdownItems.map((item, i) => {
                        const doc = item.value
                        return (
                          <button
                            key={doc.id}
                            data-idx={i}
                            onMouseEnter={() => setActiveIndex(i)}
                            className={`w-full text-left px-4 py-2.5 flex gap-3 cursor-pointer transition-colors border-0 outline-none ${activeIndex === i ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-active)]'}`}
                            onMouseDown={(e) => {
                              e.preventDefault()
                              handleOpenDoc(doc)
                              setIsFocused(false)
                              window.api.db.query('INSERT INTO search_logs (query_text, latency_ms, result_count) VALUES ($1, 0, 0)', [search.trim()]).catch(() => {})
                            }}
                          >
                            <FileText size={15} className="text-[var(--text-muted)] shrink-0 mt-0.5" />
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                              <span className="text-[13px] font-semibold text-[var(--text-main)] truncate">
                                {doc.file_name}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex items-center justify-between w-full max-w-4xl mx-auto gap-4">
            
            <div className="flex-1 overflow-x-auto flex items-center gap-1.5 pr-4 mask-image-right [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {fileTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActiveFileType(type)}
                  className={`shrink-0 px-3 py-1.5 rounded-[5px] text-[11px] font-bold tracking-wide capitalize transition-all duration-300 border-0 flex items-center gap-1.5 ${
                    activeFileType === type
                      ? 'bg-[var(--text-accent)]/15 text-[var(--text-accent)] shadow-[0_2px_10px_rgba(0,0,0,0.15)] opacity-100'
                      : 'bg-[var(--bg-panel)] text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] hover:opacity-100 opacity-60 shadow-sm hover:shadow-md'
                  }`}
                >
                  <span>{type === 'all' ? 'All Files' : type}</span>
                  <span className={`text-[9px] px-1.5 rounded-full ${activeFileType === type ? 'bg-[var(--text-accent)]/20 text-[var(--text-accent)]' : 'bg-black/10 text-[var(--text-muted)]'}`}>
                    {fileTypeCounts[type]}
                  </span>
                </button>
              ))}
            </div>

            {/* Sort Options & Layout Toggler (Right Aligned) */}
            <div className="shrink-0 flex items-center gap-2 relative">
              
              {/* Layout Toggles */}
              <div className="flex items-center bg-[var(--bg-panel)] rounded-[5px] p-0.5 shadow-sm">
                <button
                  onClick={() => handleSetLayout('grid-large')}
                  className={`p-1.5 rounded-[4px] transition-colors ${layout === 'grid-large' ? 'bg-[var(--bg-active)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                  title="Large Grid"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
                </button>
                <button
                  onClick={() => handleSetLayout('grid-small')}
                  className={`p-1.5 rounded-[4px] transition-colors ${layout === 'grid-small' ? 'bg-[var(--bg-active)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                  title="Small Grid"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="4" height="4" x="3" y="3" rx="1"/><rect width="4" height="4" x="10" y="3" rx="1"/><rect width="4" height="4" x="17" y="3" rx="1"/><rect width="4" height="4" x="3" y="10" rx="1"/><rect width="4" height="4" x="10" y="10" rx="1"/><rect width="4" height="4" x="17" y="10" rx="1"/><rect width="4" height="4" x="3" y="17" rx="1"/><rect width="4" height="4" x="10" y="17" rx="1"/><rect width="4" height="4" x="17" y="17" rx="1"/></svg>
                </button>
                <button
                  onClick={() => handleSetLayout('list')}
                  className={`p-1.5 rounded-[4px] transition-colors ${layout === 'list' ? 'bg-[var(--bg-active)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                  title="List View"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
                </button>
              </div>

              <button
                onClick={() => !searchResults && setIsSortOpen(!isSortOpen)}
                disabled={searchResults !== null}
                className={`bg-[var(--bg-panel)] text-[11px] font-bold text-[var(--text-muted)] border-0 rounded-[5px] px-3 py-1.5 outline-none transition-all shadow-sm flex items-center gap-2 ${
                  searchResults !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] hover:shadow-md'
                }`}
              >
                {sortOptions.find(o => o.id === sortOrder)?.label || 'Sort'}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${isSortOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
              </button>

              {isSortOpen && searchResults === null && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsSortOpen(false)} />
                  <div className="absolute top-full right-0 mt-2 bg-[var(--bg-panel)] border border-white/[0.04] rounded-[5px] shadow-xl z-50 overflow-hidden w-36 py-1 animate-in fade-in slide-in-from-top-1">
                    {sortOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          handleSetSortOrder(opt.id)
                          setIsSortOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-[11px] font-bold transition-colors ${
                          sortOrder === opt.id 
                            ? 'bg-[var(--text-accent)]/10 text-[var(--text-accent)]' 
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE GRID ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 pb-32 lg:px-10 lg:py-8 lg:pb-40">
        <div className="max-w-6xl mx-auto space-y-6">

          {loading ? (
            <div className="py-20 flex justify-center">
              <PulseLoader text="Loading Library" size="sm" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-muted)] text-[13px] font-medium">
              {isDeepSearching ? (
                <div className="flex flex-col items-center justify-center space-y-4 animate-in fade-in">
                  <PulseLoader text="Searching library..." size="md" />
                </div>
              ) : (
                'No documents found matching your search.'
              )}
            </div>
          ) : (
            <>
              <div 
                className={`grid transition-opacity duration-200 ${
                  layout === 'grid-large' 
                    ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                    : layout === 'grid-small'
                    ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                    : 'grid-cols-1 gap-2'
                }`}
                style={{ opacity: deferredSearch !== search ? 0.6 : 1 }}
              >
                {filteredDocs.slice(0, visibleCount).map((doc, idx) => {
                  return (
                    <div
                      key={doc.id || idx}
                      onClick={() => handleOpenDoc(doc)}
                      className={`group relative flex bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] rounded-[5px] transition-colors duration-200 cursor-pointer overflow-hidden shadow-sm hover:shadow-md border border-white/[0.02] ${
                        layout === 'list' ? 'flex-row items-center p-3 gap-4' : 'flex-col'
                      }`}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 200px', contain: 'layout paint' }}
                    >
                      {/* Hover Actions */}
                      <div
                        className={`absolute flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all z-20 ${
                           layout === 'list' ? 'right-4 top-1/2 -translate-y-1/2' : 'bottom-2 right-2'
                        }`}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Toggle local star (dummy UI state)
                            e.currentTarget.classList.toggle('text-yellow-400')
                            e.currentTarget.classList.toggle('text-white/50')
                          }}
                          className="p-1.5 bg-black/40 backdrop-blur-md text-white/50 hover:text-yellow-400 hover:bg-black/60 rounded-md border-0 shadow-lg transition-colors"
                          title="Star / Bookmark"
                        >
                          <Star size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(doc.vault_path)
                            setCopiedId(doc.id)
                            setTimeout(() => setCopiedId(null), 2000)
                          }}
                          className="p-1.5 bg-black/40 backdrop-blur-md text-white/50 hover:text-white hover:bg-black/60 rounded-md border-0 shadow-lg transition-colors"
                          title="Copy File Path"
                        >
                          {copiedId === doc.id ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDocToDelete(doc)
                          }}
                          className="p-1.5 bg-black/40 backdrop-blur-md text-white/50 hover:text-red-400 hover:bg-red-500/20 rounded-md border-0 shadow-lg transition-colors"
                          title="Remove from database"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* List View Icon */}
                      {layout === 'list' && (
                        <div className="h-10 w-10 shrink-0 bg-white/5 rounded-[5px] flex items-center justify-center border border-white/5">
                           <FileText size={18} className="text-[var(--text-muted)]" />
                        </div>
                      )}

                      {/* Metadata Top */}
                      <div className={`flex flex-col bg-transparent ${layout === 'list' ? 'flex-1 min-w-0 pr-24' : 'p-3 gap-1.5 z-10'}`}>
                        <div className="flex items-center gap-2 overflow-hidden">
                          <h3 className="text-[13px] font-bold text-[var(--text-main)] truncate" title={doc.file_name}>
                            {doc.file_name}
                          </h3>
                          {doc.vault_path?.includes('ai-response') && (
                            <Sparkles size={11} className="text-yellow-400 shrink-0" title="AI Summary / Deep Match" />
                          )}
                        </div>
                        <div className={`flex text-[10px] font-medium text-[var(--text-muted)]/70 ${layout === 'list' ? 'gap-4 mt-0.5 items-center' : 'justify-between items-center'}`}>
                          <span className="tracking-wider shrink-0">{formatDate(doc.created_at)}</span>
                          
                          {/* Breadcrumb Path */}
                          {layout !== 'list' && doc.vault_path && (
                            <span className="font-mono text-[9px] opacity-40 truncate mx-2 min-w-0 flex-1 text-center" title={doc.vault_path}>
                              {doc.vault_path.split(/[/\\]/).slice(-2).join(' > ')}
                            </span>
                          )}

                          {doc.file_size > 0 && <span className="font-mono shrink-0 ml-auto">{formatBytes(doc.file_size)}</span>}
                        </div>
                      </div>

                      {/* Thumbnail Preview Area */}
                      {layout === 'grid-large' && (
                        <div className="h-[140px] w-full border-t border-black/10 bg-black/30 overflow-hidden relative" style={{ contain: 'layout paint' }}>
                          {renderThumbnail(doc)}
                        </div>
                      )}
                      
                      {layout === 'grid-small' && (
                        <div className="h-[70px] w-full border-t border-black/10 bg-black/30 overflow-hidden relative opacity-70" style={{ contain: 'layout paint' }}>
                          {renderThumbnail(doc)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Pagination / Load More */}
            {visibleCount < filteredDocs.length && (
              <div className="flex justify-center mt-8 pb-10 gap-3">
                {visibleCount > 50 && (
                  <button 
                    onClick={() => setVisibleCount(50)}
                    className="px-5 py-2.5 rounded-[5px] bg-[var(--bg-panel)] border border-transparent hover:bg-white/[0.04] text-[13px] font-medium text-[var(--text-main)] transition-colors shadow-sm"
                  >
                    Show Less
                  </button>
                )}
                <button 
                  onClick={() => setVisibleCount(prev => Math.min(prev + 50, filteredDocs.length))}
                  className="px-5 py-2.5 rounded-[5px] bg-[var(--text-accent)]/10 border border-transparent hover:bg-[var(--text-accent)]/20 text-[var(--text-accent)] text-[13px] font-semibold transition-colors shadow-sm"
                >
                  Show More ({filteredDocs.length - visibleCount} remaining)
                </button>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default MyLibrary
