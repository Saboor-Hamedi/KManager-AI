import React, { memo } from 'react'
import { cn } from '../lib/utils'
import { LayoutDashboard, Users, Search, BookOpen } from 'lucide-react'
import SidebarHeader from './SidebarHeader'
import SidebarFooter from './SidebarFooter'

const SidebarItem = memo(({ icon: Icon, label, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'flex items-center w-full py-3 transition-all duration-200 group relative outline-none border-0',
      collapsed ? 'justify-center px-0' : 'px-4',
      active
        ? 'bg-[var(--bg-active)] text-[var(--text-accent)]'
        : 'text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]'
    )}
  >
    {active && (
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--text-accent)]" />
    )}
    <Icon
      size={16}
      className={cn('shrink-0', active ? 'text-[var(--text-accent)]' : 'group-hover:text-[var(--text-main)]')}
    />
    {!collapsed && (
      <span className="ml-4 text-[12px] font-medium tracking-wide truncate">{label}</span>
    )}
  </button>
))

// State is now owned by App.jsx so Ctrl+B and the header button can control it
const Sidebar = memo(({ activeTab, setActiveTab, onOpenSettings, onOpenTheme, onOpenDocs, collapsed, toggleCollapsed }) => {
  const items = [
    { id: 'search',    label: 'Search',    icon: Search },
    { id: 'analytics', label: 'Analytics', icon: LayoutDashboard },
    { id: 'users',     label: 'Users',     icon: Users },
    { id: 'documentation', label: 'Documentation (Ctrl + D)', icon: BookOpen },
  ]

  return (
    <div
      className={cn(
        'h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-dim)] flex flex-col transition-all duration-300 overflow-hidden shrink-0',
        collapsed ? 'w-14' : 'w-56'
      )}
    >
      <SidebarHeader collapsed={collapsed} toggleCollapsed={toggleCollapsed} />

      <div className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {items.map((item) => (
          <SidebarItem
            key={item.id}
            {...item}
            active={activeTab === item.id && item.id !== 'documentation'}
            collapsed={collapsed}
            onClick={() => {
              if (item.id === 'documentation') {
                onOpenDocs()
              } else {
                setActiveTab(item.id)
              }
            }}
          />
        ))}
      </div>

      <SidebarFooter collapsed={collapsed} onOpenSettings={onOpenSettings} onOpenTheme={onOpenTheme} />
    </div>
  )
})

export default Sidebar
