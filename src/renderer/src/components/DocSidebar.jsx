import React, { useState, useEffect } from 'react'
import { FileText, Search, ChevronDown } from 'lucide-react'

const DocSidebar = ({ docs, activeDoc, setActiveDoc, searchQuery, setSearchQuery, isSidebarOpen, setIsSidebarOpen }) => {
  const [collapsedCategories, setCollapsedCategories] = useState({})

  // Load saved state
  useEffect(() => {
    const loadState = async () => {
      try {
        const saved = await window.api.config.get('docCategoriesState', {})
        if (saved) setCollapsedCategories(saved)
      } catch (err) {
        console.error('Failed to load doc categories state:', err)
      }
    }
    loadState()
  }, [])

  const toggleCategory = (category) => {
    const newState = {
      ...collapsedCategories,
      [category]: !collapsedCategories[category]
    }
    setCollapsedCategories(newState)
    window.api.config.set('docCategoriesState', newState).catch(err => {
      console.error('Failed to save doc categories state:', err)
    })
  }

  // Filter docs based on search
  const filteredDocs = {}
  Object.keys(docs).forEach(category => {
    const matches = docs[category].filter(doc => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    )
    if (matches.length > 0) {
      filteredDocs[category] = matches
    }
  })

  return (
    <div className={`
      flex flex-col h-full bg-[var(--bg-activitybar)] border-r border-[var(--border-dim)] shrink-0 transition-all duration-300 ease-in-out z-20 overflow-hidden
      ${isSidebarOpen ? 'w-60 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 border-r-0'}
    `}>
      {/* Search Input in Sidebar */}
      <div className="p-2.5 border-b border-[var(--border-dim)] shrink-0">
        <div className="relative group w-full">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--text-accent)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search docs..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] border border-[var(--border-subtle)] focus:border-[var(--text-accent)]/50 focus:bg-[var(--bg-active)] rounded-md pl-7 pr-2 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none transition-all"
          />
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-3 space-y-1 w-60">
        {Object.keys(filteredDocs).length === 0 ? (
          <div className="text-center text-xs text-[var(--text-muted)] mt-10 px-4">
            No documents found. Please ensure the app has been restarted so the backend IPC endpoints are registered!
          </div>
        ) : (
          Object.keys(filteredDocs).sort((a, b) => {
            if (a === 'GENERAL') return -1;
            if (b === 'GENERAL') return 1;
            return a.localeCompare(b);
          }).map(category => {
            const sortedDocs = [...filteredDocs[category]].sort((a, b) => {
              const aIsIntro = a.title.toLowerCase().includes('introduction')
              const bIsIntro = b.title.toLowerCase().includes('introduction')
              
              if (aIsIntro && !bIsIntro) return -1
              if (!aIsIntro && bIsIntro) return 1
              return a.title.localeCompare(b.title)
            })

            const isCollapsed = !searchQuery && collapsedCategories[category]

            return (
              <div key={category} className="px-2.5 mb-2">
                <button 
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] py-1.5 px-2.5 rounded-md uppercase tracking-widest hover:bg-[var(--bg-active)] transition-colors outline-none"
                >
                  <span>{category}</span>
                  <ChevronDown size={11} className={`text-[var(--text-faint)] transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-200 ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                  <div className="space-y-0.5 pt-0.5 ml-1 pl-2 border-l border-[var(--border-subtle)]">
                  {sortedDocs.map(doc => {
                    const isActive = activeDoc?.path === doc.path
                    return (
                      <button
                        key={doc.path}
                        onClick={() => {
                          setActiveDoc(doc)
                          if (window.innerWidth < 768) setIsSidebarOpen(false)
                        }}
                        className={`
                          w-full flex items-center gap-2 pl-3 pr-2 py-1.5 text-xs transition-colors relative
                          ${isActive 
                            ? 'bg-[var(--bg-active)] text-[var(--text-accent)] font-semibold' 
                            : 'text-[var(--text-muted)] hover:bg-[var(--bg-panel)] hover:text-[var(--text-main)]'}
                        `}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0.5 bottom-0.5 w-0.5 bg-[var(--text-accent)] rounded-full" />
                        )}
                        <FileText size={13} className={isActive ? 'text-[var(--text-accent)]' : 'text-[var(--text-faint)]'} />
                        <span className="truncate text-left">{doc.title}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default DocSidebar
