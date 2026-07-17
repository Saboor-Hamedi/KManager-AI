import React, { useState, useEffect, useRef } from 'react'
import { BookOpen } from 'lucide-react'
import DocumentRenderer from './search/DocumentRenderer'
import DocSidebar from './DocSidebar'
import DocHeader from './DocHeader'

const Documentation = ({ isOpen, onClose }) => {
  const [docs, setDocs] = useState({})
  const [activeDoc, setActiveDoc] = useState(null)
  const [docContent, setDocContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Fetch docs tree when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchDocs = async () => {
        try {
          const result = await window.api.system.readBrainDocs()
          setDocs(result)
          
          // Select 'Introduction' from 'GENERAL' by default if it exists
          if (result['GENERAL'] && result['GENERAL'].length > 0) {
            const introDoc = result['GENERAL'].find(d => d.title.toLowerCase() === 'introduction')
            if (introDoc) {
              setActiveDoc(introDoc)
            } else {
              setActiveDoc(result['GENERAL'][0])
            }
          }
        } catch (err) {
          console.error('Failed to load docs tree:', err)
        }
      }
      fetchDocs()
      
      // Register escape key
      window.api.system.registerEscape()
    } else {
      window.api.system.unregisterEscape()
    }
  }, [isOpen])

  // Fetch doc content when activeDoc changes
  useEffect(() => {
    if (activeDoc) {
      const fetchContent = async () => {
        setIsLoading(true)
        try {
          const content = await window.api.system.readFileContent(activeDoc.path)
          setDocContent(content || '# Error\nCould not load document content.')
        } catch (err) {
          setDocContent('# Error\nFailed to load document content.')
        } finally {
          setIsLoading(false)
        }
      }
      fetchContent()
    }
  }, [activeDoc])

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

  // Compute prev/next navigation within the same category
  const getNavDocs = () => {
    if (!activeDoc) return { prev: null, next: null }
    for (const category of Object.keys(docs)) {
      const sorted = [...docs[category]].sort((a, b) => {
        const aIsIntro = a.title.toLowerCase().includes('introduction')
        const bIsIntro = b.title.toLowerCase().includes('introduction')
        if (aIsIntro && !bIsIntro) return -1
        if (!aIsIntro && bIsIntro) return 1
        return a.title.localeCompare(b.title)
      })
      const idx = sorted.findIndex(d => d.path === activeDoc.path)
      if (idx !== -1) {
        return {
          prev: idx > 0 ? sorted[idx - 1] : null,
          next: idx < sorted.length - 1 ? sorted[idx + 1] : null
        }
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-[5px] shadow-[0_0_60px_-15px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden w-[85vw] h-[80vh] max-w-[1000px] animate-in zoom-in-95 duration-200 ring-1 ring-white/5" 
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
              <div className="max-w-3xl mx-auto w-full pb-10 relative">
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--text-accent)] border-t-transparent animate-spin" />
                    <span className="text-xs font-medium text-[var(--text-muted)]">Loading document...</span>
                  </div>
                ) : activeDoc ? (
                  <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                    <DocumentRenderer content={docContent} fileTitle={activeDoc.title} onNavigate={handleNavigate} />
                    {(prev || next) && (
                      <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border-subtle)]">
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
