import React, { memo } from 'react'
import TradeoffScatterFigure from './figures/TradeoffScatterFigure'
import LatencyBottleneckFigure from './figures/LatencyBottleneckFigure'

const AnalyticsDatabase = memo(({ data }) => {
  if (!data) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Database Performance Graphs */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <TradeoffScatterFigure data={data} />
        <LatencyBottleneckFigure data={data} />
      </div>
    </div>
  )
})

export default AnalyticsDatabase
