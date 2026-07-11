import React, { memo } from 'react'
import { Settings, Palette } from 'lucide-react'
import { cn } from '../lib/utils'

const SidebarFooterItem = memo(({ icon: Icon, label, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full py-2.5 transition-all duration-200 group relative focus:outline-none",
      collapsed ? "justify-center px-0" : "px-3",
      "text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] rounded-md"
    )}
  >
    <Icon size={14} className="shrink-0 group-hover:text-[var(--text-accent)] transition-colors" />
    {!collapsed && (
      <span className="ml-3 text-[11px] font-['Inter',_sans-serif] font-medium tracking-wide truncate">{label}</span>
    )}
  </button>
))

const SidebarFooter = memo(({ collapsed, onOpenSettings, onOpenTheme }) => (
  <div className={cn("min-h-[60px] shrink-0 flex flex-col justify-center gap-1 py-2", collapsed ? "px-2" : "px-3")}>
    <SidebarFooterItem
      icon={Palette}
      label="Appearance"
      collapsed={collapsed}
      onClick={onOpenTheme}
    />
    <SidebarFooterItem
      icon={Settings}
      label="Settings"
      collapsed={collapsed}
      onClick={onOpenSettings}
    />
  </div>
))

export default SidebarFooter
