import React, { memo } from 'react'
import { Server, Database, UserPlus, ShieldAlert, Cpu } from 'lucide-react'
import { cn } from '../../lib/utils'

const activityLogs = [
  {
    id: 1,
    title: 'New User Registration',
    time: '2 minutes ago',
    icon: UserPlus,
    colorClass: 'text-[var(--text-accent)]',
    bgClass: 'bg-[var(--text-accent)]/10'
  },
  {
    id: 2,
    title: 'Database Backup Completed',
    time: '45 minutes ago',
    icon: Database,
    colorClass: 'text-[var(--icon-secondary)]',
    bgClass: 'bg-[var(--icon-secondary)]/10'
  },
  {
    id: 3,
    title: 'Failed Login Attempt',
    time: '3 hours ago',
    icon: ShieldAlert,
    colorClass: 'text-[var(--icon-danger)]',
    bgClass: 'bg-[var(--icon-danger)]/10'
  },
  {
    id: 4,
    title: 'Server Cluster Scaled Up',
    time: '5 hours ago',
    icon: Server,
    colorClass: 'text-[var(--text-main)]',
    bgClass: 'bg-[var(--bg-active)]'
  },
  {
    id: 5,
    title: 'AI Model Re-training',
    time: 'Yesterday',
    icon: Cpu,
    colorClass: 'text-purple-400',
    bgClass: 'bg-purple-500/10'
  }
]

const DashboardActivityFeed = memo(() => {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 hover:border-[var(--border-subtle)] transition-all duration-300 w-full lg:w-80 shrink-0">
      <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest mb-6">RECENT ACTIVITY</h2>
      
      <div className="space-y-6">
        {activityLogs.map((log, index) => {
          const Icon = log.icon
          return (
            <div key={log.id} className="relative flex gap-4 group">
              {/* Timeline Connector Line */}
              {index !== activityLogs.length - 1 && (
                <div className="absolute left-4 top-10 bottom-[-24px] w-px bg-[var(--border-dim)] group-hover:bg-[var(--text-accent)]/30 transition-colors"></div>
              )}
              
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 transition-transform group-hover:scale-110", log.bgClass, log.colorClass)}>
                <Icon size={14} />
              </div>
              
              <div className="pt-1">
                <p className="text-[11px] font-bold text-[var(--text-main)] group-hover:text-[var(--text-accent)] transition-colors leading-none">{log.title}</p>
                <p className="text-[9px] font-medium text-[var(--text-muted)] mt-1.5 uppercase tracking-wider">{log.time}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default DashboardActivityFeed
