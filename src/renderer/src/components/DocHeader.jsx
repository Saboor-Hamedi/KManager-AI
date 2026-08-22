import React from 'react'
import { PanelLeftClose, PanelLeft, X, BookOpen } from 'lucide-react'

const DocHeader = ({ isSidebarOpen, onToggleSidebar, onClose }) => {
  return (
    <div className="flex items-center justify-between shrink-0 select-none bg-[var(--bg-panel)] border-b border-white/[0.04] h-[26px]">
      <div className="flex items-center h-full">
        <button 
          onClick={onToggleSidebar}
          className="h-full px-3 hover:bg-white/[0.05] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0 rounded-tl-[5px]"
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />}
        </button>
        <div className="flex items-center gap-1.5 ml-1">
          <BookOpen size={13} className="text-[var(--text-accent)] shrink-0" />
          <h2 className="text-[12px] font-semibold text-[var(--text-main)] tracking-tight">Documentation</h2>
        </div>
      </div>
      <div className="flex items-center h-full shrink-0">
        <button
          onClick={onClose}
          className="flex items-center justify-center w-10 h-full border-0 shrink-0 transition-colors text-[var(--text-muted)] hover:bg-[#e81123] hover:text-white rounded-tr-[5px]"
          title="Close (Esc)"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

export default DocHeader
