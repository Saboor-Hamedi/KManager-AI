import React from 'react'
import { PanelLeftClose, PanelLeft, X } from 'lucide-react'

const DocHeader = ({ isSidebarOpen, onToggleSidebar, onClose }) => {
  return (
    <div className="h-9 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 px-3 select-none">
      {/* Left: Sidebar Toggle & Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          title="Toggle Sidebar"
        >
          {isSidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeft size={16} />}
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--text-accent)]" />
          <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight">
            KManager AI
          </span>
          <span className="text-[10px] text-[var(--text-faint)] font-mono uppercase tracking-widest hidden sm:inline-block">
            — Knowledge Management Studio
          </span>
        </div>
      </div>

      {/* Right: Close Button */}
      <div className="flex items-center">
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-red-500/10 hover:text-red-500 text-[var(--text-muted)] transition-colors"
          title="Close Documentation (Esc)"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

export default DocHeader
