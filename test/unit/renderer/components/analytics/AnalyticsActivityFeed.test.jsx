import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ActivityFeed from '../../../../../src/renderer/src/components/analytics/AnalyticsActivityFeed'

describe('AnalyticsActivityFeed', () => {
  it('renders empty state when no activity', () => {
    render(<ActivityFeed data={{ activityFeed: [] }} />)
    expect(screen.getByText(/No recent activity logged/)).toBeInTheDocument()
  })

  it('renders feed title', () => {
    render(<ActivityFeed data={{ activityFeed: [] }} />)
    expect(screen.getByText(/Live Database Activity/)).toBeInTheDocument()
  })
})
