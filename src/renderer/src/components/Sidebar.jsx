import React, { useState, memo } from 'react'
import { cn } from '../lib/utils'
import { ChevronLeft, ChevronRight, LayoutDashboard, Users } from 'lucide-react'

import SidebarHeader from './SidebarHeader'
import SidebarFooter from './SidebarFooter'

const SidebarItem = memo(({ icon: Icon, label, active, collapsed, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center w-full py-3 transition-all duration-200 group relative focus:outline-none",
      collapsed ? "justify-center px-0" : "px-4",
      active
        ? "bg-[var(--bg-active)] text-[var(--text-accent)]"
        : "text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)]"
    )}
  >
    {active && (
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--text-accent)] shadow-[0_0_10px_var(--bg-active)]" />
    )}
    <Icon size={16} className={cn("shrink-0", active ? "text-[var(--text-accent)]" : "group-hover:text-[var(--text-main)]")} />
    {!collapsed && (
      <span className="ml-4 text-[12px] font-['Inter',_sans-serif] font-medium tracking-wide truncate">{label}</span>
    )}
  </button>
))

const Sidebar = memo(({ activeTab, setActiveTab, onOpenSettings, onOpenTheme }) => {
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('sidebarCollapsed', JSON.stringify(next))
      return next
    })
  }

  const items = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users', icon: Users },
  ]

  return (
    <div
      className={cn(
        "h-screen bg-[var(--bg-sidebar)] border-r border-[var(--border-dim)] flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <SidebarHeader collapsed={collapsed} toggleCollapsed={toggleCollapsed} />

      <div className="flex-1 pt-0 pb-4 overflow-y-auto overflow-x-hidden space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div>
          {items.map((item) => (
            <SidebarItem
              key={item.id}
              {...item}
              active={activeTab === item.id}
              collapsed={collapsed}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </div>
      </div>

      <SidebarFooter collapsed={collapsed} onOpenSettings={onOpenSettings} onOpenTheme={onOpenTheme} />
    </div>
  )
})

export default Sidebar
