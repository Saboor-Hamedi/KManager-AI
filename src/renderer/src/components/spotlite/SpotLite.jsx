import React, { useState, useEffect, useRef, useTransition } from 'react'
import { Search, Bot, FileText, ArrowRight, Sparkles } from 'lucide-react'
import SpotLitePreview from './SpotLitePreview'
import ChatBot from '../ChatBot'
import PulseLoader from '../PulseLoader'

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

const SpotLite = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState('search') // 'search' | 'ai'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [hoveredDoc, setHoveredDoc] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef(null)

  const handleModeSwitch = (newMode) => {
    startTransition(() => {
      setMode(newMode)
    })
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    const handleOpen = () => setIsOpen(true)
    
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('open-spotlite', handleOpen)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('open-spotlite', handleOpen)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
      setHoveredDoc(null)
      setSelectedIndex(0)
      setMode('search')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || mode !== 'search') return
    const s = query.trim()
    let isMounted = true
    setIsSearching(true)

    if (s.length < 2) {
      // Load recent documents automatically with content
      window.api.db.query('SELECT id as document_id, file_name, file_type, vault_path, content, file_size, created_at FROM documents ORDER BY created_at DESC LIMIT 15').then(res => {
        if (!isMounted) return
        const rows = res?.rows || (Array.isArray(res) ? res : [])
        if (rows.length > 0) {
           const finalDocs = rows.map(row => ({
             id: row.document_id,
             title: row.file_name || 'Untitled',
             category: row.file_type ? row.file_type.toUpperCase() : 'DOCUMENT',
             vault_path: row.vault_path,
             content: row.content,
             file_size: row.file_size,
             created_at: row.created_at
           }))
           setResults(finalDocs)
           setSelectedIndex(0)
           setHoveredDoc(finalDocs[0])
        } else {
           setResults([])
           setHoveredDoc(null)
        }
        setIsSearching(false)
      }).catch(err => {
        console.error(err)
        if (isMounted) setIsSearching(false)
      })
      return
    }

    const timer = setTimeout(async () => {
      try {
        // Ultra-fast lexical search on both title and content
        const res = await window.api.db.query(`
          SELECT id as document_id, file_name, file_type, vault_path, content, file_size, created_at 
          FROM documents 
          WHERE file_name ILIKE $1 OR content ILIKE $1
          ORDER BY updated_at DESC
          LIMIT 15
        `, [`%${s}%`])
        
        if (isMounted) {
           const rows = res?.rows || (Array.isArray(res) ? res : [])
           const finalDocs = rows.map(row => ({
             id: row.document_id,
             title: row.file_name || 'Untitled',
             category: row.file_type ? row.file_type.toUpperCase() : 'DOCUMENT',
             vault_path: row.vault_path,
             content: row.content,
             file_size: row.file_size,
             created_at: row.created_at
           }))
           setResults(finalDocs)
           setSelectedIndex(0)
           if (finalDocs.length > 0) {
             setHoveredDoc(finalDocs[0])
           } else {
             setHoveredDoc(null)
           }
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted) setIsSearching(false)
      }
    }, 50)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [query, mode, isOpen])

  const handleInputKeyDown = (e) => {
    if (mode !== 'search' || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (selectedIndex + 1) % results.length
      setSelectedIndex(next)
      setHoveredDoc(results[next])
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = (selectedIndex - 1 + results.length) % results.length
      setSelectedIndex(next)
      setHoveredDoc(results[next])
    } else if (e.key === 'Enter') {
      e.preventDefault()
      // Open the document inside the main app dashboard when possible, or just preview it.
      // Since SpotLite is primarily a preview tool, we do not open OS external PDF anymore.
    }
  }

  const formatBytes = (bytes) => {
    if (!bytes) return ''
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] animate-in fade-in duration-150 ease-out" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-[var(--bg-app)] rounded-[5px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-white/[0.08] relative w-[760px] h-[485px] animate-in zoom-in-[0.98] slide-in-from-top-4 duration-150 ease-out"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Input Bar */}
        <div className="flex items-center px-4 py-2.5 border-b border-white/[0.06] bg-[var(--bg-panel)] shrink-0 h-[48px]">
          {mode === 'search' ? (
            <>
              {isSearching ? (
                <svg className="animate-spin h-4 w-4 text-[var(--text-accent)] mr-3 shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Search size={16} className="text-[var(--text-muted)] mr-3 shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search your library..."
                className="flex-1 bg-transparent border-0 outline-none ring-0 focus:ring-0 focus:outline-none focus:border-0 text-[14px] font-medium text-[var(--text-main)] placeholder-[var(--text-faint)]"
                spellCheck={false}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center gap-2 px-1">
              <Bot size={15} className="text-[#10a37f] shrink-0" />
              <span className="text-[13px] font-semibold text-[var(--text-main)] tracking-tight">KManager AI</span>
            </div>
          )}
          
          {/* Toggles - Plain text with background wrapper restored */}
          <div className="flex items-center gap-1 ml-4 bg-black/20 p-1 rounded-md border border-white/[0.05]">
            <button 
              onClick={() => handleModeSwitch('search')}
              className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium transition-colors border-0 outline-none ${mode === 'search' ? 'bg-[var(--text-accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              Library
            </button>
            <button 
              onClick={() => handleModeSwitch('ai')}
              className={`px-2 py-0.5 rounded-[4px] text-[10px] font-medium transition-colors border-0 outline-none ${mode === 'ai' ? 'bg-[#10a37f] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
            >
              Ask AI
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden bg-[var(--bg-app)] relative">
          
          {isPending && (
            <div className="absolute inset-0 z-50 bg-[var(--bg-app)]/80 backdrop-blur-sm flex items-center justify-center">
              <PulseLoader text="Switching..." />
            </div>
          )}
          
          <div className={`w-full h-full ${mode === 'search' ? 'flex' : 'hidden'}`}>
              {/* Left: Results List */}
              <div className="w-[280px] shrink-0 border-r border-white/[0.06] flex flex-col overflow-y-auto custom-scrollbar bg-[var(--bg-panel)]/30">
                {results.length > 0 ? (
                  <div className="p-2 flex flex-col gap-1">
                    {results.map((doc, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedIndex(idx)
                          setHoveredDoc(doc)
                        }}
                        className={`group px-3 py-2.5 rounded-md cursor-pointer transition-colors flex flex-col gap-1.5 border border-transparent ${selectedIndex === idx ? 'bg-[var(--bg-active)] shadow-sm' : 'hover:bg-white/[0.03]'}`}
                      >
                         <div className="flex items-center gap-2 overflow-hidden w-full">
                           <FileText size={14} className={`shrink-0 ${selectedIndex === idx ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'}`} />
                           <div className="flex-1 min-w-0 pr-2">
                             {doc.category !== 'AI_RESPONSE' && (
                               <div className="text-[12px] font-semibold text-[var(--text-main)] truncate">
                                 <Highlight text={doc.title} query={query} />
                               </div>
                             )}
                           </div>
                           
                           {/* Mini File Type Badge */}
                           {(doc.file_type || doc.category) && (
                             <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                               (doc.file_type?.toLowerCase() === 'ai_response' || doc.file_type?.toLowerCase() === 'ai' || doc.category?.toLowerCase() === 'ai' || doc.category?.toLowerCase() === 'ai_response')
                                 ? 'bg-[#a855f7]/20 text-[#c084fc] border-[#a855f7]/30'
                                 : 'bg-black/30 text-[var(--text-muted)] border-white/5'
                             }`}>
                               {doc.file_type || doc.category}
                             </span>
                           )}
                         </div>
                          <div className="flex flex-col pl-6 relative">
                           {/* Hover Actions (Copy) */}
                           <div className={`absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 bg-[var(--bg-panel)] shadow-sm rounded flex items-center p-0.5 border border-white/5`}>
                             <button
                               onClick={(e) => {
                                 e.stopPropagation()
                                 navigator.clipboard.writeText(doc.vault_path)
                                 const btn = e.currentTarget
                                 const icon = btn.querySelector('svg')
                                 btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                                 setTimeout(() => {
                                   btn.innerHTML = icon.outerHTML
                                 }, 2000)
                               }}
                               className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
                               title="Copy File Path"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                             </button>
                           </div>

                           {/* Breadcrumbs Context */}
                           <span className="text-[9px] opacity-40 truncate font-mono mb-1.5 pr-6" title={doc.vault_path}>
                             {doc.vault_path ? doc.vault_path.split(/[\\/]/).slice(-3, -1).join(' > ') : ''}
                           </span>
                           
                           {/* Metadata */}
                           <span className="text-[9.5px] text-[var(--text-faint)]/60 leading-none flex items-center gap-1.5">
                             {doc.file_size ? <span className="font-mono">{formatBytes(doc.file_size)}</span> : null}
                             {doc.file_size && doc.created_at ? <span>•</span> : null}
                             {doc.created_at ? <span className="tracking-wider">{new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span> : null}
                           </span>
                         </div>
                      </div>
                    ))}
                  </div>
                ) : query.length < 2 ? (
                   <div className="p-6 text-center text-[12px] text-[var(--text-faint)] mt-8">
                     Type to search documents...
                   </div>
                ) : !isSearching ? (
                  <div className="p-6 flex flex-col items-center justify-center text-center mt-8 space-y-3">
                    <div className="w-8 h-8 rounded-full bg-white/[0.03] flex items-center justify-center border border-white/[0.05]">
                      <Search size={14} className="text-[var(--text-muted)]" />
                    </div>
                    <span className="text-[12px] text-[var(--text-main)] font-medium">No results found</span>
                    <button 
                      onClick={() => setMode('ai')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#10a37f]/10 text-[#10a37f] hover:bg-[#10a37f]/20 transition-colors text-[11px] font-bold border border-[#10a37f]/20 mt-1 shadow-sm"
                    >
                      <Bot size={12} />
                      Ask AI Instead
                      <ArrowRight size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="p-6 text-center text-[12px] text-[var(--text-faint)] mt-8">
                    Searching...
                  </div>
                )}
              </div>

              {/* Right: Preview Area */}
              <div className="flex-1 min-w-0 bg-[var(--bg-app)] flex flex-col overflow-hidden relative">
                {hoveredDoc ? (
                  <div className="absolute inset-0 z-0 select-text overflow-hidden">
                    <SpotLitePreview 
                      selectedPdf={hoveredDoc} 
                      fullText={hoveredDoc.content}
                      fileExists={true}
                      onClose={() => {}} 
                      onDocumentUpdate={(updatedDoc) => {
                        setHoveredDoc(updatedDoc)
                        setResults(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d))
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center py-6 px-4 h-full animate-in fade-in duration-300 relative">
                    {/* Subtle Background Watermark */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
                      <div className="text-[250px] font-black tracking-tighter text-white">KM</div>
                    </div>
                    
                    <div className="w-12 h-12 rounded-xl bg-white/[0.03] flex items-center justify-center mb-4 shadow-sm border border-white/[0.05] relative z-10">
                      <Search size={20} className="text-[var(--text-muted)]" />
                    </div>
                    <h3 className="text-base font-semibold text-[var(--text-main)] mb-1.5 relative z-10">KManager SpotLite</h3>
                    <p className="text-xs text-[var(--text-muted)] max-w-[320px] leading-relaxed relative z-10">
                      {results.length > 0 ? 'Hover a document to preview' : 'Start typing to search through your entire knowledge base instantly.'}
                    </p>
                  </div>
                )}
              </div>
          </div>
          
          <div className={`w-full h-full relative ${mode === 'ai' ? 'block' : 'hidden'}`}>
             <ChatBot inline={true} initialQuery={query} />
          </div>
        </div>

        {/* Footer Shortcuts */}
        <div className="h-[24px] shrink-0 border-t border-white/[0.04] bg-[var(--bg-panel)] flex items-center px-3 gap-3 select-none">
          <div className="flex items-center gap-1 opacity-50">
            <kbd className="text-[8px] font-mono px-1 py-[1px] rounded-[2px] bg-white/[0.04] text-white/40 tracking-wider outline-none border-none shadow-none uppercase">↑↓</kbd>
            <span className="text-[9px] text-[var(--text-muted)] font-medium">Navigate</span>
          </div>
          <div className="flex items-center gap-1 opacity-50">
            <kbd className="text-[8px] font-mono px-1 py-[1px] rounded-[2px] bg-white/[0.04] text-white/40 tracking-wider outline-none border-none shadow-none uppercase">Esc</kbd>
            <span className="text-[9px] text-[var(--text-muted)] font-medium">Close</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpotLite
