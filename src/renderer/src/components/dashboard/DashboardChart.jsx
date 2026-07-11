import React, { memo } from 'react'

const chartData = [
  { label: 'Jan', value: 40 },
  { label: 'Feb', value: 65 },
  { label: 'Mar', value: 45 },
  { label: 'Apr', value: 80 },
  { label: 'May', value: 55 },
  { label: 'Jun', value: 90 },
  { label: 'Jul', value: 75 },
  { label: 'Aug', value: 100 },
  { label: 'Sep', value: 60 },
]

const DashboardChart = memo(() => {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-xl p-6 hover:border-[var(--border-subtle)] transition-all duration-300 flex-1">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-black text-[var(--text-main)] tracking-widest">ACTIVITY OVERVIEW</h2>
          <p className="text-[10px] text-[var(--text-muted)] mt-1 font-medium">System operations over time</p>
        </div>
        <div className="flex gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--text-accent)] mt-1"></span>
          <span className="text-[10px] text-[var(--text-faint)] font-bold">API Requests</span>
        </div>
      </div>
      
      {/* CSS Bar Chart Mockup */}
      <div className="h-48 flex items-end justify-between gap-2 mt-4">
        {chartData.map((data, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
            <div className="w-full relative flex justify-center h-full items-end">
              {/* Tooltip */}
              <div className="absolute -top-8 bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-main)] text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none whitespace-nowrap shadow-lg">
                {data.value}k req
              </div>
              
              {/* Bar */}
              <div 
                className="w-full max-w-[2rem] bg-[var(--text-accent)] rounded-t-sm opacity-60 group-hover:opacity-100 group-hover:bg-[var(--icon-primary)] transition-all duration-300"
                style={{ height: `${data.value}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
              {data.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

export default DashboardChart
