import React, { memo } from 'react'
import { BookOpen, Settings, Palette } from 'lucide-react'
import { cn } from '../lib/utils'

const SidebarFooterItem = memo(({ icon: Icon, label, shortcut, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full py-2 transition-all duration-200 group relative focus:outline-none outline-none border-0 overflow-hidden px-5",
      "text-[var(--text-muted)] hover:bg-white/[0.03] hover:text-[var(--text-main)]"
    )}
  >
    <Icon size={16} className="shrink-0 group-hover:text-[var(--text-accent)] transition-colors" />
    <div
      className={cn(
        'flex items-center flex-1 ml-3.5 transition-opacity duration-200 min-w-0',
        collapsed ? 'opacity-0' : 'opacity-100'
      )}
    >
      <span className="text-[12px] font-medium tracking-tight truncate shrink-0">{label}</span>
      {shortcut && (
        <kbd className="ml-auto shrink-0 text-[9.5px] font-mono px-1.5 py-[2px] rounded-[3px] bg-white/[0.04] text-white/40 tracking-wider outline-none border-none shadow-none uppercase">
          {shortcut}
        </kbd>
      )}
    </div>
  </button>
))

const SidebarFooter = memo(({ collapsed, onOpenSettings, onOpenTheme, onOpenDocs }) => (
  <div className={cn("shrink-0 flex flex-col py-1.5 border-t border-white/[0.04]", collapsed ? "px-0" : "px-0")}>
    <SidebarFooterItem
      icon={BookOpen}
      label="Documentation"
      shortcut="Ctrl+D"
      collapsed={collapsed}
      onClick={onOpenDocs}
    />
    <SidebarFooterItem
      icon={Palette}
      label="Appearance"
       shortcut="Ctrl+T"
      collapsed={collapsed}
      onClick={onOpenTheme}
    />
    <SidebarFooterItem
      icon={Settings}
      label="Settings"
       shortcut="Ctrl+,"
      collapsed={collapsed}
      onClick={onOpenSettings}
    />
  </div>
))

export default SidebarFooter
