import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import AnalyticsView from '../../../../../src/renderer/src/components/analytics/AnalyticsView'

describe('AnalyticsView', () => {
  it('renders without crashing', () => {
    const { container } = render(<AnalyticsView />)
    expect(container).toBeDefined()
  })
})
