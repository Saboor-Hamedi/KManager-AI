import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import FeedbackSentimentFigure from '../../../../../../src/renderer/src/components/analytics/figures/FeedbackSentimentFigure'

vi.mock('html-to-image', () => ({
  toBlob: vi.fn().mockResolvedValue(new Blob(['x'])),
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,x')
}))

describe('FeedbackSentimentFigure', () => {
  it('renders empty state when no feedback', () => {
    render(<FeedbackSentimentFigure data={{ realCharts: {} }} />)
    expect(screen.getByText('No feedback submitted yet.')).toBeInTheDocument()
  })

  it('renders title when data present', () => {
    render(<FeedbackSentimentFigure data={{ realCharts: { feedbackBuckets: [{ category: 'Positive', count: 8 }, { category: 'Negative', count: 2 }] } }} />)
    expect(screen.getByText('Feedback Sentiment')).toBeInTheDocument()
    expect(screen.getByText('Distribution of positive vs negative user ratings')).toBeInTheDocument()
  })
})
