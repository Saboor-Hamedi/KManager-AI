import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
let mockPoolInstance = null

vi.mock('pg', () => {
  class MockPool {
    constructor(config) {
      this.config = config
      mockPoolInstance = this
    }
    connect() {
      return Promise.resolve({
        query: mockQuery,
        release: vi.fn()
      })
    }
    end() {
      return Promise.resolve()
    }
  }
  return { Pool: MockPool }
})

const { Database } = await import('../../../../src/main/db/database')

describe('Database', () => {
  let db

  beforeEach(() => {
    vi.clearAllMocks()
    mockPoolInstance = null
    db = new Database({
      host: 'localhost',
      port: 5432,
      database: 'testdb',
      user: 'testuser',
      password: 'testpass'
    })
  })

  it('stores config correctly', () => {
    expect(db.config.host).toBe('localhost')
    expect(db.config.port).toBe(5432)
    expect(db.config.database).toBe('testdb')
    expect(db.config.max).toBe(10)
  })

  it('starts disconnected', () => {
    expect(db.isConnected()).toBe(false)
    expect(db.pool).toBeNull()
  })

  it('connect returns success and creates pool', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ connected: 1 }] })
    const result = await db.connect()
    expect(result.success).toBe(true)
  })

  it('disconnect clears pool', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ connected: 1 }] })
    await db.connect()
    await db.disconnect()
    expect(db.pool).toBeNull()
  })

  it('isConnected returns true after connect', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ connected: 1 }] })
    await db.connect()
    expect(db.isConnected()).toBe(true)
  })

  it('isConnected returns false after disconnect', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ connected: 1 }] })
    await db.connect()
    await db.disconnect()
    expect(db.isConnected()).toBe(false)
  })
})
