import React, { memo } from 'react'
import { BookOpen, Settings, Palette } from 'lucide-react'
import { cn } from '../lib/utils'

const SidebarFooterItem = memo(({ icon: Icon, label, shortcut, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full py-2.5 transition-all duration-200 group relative focus:outline-none outline-none border-0",
      collapsed ? "justify-center px-0" : "px-3",
      "text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] rounded-md"
    )}
  >
    <Icon size={14} className="shrink-0 group-hover:text-[var(--text-accent)] transition-colors" />
    {!collapsed && (
      <>
        <span className="ml-3 text-[11px] font-['Inter',_sans-serif] font-medium tracking-wide truncate">{label}</span>
        {shortcut && (
          <kbd className="ml-auto text-[9px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity">{shortcut}</kbd>
        )}
      </>
    )}
  </button>
))

const SidebarFooter = memo(({ collapsed, onOpenSettings, onOpenTheme, onOpenDocs }) => (
  <div className={cn("min-h-[60px] shrink-0 flex flex-col justify-center gap-1 py-2", collapsed ? "px-2" : "px-3")}>
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
