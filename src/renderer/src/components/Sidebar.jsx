import React, { memo } from 'react'
import { cn } from '../lib/utils'
import { LayoutDashboard, Users, Search } from 'lucide-react'
import SidebarHeader from './SidebarHeader'
import SidebarFooter from './SidebarFooter'

const SidebarItem = memo(({ icon: Icon, label, shortcut, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center w-full py-2 transition-all duration-200 group relative outline-none',
      collapsed ? 'justify-center px-0' : 'px-5',
      active
        ? 'bg-white/[0.03] text-[var(--text-main)] border-l-2 border-[var(--text-accent)]'
        : 'text-[var(--text-muted)] hover:bg-white/[0.03] hover:text-[var(--text-main)] border-l-2 border-transparent'
    )}
  >
    <Icon
      size={15}
      className={cn('shrink-0', active ? 'text-[var(--text-accent)]' : 'group-hover:text-[var(--text-main)]')}
    />
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

// State is now owned by App.jsx so Ctrl+B and the header button can control it
const Sidebar = memo(({ activeTab, setActiveTab, onOpenSettings, onOpenTheme, onOpenDocs, onOpenAnalytics, collapsed, toggleCollapsed }) => {
  const items = [
    { id: 'search',    label: 'Search',    shortcut: 'Ctrl+P', icon: Search },
    { id: 'analytics', label: 'Analytics', icon: LayoutDashboard },
  ]

  return (
    <div
      className={cn(
        'h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-dim)] flex flex-col transition-all duration-300 overflow-hidden shrink-0',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      <SidebarHeader collapsed={collapsed} toggleCollapsed={toggleCollapsed} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            {...item}
            active={activeTab === item.id}
            collapsed={collapsed}
            onClick={() => {
              if (item.id === 'analytics') {
                onOpenAnalytics()
              } else {
                setActiveTab(item.id)
              }
            }}
          />
        ))}
      </div>

      <SidebarFooter collapsed={collapsed} onOpenSettings={onOpenSettings} onOpenTheme={onOpenTheme} onOpenDocs={onOpenDocs} />
    </div>
  )
})

export default Sidebar
