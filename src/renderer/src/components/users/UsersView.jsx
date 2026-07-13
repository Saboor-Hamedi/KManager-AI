import React, { useState, memo } from 'react'
import { Search, Plus, Filter, MoreHorizontal } from 'lucide-react'
import { cn } from '../../lib/utils'

const mockUsers = [
  { id: 1, name: 'Alex Morgan', email: 'alex@example.com', role: 'Admin', status: 'Active', lastActive: '2 mins ago' },
  { id: 2, name: 'Sarah Chen', email: 'sarah.c@example.com', role: 'Editor', status: 'Active', lastActive: '1 hr ago' },
  { id: 3, name: 'Michael Ross', email: 'm.ross@example.com', role: 'Viewer', status: 'Offline', lastActive: '2 days ago' },
  { id: 4, name: 'Elena Gilbert', email: 'elena@example.com', role: 'Editor', status: 'Banned', lastActive: '1 week ago' },
  { id: 5, name: 'David Kim', email: 'dkim@example.com', role: 'Viewer', status: 'Active', lastActive: '5 mins ago' },
  { id: 6, name: 'Rachel Zane', email: 'rzane@example.com', role: 'Viewer', status: 'Offline', lastActive: '3 hrs ago' },
  { id: 7, name: 'Harvey Specter', email: 'harvey@example.com', role: 'Admin', status: 'Active', lastActive: 'Just now' },
]

const StatusBadge = memo(({ status }) => {
  let colors = ''
  switch (status) {
    case 'Active':
      colors = 'text-[var(--icon-secondary)] bg-[var(--icon-secondary)]/10 border-[var(--icon-secondary)]/20'
      break
    case 'Offline':
      colors = 'text-[var(--text-muted)] bg-[var(--bg-active)] border-[var(--border-dim)]'
      break
    case 'Banned':
      colors = 'text-[var(--icon-danger)] bg-[var(--icon-danger)]/10 border-[var(--icon-danger)]/20'
      break
    default:
      colors = 'text-[var(--text-muted)] bg-[var(--bg-active)] border-[var(--border-dim)]'
  }

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", colors)}>
      {status}
    </span>
  )
})

const UsersView = () => {
  const [search, setSearch] = useState('')

  const filteredUsers = mockUsers.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in fill-mode-both" style={{ animationDelay: '100ms' }}>
      
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-md text-xs text-[var(--text-main)] pl-9 pr-4 py-2 focus:outline-none transition-colors placeholder:text-[var(--text-faint)]"
            />
          </div>
          <button className="p-2 border border-[var(--border-dim)] rounded-md bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors">
            <Filter size={14} />
          </button>
        </div>
        
        <button className="flex items-center gap-2 bg-[var(--text-accent)] text-[var(--bg-app)] px-4 py-2 rounded-md text-[11px] font-bold tracking-wide hover:opacity-90 shadow-[0_0_15px_var(--bg-active)] transition-all">
          <Plus size={14} />
          Add User
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-dim)] bg-[var(--bg-active)]/50">
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] tracking-widest uppercase">User</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] tracking-widest uppercase">Role</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] tracking-widest uppercase">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] tracking-widest uppercase">Last Active</th>
                <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] tracking-widest uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-dim)]">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-[var(--bg-active)] transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--icon-primary)] text-[var(--bg-app)] flex items-center justify-center text-xs font-bold shrink-0">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-main)]">{user.name}</div>
                          <div className="text-[10px] text-[var(--text-faint)] mt-0.5">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">{user.role}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={user.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] text-[var(--text-faint)] font-mono">{user.lastActive}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-[var(--text-muted)]">
                      <button className="p-1 hover:bg-[var(--bg-panel)] rounded transition-colors hover:text-[var(--text-main)]">
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[var(--text-muted)] text-xs font-medium">
                    No users found matching "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[var(--border-dim)] bg-[var(--bg-active)]/30">
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Showing {filteredUsers.length} of {mockUsers.length}
          </span>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border-dim)] rounded hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] transition-colors disabled:opacity-50">Prev</button>
            <button className="px-3 py-1 text-[10px] font-bold text-[var(--text-muted)] border border-[var(--border-dim)] rounded hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] transition-colors disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>

    </div>
  )
}

export default UsersView
