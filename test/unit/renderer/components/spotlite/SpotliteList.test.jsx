import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import SpotliteList, { formatBytes, getFileIcon } from '../../../../../src/renderer/src/components/spotlite/SpotliteList'

describe('SpotliteList', () => {
  const results = [
    { id: '1', title: 'report.pdf', category: 'PDF', vault_path: '/vault/report.pdf', file_size: 2048 },
    { id: '2', title: 'data.json', category: 'JSON', vault_path: '/vault/data.json', file_size: 1536 }
  ]

  it('renders document titles', () => {
    render(<SpotliteList results={results} selectedIndex={0} setSelectedIndex={vi.fn()} setHoveredDoc={vi.fn()} />)
    expect(screen.getByText('report.pdf')).toBeInTheDocument()
    expect(screen.getByText('data.json')).toBeInTheDocument()
  })

  it('renders file sizes', () => {
    render(<SpotliteList results={results} selectedIndex={0} setSelectedIndex={vi.fn()} setHoveredDoc={vi.fn()} />)
    expect(screen.getByText('2 KB')).toBeInTheDocument()
    expect(screen.getByText('1.5 KB')).toBeInTheDocument()
  })

  it('calls setSelectedIndex and setHoveredDoc on click', () => {
    const setSelectedIndex = vi.fn()
    const setHoveredDoc = vi.fn()
    render(<SpotliteList results={results} selectedIndex={0} setSelectedIndex={setSelectedIndex} setHoveredDoc={setHoveredDoc} />)
    fireEvent.click(screen.getByText('data.json'))
    expect(setSelectedIndex).toHaveBeenCalledWith(1)
    expect(setHoveredDoc).toHaveBeenCalledWith(results[1])
  })

  it('highlights the selected item', () => {
    render(<SpotliteList results={results} selectedIndex={1} setSelectedIndex={vi.fn()} setHoveredDoc={vi.fn()} />)
    const selected = screen.getByText('data.json').closest('div[class*="rounded-md"]')
    expect(selected.className).toContain('bg-[var(--bg-active)]')
  })
})

describe('formatBytes', () => {
  it('returns 0 B for falsy input', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(null)).toBe('0 B')
  })

  it('formats bytes to human readable', () => {
    expect(formatBytes(500)).toBe('500 B')
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB')
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB')
  })
})

describe('getFileIcon', () => {
  it('maps categories to icons', () => {
    expect(getFileIcon('PDF')).toBeTruthy()
    expect(getFileIcon('JSON')).toBeTruthy()
    expect(getFileIcon('CSV')).toBeTruthy()
    expect(getFileIcon('XLSX')).toBeTruthy()
    expect(getFileIcon('MD')).toBeTruthy()
    expect(getFileIcon('TXT')).toBeTruthy()
    expect(getFileIcon('JS')).toBeTruthy()
    expect(getFileIcon('PY')).toBeTruthy()
    expect(getFileIcon('SQL')).toBeTruthy()
    expect(getFileIcon('PNG')).toBeTruthy()
    expect(getFileIcon('UNKNOWN')).toBeTruthy()
  })
})
