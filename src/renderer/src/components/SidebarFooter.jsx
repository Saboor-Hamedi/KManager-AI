import React, { memo } from 'react'
import { BookOpen, Settings, Palette } from 'lucide-react'
import { cn } from '../lib/utils'

const SidebarFooterItem = memo(({ icon: Icon, label, shortcut, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full py-2 transition-all duration-200 group relative focus:outline-none outline-none border-0 overflow-hidden",
      collapsed ? "px-[20px]" : "px-[23px]",
      "text-white/40 hover:bg-white/[0.03] hover:text-white/80"
    )}
  >
    <Icon size={16} strokeWidth={2} className="shrink-0 transition-transform duration-300 ease-out group-hover:scale-110" />
    <div
      className={cn(
        'flex items-center flex-1 ml-3.5 transition-opacity duration-200 min-w-0',
        collapsed ? 'opacity-0' : 'opacity-100'
      )}
    >
      <span className="text-[13px] font-medium tracking-tight truncate shrink-0">{label}</span>
      {shortcut && (
        <kbd className="ml-auto shrink-0 text-[10px] font-mono text-white/30 tracking-widest uppercase text-right">
          {shortcut}
        </kbd>
      )}
    </div>
  </button>
))

const SidebarFooter = memo(({ collapsed, onOpenSettings, onOpenTheme, onOpenDocs }) => (
  <div className={cn("shrink-0 flex flex-col pb-2 mt-8", collapsed ? "px-0" : "px-0")}>
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
