import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ConfirmModal from '../../../../../src/renderer/src/components/layout/ConfirmModal'

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmModal isOpen={false} title="Test" message="Test msg" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders title and message when open', () => {
    render(
      <ConfirmModal isOpen={true} title="Delete Database?" message="Are you sure?" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('Delete Database?')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('renders custom button text', () => {
    render(
      <ConfirmModal isOpen={true} title="Test" message="Test" confirmText="Truncate" cancelText="Cancel" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('Truncate')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('renders default button text when not provided', () => {
    render(
      <ConfirmModal isOpen={true} title="Test" message="Test" onConfirm={() => {}} onCancel={() => {}} />
    )
    expect(screen.getByText('Okay')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})
