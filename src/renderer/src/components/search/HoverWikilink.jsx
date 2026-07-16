import React from 'react'
import { X } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'

const HoverWikilink = ({ item, setShowWikiHover, onSelect }) => {
  return (
    <div 
      onClick={(e) => e.stopPropagation()}
      style={{ backgroundColor: '#161922', opacity: 1, backdropFilter: 'none' }}
      className="absolute left-0 top-full mt-2 z-[99999] w-[450px] max-w-[95vw] rounded-[8px] border border-[#2d3548] shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden animate-in fade-in duration-150 text-left select-text"
    >
      <div className="flex items-center justify-between px-3 py-2 bg-[#0e1117]/80 border-b border-[#2d3548]/40">
        <span className="text-[10px] font-semibold text-[#8a95a5] truncate max-w-[220px] uppercase tracking-wider">{item.title}</span>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => navigator.clipboard.writeText(item.content || '')}
            className="px-2 py-1 bg-transparent hover:bg-white/5 text-[10px] font-medium text-[#9a9a9a] hover:text-[#e0e0e0] rounded-[4px] border-0 transition-colors"
          >
            Copy
          </button>
          <button
            onClick={() => {
              setShowWikiHover(false)
              onSelect(item)
            }}
            className="px-2 py-1 bg-transparent hover:bg-[var(--text-accent)]/10 text-[10px] font-medium text-[var(--text-accent)] rounded-[4px] border-0 transition-colors"
          >
            Open Full
          </button>
          <div className="w-[1px] h-3 bg-[#2d3548]/80 mx-1"></div>
          <button
            onClick={() => setShowWikiHover(false)}
            className="w-5 h-5 rounded-[4px] hover:bg-white/10 text-[#7a8595] hover:text-white transition-colors flex items-center justify-center shrink-0 border-0"
            title="Close popover"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div className="max-h-[350px] overflow-y-auto custom-scrollbar p-3.5 text-[10px] text-[#c0c0c0] leading-relaxed font-sans break-words bg-[#161922]">
        <DocumentRenderer className="text-[#c0c0c0] text-[10px] leading-relaxed max-w-full overflow-visible" content={item.content || 'Preview content not available.'} />
      </div>
    </div>
  )
}

export default HoverWikilink
