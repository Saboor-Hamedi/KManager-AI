import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const { query, stream } = await import('../../../../src/renderer/src/lib/Grok')

function createMockStream(chunks) {
  const encoder = new TextEncoder()
  return {
    ok: true,
    body: {
      getReader: () => {
        let i = 0
        return { read: () => {
          if (i < chunks.length) return Promise.resolve({ done: false, value: encoder.encode(chunks[i++]) })
          return Promise.resolve({ done: true, value: undefined })
        }}
      }
    }
  }
}

describe('Grok.query', () => {
  beforeEach(() => mockFetch.mockReset())

  it('sends POST to x.ai API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Hey' } }] })
    })
    const result = await query([{ role: 'user', content: 'hi' }], 'sk-test')
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.x.ai/v1/chat/completions')
    expect(opts.headers['Authorization']).toBe('Bearer sk-test')
    expect(JSON.parse(opts.body).model).toBe('grok-beta')
    expect(result).toBe('Hey')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({ error: { message: 'Bad key' } })
    })
    await expect(query([], 'sk-bad')).rejects.toThrow('Bad key')
  })
})

describe('Grok.stream', () => {
  beforeEach(() => mockFetch.mockReset())

  it('streams content', async () => {
    mockFetch.mockResolvedValue(createMockStream([
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
      'data: [DONE]\n\n'
    ]))
    const result = await stream([], 'sk-key', vi.fn())
    expect(result).toBe('Hi')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 500,
      json: () => Promise.resolve({})
    })
    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow('API returned status 500')
  })
})
