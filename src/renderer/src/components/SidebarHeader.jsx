import React, { memo } from 'react'
import { cn } from '../lib/utils'
import iconPath from '../../../../build/icon.png'

const SidebarHeader = memo(({ collapsed }) => (
  <div className={cn(
    'flex items-center h-[36px] min-h-[36px] shrink-0 overflow-hidden mb-6 transition-all duration-300',
    collapsed ? 'px-[19px]' : 'pl-[23px] pr-4'
  )}>
    <img 
      src={iconPath} 
      alt="KManager" 
      className="w-[18px] h-[18px] shrink-0 object-contain rounded-[5px] drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]" 
    />
    <div 
      className={cn(
        "flex items-center min-w-0 ml-2.5 transition-opacity duration-200",
        collapsed ? "opacity-0" : "opacity-100"
      )}
    >
      <span className="text-[11.5px] font-bold text-[var(--text-main)] tracking-[0.14em] truncate shrink-0">KMANAGER</span>
    </div>
  </div>
))

export default SidebarHeader
