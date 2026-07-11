import React, { memo } from 'react'
import { cn } from '../lib/utils'

const SidebarFooter = memo(({ collapsed }) => (
  <div className={cn("border-t border-gray-800 h-[50px] min-h-[50px] shrink-0 flex items-center", collapsed ? "px-1 justify-center" : "px-2")}>
  </div>
))

export default SidebarFooter
