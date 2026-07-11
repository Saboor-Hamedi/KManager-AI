import React, { memo } from 'react'
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

const SidebarHeader = memo(({ collapsed, toggleCollapsed }) => (
  <div className={cn("flex items-center border-b border-[var(--border-dim)] h-[50px] min-h-[50px] shrink-0 transition-colors duration-300", collapsed ? "justify-center p-0" : "justify-between px-4")}>
    {!collapsed && (
      <div className="flex items-center gap-2">
        {/* <Activity className="text-[var(--text-accent)]" size={16} /> */}
        <span className="font-black text-[var(--text-main)] tracking-[0.1em] text-xs">BIOMARKER</span>
      </div>
    )}
    <button 
      onClick={toggleCollapsed}
      className="p-1 hover:bg-[var(--bg-active)] rounded border border-[var(--border-dim)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] focus:outline-none"
    >
      {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
    </button>
  </div>
))

export default SidebarHeader
