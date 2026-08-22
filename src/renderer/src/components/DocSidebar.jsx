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
      flex flex-col h-full bg-[var(--bg-panel)]/40 border-r border-white/[0.04] shrink-0 transition-all duration-300 ease-in-out z-20 overflow-hidden
      ${isSidebarOpen ? 'w-[240px]' : 'w-0 border-r-0'}
    `}>
      {/* Search Input in Sidebar */}
      <div className="p-4 shrink-0 w-[240px]">
        <div className="relative group w-full">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--text-accent)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search documentation..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/20 hover:bg-black/40 border border-white/[0.06] focus:border-[var(--text-accent)]/50 focus:bg-black/60 rounded-[6px] pl-9 pr-3 py-1.5 text-[12px] text-[var(--text-main)] placeholder-[var(--text-faint)] outline-none transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Navigation Tree */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-4 w-[240px]">
        {Object.keys(filteredDocs).length === 0 ? (
          <div className="text-center text-[11.5px] text-[var(--text-muted)] mt-10 px-4">
            No documents found.
          </div>
        ) : null}
        {Object.keys(filteredDocs).length > 0 && Object.keys(filteredDocs).sort((a, b) => {
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
            <div key={category} className="mb-1">
              <button 
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between py-1.5 px-3 rounded-[6px] group transition-colors outline-none hover:bg-white/[0.04]"
                >
                  <span className="text-[10.5px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] tracking-[0.08em] uppercase transition-colors">{category}</span>
                  <ChevronDown size={12} className={`text-[var(--text-faint)] group-hover:text-[var(--text-muted)] transition-all duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'}`}>
                <div className="space-y-0.5 pt-1">
                  {sortedDocs.map(doc => {
                    const isActive = activeDoc?.path === doc.path
                    return (
                      <button key={doc.path}
                        onClick={() => {
                          setActiveDoc(doc)
                          if (window.innerWidth < 768) setIsSidebarOpen(false)
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[12px] rounded-[6px] transition-all relative ${isActive ? 'bg-[var(--text-accent)]/10 text-[var(--text-accent)] font-medium shadow-sm' : 'text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)]'}`}
                      >
                        <FileText size={13} className={`${isActive ? 'text-[var(--text-accent)]' : 'text-[var(--text-faint)]'} shrink-0`} strokeWidth={isActive ? 2.5 : 2} />
                        <span className="truncate text-left leading-tight mt-0.5">{doc.title}</span>
                      </button>
                    )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export default DocSidebar
