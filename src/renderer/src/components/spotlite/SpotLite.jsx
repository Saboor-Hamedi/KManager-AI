import React, { useState, useEffect, useRef } from 'react'
import { Search, Bot, FileText, ArrowRight } from 'lucide-react'
import Preview from '../search/Preview'
import ChatBot from '../ChatBot'

const SpotLite = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState('search') // 'search' | 'ai'
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [hoveredDoc, setHoveredDoc] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

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
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
      window.api.db.query('SELECT id as document_id, file_name, file_type, vault_path, content FROM documents ORDER BY created_at DESC LIMIT 15').then(res => {
        if (!isMounted) return
        const rows = res?.rows || (Array.isArray(res) ? res : [])
        if (rows.length > 0) {
           const finalDocs = rows.map(row => ({
             id: row.document_id,
             title: row.file_name || 'Untitled',
             category: row.file_type ? row.file_type.toUpperCase() : 'DOCUMENT',
             vault_path: row.vault_path,
             content: row.content
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
          SELECT id as document_id, file_name, file_type, vault_path, content 
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
             content: row.content
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] animate-in fade-in duration-150 ease-out" onClick={() => setIsOpen(false)}>
      <div 
        className="bg-[var(--bg-app)] rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-white/[0.08] relative w-[760px] h-[480px] animate-in zoom-in-[0.98] slide-in-from-top-4 duration-150 ease-out"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Input Bar */}
        <div className="flex items-center px-4 py-2.5 border-b border-white/[0.06] bg-[var(--bg-panel)] shrink-0 h-[48px]">
          {mode === 'search' ? (
            <>
              <Search size={16} className="text-[var(--text-muted)] mr-3 shrink-0" />
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
          
          {/* Toggles - Made smaller */}
          <div className="flex items-center gap-1 ml-4 bg-black/20 p-1 rounded-md border border-white/[0.05]">
            <button 
              onClick={() => setMode('search')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10.5px] font-semibold transition-colors border-0 outline-none ${mode === 'search' ? 'bg-[var(--text-accent)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.05]'}`}
            >
              <FileText size={12} />
              Library
            </button>
            <button 
              onClick={() => setMode('ai')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[10.5px] font-semibold transition-colors border-0 outline-none ${mode === 'ai' ? 'bg-[#10a37f] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.05]'}`}
            >
              <Bot size={12} />
              AI Chat
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0 overflow-hidden bg-[var(--bg-app)] relative">
          {mode === 'search' ? (
            <div className="flex w-full h-full">
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
                        className={`px-3 py-2.5 rounded-md cursor-pointer transition-colors flex flex-col gap-1 border border-transparent ${selectedIndex === idx ? 'bg-[var(--bg-active)] shadow-sm' : 'hover:bg-white/[0.03]'}`}
                      >
                         <div className="flex items-center gap-2">
                           <FileText size={13} className={selectedIndex === idx ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'} />
                           <span className="text-[12px] font-semibold text-[var(--text-main)] truncate leading-none">{doc.title}</span>
                         </div>
                         <span className="text-[10px] text-[var(--text-faint)] truncate pl-5 font-mono leading-none">
                           {doc.vault_path.split(/[\\/]/).slice(0, -1).join('\\')}
                         </span>
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
                    <Preview 
                      selectedPdf={hoveredDoc} 
                      fullText={hoveredDoc.content}
                      fileExists={true}
                      onClose={() => {}} 
                      isEditable={false} 
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-faint)] text-[12px] gap-2">
                    <FileText size={20} className="opacity-20" />
                    {results.length > 0 ? 'Hover a document to preview' : 'Type a query to begin searching'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="w-full h-full relative">
              <ChatBot inline={true} initialQuery={query} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default SpotLite
