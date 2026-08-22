import { describe, it, expect, vi } from 'vitest'
import FileSizeService from '../../../../src/main/db/fileSize'

describe('FileSizeService.getStorageSize', () => {
  it('returns zeros when db has no query function', async () => {
    const result = await FileSizeService.getStorageSize(null)
    expect(result).toEqual({ raw_file_bytes: 0, total_db_bytes: 0, by_type_details: {} })
  })

  it('computes sizes from the main query', async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce({
          rows: [{ raw_file_bytes: '1024', total_db_bytes: '4096' }]
        })
        .mockResolvedValueOnce({
          rows: [
            { file_type: '.md', cnt: '2', type_bytes: '512' },
            { file_type: 'PDF', cnt: '1', type_bytes: '2048' }
          ]
        })
    }
    const result = await FileSizeService.getStorageSize(db)
    expect(result.raw_file_bytes).toBe(1024)
    expect(result.total_db_bytes).toBe(4096)
    expect(result.by_type_details['.md']).toEqual({ count: 2, bytes: 512 })
    expect(result.by_type_details['md']).toEqual({ count: 2, bytes: 512 })
    expect(result.by_type_details['PDF']).toEqual({ count: 1, bytes: 2048 })
  })

  it('falls back to individual queries when the combined query fails', async () => {
    const db = {
      query: vi.fn()
        .mockRejectedValueOnce(new Error('syntax error'))
        .mockResolvedValueOnce({ rows: [{ raw_file_bytes: '100' }] })
        .mockResolvedValueOnce({ rows: [{ total_db_bytes: '200' }] })
        .mockResolvedValueOnce({ rows: [{ file_type: 'PDF', cnt: '1', type_bytes: '50' }] })
    }
    const result = await FileSizeService.getStorageSize(db)
    expect(result.raw_file_bytes).toBe(100)
    expect(result.total_db_bytes).toBe(200)
    expect(result.by_type_details['PDF'].bytes).toBe(50)
  })

  it('handles query errors gracefully', async () => {
    const db = {
      query: vi.fn().mockRejectedValue(new Error('db down'))
    }
    const result = await FileSizeService.getStorageSize(db)
    expect(result.raw_file_bytes).toBe(0)
    expect(result.total_db_bytes).toBe(0)
  })
})

describe('FileSizeService.formatBytes', () => {
  it('returns 0 B for falsy values', () => {
    expect(FileSizeService.formatBytes(0)).toBe('0 B')
    expect(FileSizeService.formatBytes(null)).toBe('0 B')
  })

  it('formats bytes into human readable units', () => {
    expect(FileSizeService.formatBytes(500)).toBe('500 B')
    expect(FileSizeService.formatBytes(1024)).toBe('1 KB')
    expect(FileSizeService.formatBytes(1536)).toBe('1.5 KB')
    expect(FileSizeService.formatBytes(5 * 1024 * 1024)).toBe('5 MB')
    expect(FileSizeService.formatBytes(3 * 1024 ** 3)).toBe('3 GB')
  })

  it('honors decimals parameter', () => {
    expect(FileSizeService.formatBytes(1536, 0)).toBe('2 KB')
  })
})
