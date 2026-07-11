import React from 'react'
import DashboardMetrics from '../dashboard/DashboardMetrics'
import DashboardChart from '../dashboard/DashboardChart'
import DashboardActivityFeed from '../dashboard/DashboardActivityFeed'

const AnalyticsView = () => {
  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in fill-mode-both" style={{ animationDelay: '100ms' }}>
      <DashboardMetrics />
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        <DashboardChart />
        <DashboardActivityFeed />
      </div>
    </div>
  )
}

export default AnalyticsView
