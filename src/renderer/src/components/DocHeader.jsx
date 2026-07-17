import React from 'react'
import { PanelLeftClose, PanelLeft, X } from 'lucide-react'

const DocHeader = ({ isSidebarOpen, onToggleSidebar, onClose }) => {
  return (
    <div className="h-8 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center shrink-0">
      <button 
        onClick={onToggleSidebar}
        className="h-full px-3 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center"
        title="Toggle Sidebar"
      >
        {isSidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeft size={15} />}
      </button>
      <div className="flex-1" />
      <button
        onClick={onClose}
        className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center"
        title="Close Documentation (Esc)"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default DocHeader
