import React from 'react'
import { PanelLeftClose, PanelLeft, X } from 'lucide-react'

const DocHeader = ({ isSidebarOpen, onToggleSidebar, onClose }) => {
  return (
    <div className="h-8 bg-[var(--bg-panel)]/80 flex items-center justify-between shrink-0">
      <div className="flex items-center h-full">
        <button 
          onClick={onToggleSidebar}
          className="h-full px-4 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center"
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
        <div className="flex items-center gap-2 ml-1">
          <h2 className="text-[13px] font-bold text-[var(--text-main)] tracking-wide">Documentation</h2>
        </div>
      </div>
      <div className="flex items-center h-full">
        <button
          onClick={onClose}
          className="h-full px-4 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center"
          title="Close Documentation (Esc)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default DocHeader
