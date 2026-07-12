import React, { memo } from 'react'
import { cn } from '../lib/utils'

const SidebarHeader = memo(({ collapsed }) => (
  <div className={cn(
    'flex items-center border-b border-[var(--border-dim)] h-[50px] min-h-[50px] shrink-0',
    collapsed ? 'justify-center px-0' : 'px-4'
  )}>
    {!collapsed ? (
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-5 h-5 rounded-md bg-[var(--text-accent)] flex items-center justify-center shrink-0">
          <span className="text-[9px] font-black text-black leading-none select-none">K</span>
        </div>
        <div className="flex items-center min-w-0">
          <span className="text-[11.5px] font-bold text-[var(--text-main)] tracking-[0.14em] truncate">KMANAGER</span>
        </div>
      </div>
    ) : (
      <div className="w-5 h-5 rounded-md bg-[var(--text-accent)] flex items-center justify-center shrink-0">
        <span className="text-[9px] font-black text-black leading-none select-none">K</span>
      </div>
    )}
  </div>
))

export default SidebarHeader
