import React from 'react'
import { PanelLeftClose, PanelLeft, X } from 'lucide-react'

const DocHeader = ({ isSidebarOpen, onToggleSidebar, onClose }) => {
  return (
    <div className="h-[26px] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 select-none border-b border-white/[0.04]">
      <div className="flex items-center h-full">
        <button 
          onClick={onToggleSidebar}
          className="h-full px-3 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose size={13} /> : <PanelLeft size={13} />}
        </button>
        <div className="flex items-center gap-1.5 ml-1">
          <h2 className="text-[11px] font-semibold text-[var(--text-main)] tracking-tight">Documentation</h2>
        </div>
      </div>
      <div className="flex items-center h-full">
        <button
          onClick={onClose}
          className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center border-0"
          title="Close Documentation (Esc)"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

export default DocHeader
