import React, { memo } from 'react'
import { cn } from '../lib/utils'

const SidebarHeader = memo(({ collapsed }) => (
  <div className={cn(
    'flex items-center border-b border-[var(--border-dim)] h-[50px] min-h-[50px] shrink-0 pl-[18px] pr-4 overflow-hidden'
  )}>
    <div className="w-5 h-5 rounded-md bg-[var(--text-accent)] flex items-center justify-center shrink-0">
      <span className="text-[9px] font-black text-black leading-none select-none">K</span>
    </div>
    <div 
      className={cn(
        "flex items-center min-w-0 ml-2 transition-opacity duration-200",
        collapsed ? "opacity-0" : "opacity-100"
      )}
    >
      <span className="text-[11.5px] font-bold text-[var(--text-main)] tracking-[0.14em] truncate shrink-0">KMANAGER</span>
    </div>
  </div>
))

export default SidebarHeader
