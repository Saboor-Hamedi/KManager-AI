import React, { memo } from 'react'
import LatencyComparisonFigure from './figures/LatencyComparisonFigure'
import QualityCoherenceFigure from './figures/QualityCoherenceFigure'
import TradeoffScatterFigure from './figures/TradeoffScatterFigure'
import TokenEconomicsFigure from './figures/TokenEconomicsFigure'
import LatencyBottleneckFigure from './figures/LatencyBottleneckFigure'

const AnalyticsFigures = memo(({ data }) => {
  if (!data) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Top Row: Latency & Quality Curves */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <LatencyComparisonFigure data={data} />
        <QualityCoherenceFigure data={data} />
      </div>

      {/* Middle Row: Trade-off Scatter & Token Economics */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <TradeoffScatterFigure data={data} />
        <TokenEconomicsFigure data={data} />
      </div>

      {/* Bottom Row: Execution Bottleneck Breakdown */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <LatencyBottleneckFigure data={data} />
      </div>
    </div>
  )
})

export default AnalyticsFigures
