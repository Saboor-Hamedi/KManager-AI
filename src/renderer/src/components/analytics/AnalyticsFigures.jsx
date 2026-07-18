import React, { memo } from 'react'
import SearchesOverTimeFigure from './figures/SearchesOverTimeFigure'
import DocumentTypesFigure from './figures/DocumentTypesFigure'
import SimilarityDistributionFigure from './figures/SimilarityDistributionFigure'
import LatencyTrendFigure from './figures/LatencyTrendFigure'
import PipelineUsageFigure from './figures/PipelineUsageFigure'
import FeedbackSentimentFigure from './figures/FeedbackSentimentFigure'
import SuccessRateFigure from './figures/SuccessRateFigure'
import TokenEconomicsFigure from './figures/TokenEconomicsFigure'

const AnalyticsFigures = memo(({ data }) => {
  if (!data) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Row 1: Search Volume & Latency Trend */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <SearchesOverTimeFigure data={data} />
        <LatencyTrendFigure data={data} />
      </div>

      {/* Row 2: Doc Types & Semantic Relevance */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <DocumentTypesFigure data={data} />
        <SimilarityDistributionFigure data={data} />
      </div>

      {/* Row 3: Pipeline Usage & Success Rate */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <PipelineUsageFigure data={data} />
        <SuccessRateFigure data={data} />
      </div>

      {/* Row 4: Token Economics & Feedback Sentiment */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <TokenEconomicsFigure data={data} />
        <FeedbackSentimentFigure data={data} />
      </div>
    </div>
  )
})

export default AnalyticsFigures
