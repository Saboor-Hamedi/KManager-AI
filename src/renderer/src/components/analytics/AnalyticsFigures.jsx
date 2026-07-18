import React, { memo } from 'react'
import SearchesOverTimeFigure from './figures/SearchesOverTimeFigure'
import DocumentTypesFigure from './figures/DocumentTypesFigure'
import SimilarityDistributionFigure from './figures/SimilarityDistributionFigure'
import LatencyTrendFigure from './figures/LatencyTrendFigure'
import PipelineUsageFigure from './figures/PipelineUsageFigure'
import FeedbackSentimentFigure from './figures/FeedbackSentimentFigure'

const AnalyticsFigures = memo(({ data }) => {
  if (!data) return null

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Top Row: Search Volume & Latency Trend */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <SearchesOverTimeFigure data={data} />
        <LatencyTrendFigure data={data} />
      </div>

      {/* Middle Row: Doc Types & Similarity Distribution */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <DocumentTypesFigure data={data} />
        <SimilarityDistributionFigure data={data} />
      </div>

      {/* Bottom Row: Pipeline Usage & Feedback Sentiment */}
      <div className="flex flex-col xl:flex-row gap-6 items-stretch">
        <PipelineUsageFigure data={data} />
        <FeedbackSentimentFigure data={data} />
      </div>
    </div>
  )
})

export default AnalyticsFigures
