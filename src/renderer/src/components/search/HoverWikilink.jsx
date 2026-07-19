import React from 'react'
import { X, FileText } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'

const HoverWikilink = ({ item, setShowWikiHover, onSelect }) => {
  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{ backgroundColor: '#141822', opacity: 1, backdropFilter: 'none' }}
      className="absolute left-0 top-full mt-2 z-[99999] w-[460px] max-w-[95vw] rounded-[5px] border border-white/10 shadow-[0_24px_64px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in duration-150 text-left select-text"
    >
      {/* Compact GlobalTitleBar-Styled Header without blur */}
      <div className="h-[26px] bg-[#0e1117] border-b border-white/[0.08] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-1.5 px-2.5 min-w-0 flex-1 mr-2 h-full">
          <FileText size={13} className="text-[var(--text-accent)] shrink-0" />
          <span className="text-[11px] font-semibold text-[var(--text-main)] truncate tracking-tight">{item.title}</span>
          {item.category && (
            <span className="px-1 py-0.5 rounded-[3px] text-[9.5px] font-mono text-[var(--text-muted)] bg-[var(--bg-active)] shrink-0 leading-none">
              {item.category}
            </span>
          )}
        </div>
        <div className="flex items-center h-full shrink-0">
          <button
            onClick={() => setShowWikiHover(false)}
            className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center border-0"
            title="Close popover"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Solid Body Content with text-justify */}
      <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-3.5 text-[13px] text-[var(--text-main)] leading-relaxed font-sans break-words bg-[#141822] text-justify">
        <DocumentRenderer 
          className="text-[var(--text-main)] text-[13px] leading-relaxed max-w-full overflow-visible text-justify" 
          content={item.content || 'Preview content not available.'} 
          category={item.category || 'TEXT'}
          fileTitle={item.title}
        />
      </div>
    </div>
  )
}

export default HoverWikilink
