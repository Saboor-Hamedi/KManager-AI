import React, { memo } from 'react'
import { BookOpen, Settings, Palette } from 'lucide-react'
import { cn } from '../lib/utils'

const SidebarFooterItem = memo(({ icon: Icon, label, shortcut, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full py-2 transition-all duration-200 group relative focus:outline-none outline-none border-0",
      collapsed ? "justify-center px-0" : "px-5",
      "text-[var(--text-muted)] hover:bg-white/[0.03] hover:text-[var(--text-main)]"
    )}
  >
    <Icon size={15} className="shrink-0 group-hover:text-[var(--text-accent)] transition-colors" />
    {!collapsed && (
      <>
        <span className="ml-3.5 text-[12px] font-medium tracking-tight truncate">{label}</span>
        {shortcut && (
          <kbd className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-panel)] border border-white/[0.05] text-[var(--text-faint)] opacity-0 group-hover:opacity-100 transition-opacity">{shortcut}</kbd>
        )}
      </>
    )}
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
