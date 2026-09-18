import React, { useState, useEffect, useMemo } from 'react'
import { BookOpen } from 'lucide-react'
import DocumentRenderer from './search/document/DocumentRenderer'
import DocSidebar from './DocSidebar'
import DocHeader from './DocHeader'

// Statically bundle documentation markdown directly into the application package
const docModules = import.meta.glob([
  '../../../../doc/**/*.md',
  '../../../../brain/**/*.md'
], { query: '?raw', import: 'default', eager: true })

function buildDocs() {
  const categories = {}
  for (const [modulePath, rawContent] of Object.entries(docModules)) {
    const normalized = modulePath.replace(/\\/g, '/').replace(/^.*?\/(?:doc|brain)\//i, '')
    const parts = normalized.split('/')
    
    let category = 'GENERAL'
    let filename = parts[0]
    if (parts.length > 1) {
      category = parts[0].toUpperCase()
      filename = parts[parts.length - 1]
    }

    const titleMap = {
      'ai.md': 'AI Integration',
      'api.md': 'REST API',
      'cli.md': 'CLI Guide',
      'ltr.md': 'Learning to Rank (LTR)',
      'rrf.md': 'Reciprocal Rank Fusion (RRF)',
      'eval.md': 'Evaluation & Benchmarks',
      'hybrid.md': 'Hybrid Search',
      'keyword.md': 'Keyword Search (BM25)',
      'semantic.md': 'Semantic Vector Search',
      'scheme.md': 'Database Schema',
      'system.md': 'System Architecture',
      'text.md': 'Text Processing',
      'flask.md': 'Flask Web UI',
      'ingestion.md': 'Ingestion Pipeline',
      'introduction.md': 'Introduction',
      'architecture.md': 'Architecture Overview'
    }

    const title = titleMap[filename.toLowerCase()] || 
      filename.replace(/\.md$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

    if (!categories[category]) {
      categories[category] = []
    }

    const existing = categories[category].find(d => d.title.toLowerCase() === title.toLowerCase())
    if (!existing) {
      categories[category].push({
        title,
        path: normalized,
        content: rawContent,
        type: 'md'
      })
    }
  }
  return categories
}

const COMPILED_DOCS = buildDocs()

const Documentation = ({ isOpen, onClose }) => {
  const [docs] = useState(COMPILED_DOCS)
  const [activeDoc, setActiveDoc] = useState(() => {
    if (COMPILED_DOCS['GENERAL'] && COMPILED_DOCS['GENERAL'].length > 0) {
      const intro = COMPILED_DOCS['GENERAL'].find(d => d.title.toLowerCase().includes('introduction'))
      return intro || COMPILED_DOCS['GENERAL'][0]
    }
    const firstCat = Object.keys(COMPILED_DOCS)[0]
    return firstCat ? COMPILED_DOCS[firstCat][0] : null
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const docContent = useMemo(() => {
    return activeDoc?.content || '# No Document Selected\nPlease choose a guide from the sidebar.'
  }, [activeDoc])

  // Register escape key with main process
  useEffect(() => {
    if (isOpen) {
      window.api?.system?.registerEscape?.()
    } else {
      window.api?.system?.unregisterEscape?.()
    }
  }, [isOpen])

  // Handle Escape key directly via keydown for robust closing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleNavigate = (href) => {
    // href might be relative, e.g. "architecture.md"
    const filename = href.split('/').pop().toLowerCase()
    let foundDoc = null
    
    // Search across all categories for the matching document
    for (const category of Object.keys(docs)) {
      const match = docs[category].find(d => d.path.toLowerCase().endsWith(filename))
      if (match) {
        foundDoc = match
        break
      }
    }

    if (foundDoc) {
      setActiveDoc(foundDoc)
    }
  }

  if (!isOpen) return null

  // Compute prev/next navigation across ALL docs
  const getNavDocs = () => {
    if (!activeDoc) return { prev: null, next: null }

    const sortDocs = (list) => [...list].sort((a, b) => {
      const aIsIntro = a.title.toLowerCase().includes('introduction')
      const bIsIntro = b.title.toLowerCase().includes('introduction')
      if (aIsIntro && !bIsIntro) return -1
      if (!aIsIntro && bIsIntro) return 1
      return a.title.localeCompare(b.title)
    })

    const allDocs = []
    const categoryOrder = Object.keys(docs).sort((a, b) => {
      if (a === 'GENERAL') return -1
      if (b === 'GENERAL') return 1
      return a.localeCompare(b)
    })

    for (const cat of categoryOrder) {
      allDocs.push(...sortDocs(docs[cat]))
    }

    const idx = allDocs.findIndex(d => d.path === activeDoc.path)
    if (idx !== -1) {
      return {
        prev: idx > 0 ? allDocs[idx - 1] : null,
        next: idx < allDocs.length - 1 ? allDocs[idx + 1] : null
      }
    }
    return { prev: null, next: null }
  }
  const { prev, next } = getNavDocs()

  const handleContentClick = (e) => {
    const link = e.target.closest('a')
    if (link) {
      const href = link.getAttribute('href')
      if (href && href.endsWith('.md') && !href.startsWith('http')) {
        e.preventDefault()
        handleNavigate(href)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[var(--bg-app)] rounded-[5px] ring-1 ring-white/10 shadow-2xl flex flex-col overflow-hidden w-[85vw] h-[90vh] max-w-[1400px] animate-in zoom-in-95 duration-150" 
        onClick={(e) => e.stopPropagation()}
      >
        <DocHeader 
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onClose={onClose}
        />

        <div className="flex-1 flex flex-row overflow-hidden relative">
          <DocSidebar 
            docs={docs}
            activeDoc={activeDoc}
            setActiveDoc={setActiveDoc}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
          />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-app)] relative h-full">
            <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 lg:px-16 custom-scrollbar scroll-smooth" onClick={handleContentClick}>
              <div className="max-w-3xl mx-auto w-full h-full relative">
                
                {activeDoc ? (
                  <div key={activeDoc.path} className="animate-in slide-in-from-bottom-3 fade-in duration-300">
                    <DocumentRenderer content={docContent} fileTitle={activeDoc.title} onNavigate={handleNavigate} />
                    {(prev || next) && (
                      <div className="flex items-center justify-between mt-8 pt-6 pb-8 border-t border-[var(--border-subtle)]">
                        <div>
                          {prev && (
                            <button
                              onClick={() => setActiveDoc(prev)}
                              className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-accent)] transition-colors"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                              <span className="truncate max-w-[200px]">{prev.title}</span>
                            </button>
                          )}
                        </div>
                        <div>
                          {next && (
                            <button
                              onClick={() => setActiveDoc(next)}
                              className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-accent)] transition-colors"
                            >
                              <span className="truncate max-w-[200px]">{next.title}</span>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                    <BookOpen size={48} className="text-[var(--border-subtle)]" />
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-[var(--text-main)]">No Document Selected</h3>
                      <p className="text-xs text-[var(--text-muted)]">Select a guide from the sidebar to start reading.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Documentation
