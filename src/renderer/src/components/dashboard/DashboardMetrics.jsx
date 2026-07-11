import React, { memo } from 'react'
import { Users, Activity, DollarSign, Database } from 'lucide-react'
import { cn } from '../../lib/utils'

const metrics = [
  {
    id: 1,
    title: 'Total Users',
    value: '12,483',
    trend: '+12.5%',
    trendUp: true,
    icon: Users,
    colorClass: 'text-[var(--text-accent)]',
    bgClass: 'bg-[var(--text-accent)]/10'
  },
  {
    id: 2,
    title: 'Active Sessions',
    value: '3,214',
    trend: '+5.2%',
    trendUp: true,
    icon: Activity,
    colorClass: 'text-[var(--icon-secondary)]',
    bgClass: 'bg-[var(--icon-secondary)]/10'
  },
  {
    id: 3,
    title: 'Monthly Revenue',
    value: '$48,290',
    trend: '-2.4%',
    trendUp: false,
    icon: DollarSign,
    colorClass: 'text-[var(--icon-danger)]',
    bgClass: 'bg-[var(--icon-danger)]/10'
  },
  {
    id: 4,
    title: 'Database Load',
    value: '42%',
    trend: 'Stable',
    trendUp: true,
    icon: Database,
    colorClass: 'text-[var(--text-muted)]',
    bgClass: 'bg-[var(--bg-active)]'
  }
]

const MetricCard = memo(({ metric }) => {
  const Icon = metric.icon
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-5 hover:border-[var(--border-subtle)] hover:shadow-[0_4px_20px_var(--bg-active)] transition-all duration-300 transform hover:-translate-y-1 group">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <p className="text-[11px] font-bold tracking-widest text-[var(--text-muted)] uppercase">{metric.title}</p>
          <p className="text-2xl font-black text-[var(--text-main)] tracking-tight">{metric.value}</p>
        </div>
        <div className={cn("p-2 rounded-lg transition-colors", metric.bgClass, metric.colorClass)}>
          <Icon size={18} />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <span className={cn(
          "text-[10px] font-bold px-2 py-0.5 rounded",
          metric.trendUp ? "text-[var(--icon-secondary)] bg-[var(--icon-secondary)]/10" : "text-[var(--icon-danger)] bg-[var(--icon-danger)]/10",
          metric.trend === 'Stable' && "text-[var(--text-accent)] bg-[var(--text-accent)]/10"
        )}>
          {metric.trend}
        </span>
        <span className="text-[10px] font-medium text-[var(--text-faint)]">vs last month</span>
      </div>
    </div>
  )
})

const DashboardMetrics = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {metrics.map(metric => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  )
}

export default DashboardMetrics
