import React, { memo } from 'react'
import { cn } from '../lib/utils'
import { LayoutDashboard, Users, Search, PlusCircle, Library } from 'lucide-react'
import SidebarHeader from './SidebarHeader'
import SidebarFooter from './SidebarFooter'

const SidebarItem = memo(({ icon: Icon, label, shortcut, active, collapsed, onClick }) => (
  <button
    onClick={(e) => {
      e.currentTarget.blur()
      if (onClick) onClick(e)
    }}
    className={cn(
      'flex items-center w-full py-2.5 transition-all duration-200 group relative outline-none focus:outline-none focus:ring-0',
      collapsed ? 'justify-center px-0' : 'px-5',
      active
        ? 'bg-white/[0.03] text-[var(--text-main)] border-l-2 border-[var(--text-accent)]'
        : 'text-[var(--text-muted)] hover:bg-white/[0.04] hover:text-[var(--text-main)] border-l-2 border-transparent'
    )}
  >
    <Icon
      size={16}
      className={cn(
        'shrink-0 transition-transform duration-300 ease-out',
        active ? 'text-[var(--text-accent)]' : 'group-hover:text-[var(--text-main)]',
        collapsed && 'group-hover:scale-125'
      )}
    />
    {!collapsed && (
      <>
        <span className="ml-3.5 text-[12px] font-medium tracking-tight truncate">{label}</span>
        {shortcut && (
          <kbd className="ml-auto text-[9.5px] font-mono px-1.5 py-[2px] rounded-[3px] bg-white/[0.04] text-white/40 tracking-wider outline-none border-none shadow-none uppercase">
            {shortcut}
          </kbd>
        )}
      </>
    )}
  </button>
))

// State is now owned by App.jsx so Ctrl+B and the header button can control it
const Sidebar = memo(({ activeTab, setActiveTab, onOpenSettings, onOpenTheme, onOpenDocs, onOpenAnalytics, collapsed, toggleCollapsed }) => {
  const items = [
    { id: 'search',    label: 'Search',    shortcut: 'Ctrl+P', icon: Search },
    { id: 'library',   label: 'Library',   shortcut: 'Ctrl+L', icon: Library },
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
        {/* Special New Session Action */}
        <SidebarItem
          icon={PlusCircle}
          label="New Session"
          shortcut="Ctrl+N"
          active={false}
          collapsed={collapsed}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('new-session-intent'))
            if (activeTab !== 'search') setActiveTab('search')
          }}
        />
        
        <div className="my-2 border-t border-[var(--border-dim)] mx-4 opacity-50" />

        {items.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            shortcut={item.shortcut}
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
