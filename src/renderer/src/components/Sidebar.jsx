import React, { memo } from 'react'
import { cn } from '../lib/utils'
import { LayoutDashboard, Users, Search, PlusCircle, Library } from 'lucide-react'
import SidebarHeader from './SidebarHeader'
import SidebarFooter from './SidebarFooter'

const SidebarItem = memo(({ icon: Icon, label, shortcut, active, collapsed, onClick, isCta }) => (
  <button
    onClick={(e) => {
      e.currentTarget.blur()
      if (onClick) onClick(e)
    }}
    className={cn(
      'flex items-center w-full py-2 transition-all duration-200 group relative outline-none focus:outline-none overflow-hidden',
      collapsed ? 'px-[19px]' : 'px-[23px]',
      isCta && 'mt-4',
      active
        ? 'bg-white/10 text-white'
        : 'text-white/50 hover:bg-white/[0.03] hover:text-white/90'
    )}
  >
    <Icon
      size={18}
      strokeWidth={2}
      className={cn(
        'shrink-0 transition-transform duration-300 ease-out',
        active ? 'text-white' : 'group-hover:text-white/90',
        collapsed && 'group-hover:scale-110'
      )}
    />
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
        'h-full bg-[var(--bg-sidebar)] flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden shrink-0 border-r border-white/5',
        collapsed ? 'w-14' : 'w-60'
      )}
      style={{ willChange: 'width' }}
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
          isCta={true}
          onClick={() => {
            window.dispatchEvent(new CustomEvent('new-session-intent'))
            if (activeTab !== 'search') setActiveTab('search')
          }}
        />

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
