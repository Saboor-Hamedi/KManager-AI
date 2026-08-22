import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DashboardActivityFeed from '../../../../../src/renderer/src/components/dashboard/DashboardActivityFeed'

const mockFeed = [
  { eventType: 'search', id: 1, title: 'Query about databases', latency_ms: 120, top_similarity: 0.85, created_at: null },
  { eventType: 'feedback', id: 2, title: 'Feedback on answer', score: 1, created_at: null },
  { eventType: 'ingest', id: 3, title: 'Document ingested', file_type: 'pdf', created_at: null }
]

describe('DashboardActivityFeed', () => {
  it('renders empty state when no feed', () => {
    render(<DashboardActivityFeed results={{}} />)
    expect(screen.getByText(/No activity logged yet/)).toBeInTheDocument()
    expect(screen.getByText('0 Events')).toBeInTheDocument()
  })

  it('renders event count badge', () => {
    render(<DashboardActivityFeed results={{ activityFeed: mockFeed }} />)
    expect(screen.getByText('3 Events')).toBeInTheDocument()
    expect(screen.getByText('Real-Time Telemetry Feed')).toBeInTheDocument()
  })

  it('renders search event details', () => {
    render(<DashboardActivityFeed results={{ activityFeed: mockFeed }} />)
    expect(screen.getByText('Query about databases')).toBeInTheDocument()
    expect(screen.getByText('120ms • Sim: 0.85')).toBeInTheDocument()
  })

  it('renders feedback event details', () => {
    render(<DashboardActivityFeed results={{ activityFeed: mockFeed }} />)
    expect(screen.getByText('Rated +1 Relevant')).toBeInTheDocument()
  })

  it('renders ingest event details', () => {
    render(<DashboardActivityFeed results={{ activityFeed: mockFeed }} />)
    expect(screen.getByText('Document (pdf)')).toBeInTheDocument()
  })
})
