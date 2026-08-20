import React, { useState, useEffect } from 'react'
import { Book, FileText, Code, Database, Search, Library as LibraryIcon, X, FileSpreadsheet, FileJson, File, Calendar, Clock, Trash2 } from 'lucide-react'
import Preview from '../search/Preview'
import PulseLoader from '../PulseLoader'

const getFileMeta = (type) => {
  const t = (type || '').toLowerCase()
  if (t === 'pdf') return { icon: Book, color: 'text-red-400', bg: 'bg-red-400/10', gradient: 'from-red-500/20 to-transparent', border: 'border-red-500/20' }
  if (t === 'json') return { icon: FileJson, color: 'text-blue-400', bg: 'bg-blue-400/10', gradient: 'from-blue-500/20 to-transparent', border: 'border-blue-500/20' }
  if (t === 'md') return { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-400/10', gradient: 'from-amber-500/20 to-transparent', border: 'border-amber-500/20' }
  if (t === 'txt') return { icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-400/10', gradient: 'from-emerald-500/20 to-transparent', border: 'border-emerald-500/20' }
  if (t === 'csv' || t === 'xlsx') return { icon: FileSpreadsheet, color: 'text-green-400', bg: 'bg-green-400/10', gradient: 'from-green-500/20 to-transparent', border: 'border-green-500/20' }
  return { icon: File, color: 'text-gray-400', bg: 'bg-gray-400/10', gradient: 'from-gray-500/20 to-transparent', border: 'border-gray-500/20' }
}

const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
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
  return clean.trim()
}

const MyLibrary = () => {
  const [documents, setDocuments] = useState([])
  const [searchResults, setSearchResults] = useState(null)
  const [isDeepSearching, setIsDeepSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [isFocused, setIsFocused] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const deferredSearch = React.useDeferredValue(search)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [fullText, setFullText] = useState('')
  const [fileExists, setFileExists] = useState(true)
  const [loadingText, setLoadingText] = useState(false)
  const [visibleCount, setVisibleCount] = useState(50)
  const [sortOrder, setSortOrder] = useState('newest')
  const searchInputRef = React.useRef(null)

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

    const timer = setTimeout(async () => {
      try {
        // Build a robust wildcard search that ignores newlines/extra spaces between words
        const wildcardStr = `%${s.split(/\s+/).join('%')}%`
        
        // Search inside filenames, types, and raw file content (Deep Search)
        const query = `
          SELECT id, file_name, file_type, vault_path, created_at, file_size, SUBSTRING(content, 1, 300) as snippet 
          FROM documents 
          WHERE file_name ILIKE $1 OR file_type ILIKE $1 OR content ILIKE $1
          ORDER BY created_at DESC
          LIMIT 250
        `
        const res = await window.api.db.query(query, [wildcardStr])
        if (isMounted) {
          if (res && Array.isArray(res.rows)) {
            setSearchResults(res.rows)
          } else if (Array.isArray(res)) {
            setSearchResults(res)
          } else {
            setSearchResults([])
          }
        }
      } catch (err) {
        console.error('Deep search error:', err)
      } finally {
        if (isMounted) setIsDeepSearching(false)
      }
    }, 150) // Snappy 150ms debounce

    return () => { 
      isMounted = false
      clearTimeout(timer)
    }
  }, [search])

  // Ctrl+F to focus search input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        if (!selectedDoc) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedDoc])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const res = await window.api.db.query('SELECT id, file_name, file_type, vault_path, created_at, file_size, SUBSTRING(content, 1, 300) as snippet FROM documents ORDER BY created_at DESC')
      if (res && res.rows) {
        setDocuments(res.rows)
      } else if (Array.isArray(res)) {
        setDocuments(res)
      }
    } catch (err) {
      console.error('Error fetching documents', err)
    } finally {
      setLoading(false)
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
    const s = deferredSearch.toLowerCase()
    
    let result = baseDocs
    
    // Fallback local filter if search results are null but user typed 1 character
    if (searchResults === null && s.length > 0) {
      result = baseDocs.filter(d => 
        (d.file_name || '').toLowerCase().includes(s) || 
        (d.file_type || '').toLowerCase().includes(s)
      )
    }

    const safeResult = Array.isArray(result) ? result : []

    return [...safeResult].sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      if (sortOrder === 'oldest') return new Date(a.created_at || 0) - new Date(b.created_at || 0)
      if (sortOrder === 'az') return (a.file_name || '').localeCompare(b.file_name || '')
      if (sortOrder === 'za') return (b.file_name || '').localeCompare(a.file_name || '')
      if (sortOrder === 'size') return (b.file_size || 0) - (a.file_size || 0)
      return 0
    })
  }, [documents, searchResults, deferredSearch, sortOrder])

  useEffect(() => {
    setVisibleCount(50)
  }, [deferredSearch, sortOrder])

  const renderThumbnail = (doc) => {
    const type = (doc.file_type || '').toLowerCase()
    const snippet = cleanSnippetText(doc.snippet, type)

    if (type === 'pdf') {
      return (
        <div className="w-full h-full bg-red-500/[0.03] flex flex-col items-center justify-center p-4 relative overflow-hidden">
          <div className="text-red-500/40 text-[14px] font-black tracking-widest uppercase mb-2 border border-red-500/20 px-3 py-1 rounded-[3px]">
            PDF
          </div>
          {snippet && (
            <div className="text-[5.5px] text-red-500/40 font-mono leading-[1.4] text-center line-clamp-4 max-w-[80%] break-words">
              {snippet}
            </div>
          )}
        </div>
      )
    } 

    if (type === 'json') {
      return (
        <div className="w-full h-full bg-[#1e1e1e] flex flex-col p-3 relative overflow-hidden">
          <div className="text-[6px] text-yellow-500/60 font-mono leading-[1.6] whitespace-pre-wrap break-words">
            {snippet || '{}'}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1e1e1e] to-transparent pointer-events-none" />
        </div>
      )
    }

    // Default text preview for MD, TXT, CSV, or any file that has text content
    if (snippet) {
      return (
        <div className="w-full h-full bg-[var(--bg-app)] flex flex-col p-3 relative overflow-hidden">
          <div className="text-[5.5px] text-[var(--text-muted)]/70 font-mono leading-[1.6] whitespace-pre-wrap break-words">
            {snippet}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--bg-app)] to-transparent pointer-events-none" />
        </div>
      )
    }

    // Absolute fallback if the document truly has no text content
    return (
      <div className="w-full h-full bg-[var(--bg-app)] flex items-center justify-center">
        <span className="text-[12px] font-mono text-[var(--text-muted)]/30 uppercase tracking-widest">{type || 'DOC'}</span>
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
        <div className="flex items-center justify-between px-4 py-2 shrink-0 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseDoc}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[4px] hover:bg-white/[0.05] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0 text-[11px] font-semibold tracking-wide"
            >
              <LibraryIcon size={13} />
              Back to Library
            </button>
            <div className="w-px h-3.5 bg-[var(--border-subtle)]" />
            <span className="text-[11px] text-[var(--text-muted)] font-medium tracking-tight">Read Mode</span>
          </div>
        </div>
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
    <div className="flex flex-col w-full h-full bg-[var(--bg-app)]">
      {/* ── STICKY/FIXED HEADER ── */}
      <div className="w-full z-40 bg-[var(--bg-app)] pt-6 pb-4 px-6 lg:px-10 shadow-sm border-b border-transparent">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center animate-in slide-in-from-bottom-2 duration-300">
          <h1 className="text-xl font-black tracking-tight text-[var(--text-main)] mb-6">
            My Library
          </h1>
          
          {/* Minimalist Flat Search Input */}
          <div 
            className="relative w-full max-w-2xl group" 
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setIsFocused(false)
                setActiveIndex(-1)
              }
            }}
          >
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
              <Search size={14} className="text-[var(--text-muted)] group-focus-within:text-[var(--text-main)] transition-colors" />
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
              className="relative z-10 w-full pl-9 pr-14 py-2.5 bg-[var(--bg-panel)] border border-transparent focus:border-transparent focus:ring-0 rounded-[5px] text-[13px] font-medium text-[var(--text-main)] placeholder-[var(--text-muted)]/50 focus:outline-none transition-none shadow-none"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1.5 z-10">
              {isDeepSearching && (
                <div className="flex gap-1 mr-2 opacity-50">
                  {[0,1,2].map(i => <div key={i} className="w-1 h-1 rounded-full bg-[var(--text-accent)] animate-pulse" style={{ animationDelay: `${i*150}ms` }} />)}
                </div>
              )}
              {search ? (
                <button
                  onClick={() => { setSearch(''); searchInputRef.current?.focus() }}
                  className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-[3px] transition-colors"
                >
                  <X size={13} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-[3px] border border-transparent bg-[var(--bg-app)] text-[9px] font-bold text-[var(--text-muted)]/50 tracking-widest font-mono uppercase shadow-none pointer-events-none">
                  Ctrl F
                </kbd>
              )}
            </div>

            {/* DROPDOWN */}
            {isFocused && dropdownItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-[8px] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
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
                          className={`w-full text-left px-4 py-2 flex items-center gap-3 transition-colors group/item ${activeIndex === i ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-active)]'}`}
                          onMouseDown={(e) => {
                            e.preventDefault() // ← prevents input blur firing first
                            setSearch(item.value)
                            setActiveIndex(-1)
                            setIsFocused(true)
                            searchInputRef.current?.focus()
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <Clock size={13} className="text-[var(--text-faint)] shrink-0" />
                          <span className="text-[13px] font-medium text-[var(--text-main)] truncate flex-1">{item.value}</span>
                          <button
                            onMouseDown={(e) => { e.preventDefault(); deleteOneHistory(item.value, e) }}
                            className="opacity-0 group-hover/item:opacity-100 p-1 rounded-[3px] hover:bg-red-500/10 text-[var(--text-faint)] hover:text-red-400 transition-all shrink-0"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      <div className="px-4 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Top Matches</div>
                      {dropdownItems.map((item, i) => {
                        const doc = item.value
                        return (
                          <button
                            key={doc.id}
                            data-idx={i}
                            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors outline-none border-b border-[var(--border-subtle)] last:border-0 ${activeIndex === i ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-active)]'}`}
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
                                <Highlight text={doc.file_name} query={search} />
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed break-words">
                                <Highlight text={cleanSnippetText(doc.snippet) || 'No text content available.'} query={search} />
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

          {/* Sort Filters */}
          <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
            {sortOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSortOrder(opt.id)}
                className={`px-3 py-1.5 rounded-[5px] text-[10px] font-bold tracking-wider uppercase transition-all duration-200 border ${
                  sortOrder === opt.id 
                    ? 'bg-[var(--text-accent)]/10 text-[var(--text-accent)] border-[var(--text-accent)]/30 shadow-sm' 
                    : 'bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SCROLLABLE GRID ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 lg:px-10 lg:py-8">
        <div className="max-w-6xl mx-auto space-y-6">

          {loading ? (
            <div className="py-20 flex justify-center">
              <PulseLoader text="Loading Library" size="sm" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-20 text-[var(--text-muted)] text-[13px] font-medium">
              No documents found matching your search.
            </div>
          ) : (
            <>
              <div 
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity duration-200"
                style={{ opacity: deferredSearch !== search ? 0.6 : 1 }}
              >
                {filteredDocs.slice(0, visibleCount).map((doc, idx) => {
                  return (
                    <div
                      key={doc.id || idx}
                      onClick={() => handleOpenDoc(doc)}
                      className="group flex flex-col bg-[var(--bg-panel)] border border-transparent hover:bg-[var(--bg-active)] rounded-[5px] transition-all duration-200 cursor-pointer overflow-hidden shadow-none"
                    >
                      {/* Thumbnail Preview Area */}
                      <div className="h-[120px] w-full border-b border-transparent bg-black/20 overflow-hidden">
                        {renderThumbnail(doc)}
                      </div>
                      
                      {/* Metadata Footer */}
                      <div className="p-3.5 flex flex-col gap-1.5 bg-transparent">
                        <h3 className="text-[12.5px] font-semibold text-[var(--text-main)] truncate" title={doc.file_name}>
                          {doc.file_name}
                        </h3>
                        <div className="flex justify-between items-center text-[10px] font-mono text-[var(--text-muted)]/70">
                          <span className="tracking-wider uppercase font-bold">{doc.file_type || 'UNKNOWN'}</span>
                          {doc.file_size > 0 && <span>{formatBytes(doc.file_size)}</span>}
                        </div>
                      </div>
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
