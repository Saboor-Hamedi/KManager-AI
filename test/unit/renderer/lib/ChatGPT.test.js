import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const { query, stream } = await import('../../../../src/renderer/src/lib/ChatGPT')

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

describe('ChatGPT.query', () => {
  beforeEach(() => mockFetch.mockReset())

  it('sends POST to OpenAI API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Reply' } }] })
    })
    const result = await query([{ role: 'user', content: 'hi' }], 'sk-test')
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect(opts.headers['Authorization']).toBe('Bearer sk-test')
    expect(JSON.parse(opts.body).model).toBe('gpt-4o-mini')
    expect(result).toBe('Reply')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({ error: { message: 'Unauthorized' } })
    })
    await expect(query([], 'sk-bad')).rejects.toThrow('Unauthorized')
  })

  it('falls back to status code', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 500,
      json: () => Promise.resolve({})
    })
    await expect(query([], 'sk-key')).rejects.toThrow('ChatGPT API returned status 500')
  })
})

describe('ChatGPT.stream', () => {
  beforeEach(() => mockFetch.mockReset())

  it('streams content and calls onChunk', async () => {
    mockFetch.mockResolvedValue(createMockStream([
      'data: {"choices":[{"delta":{"content":"A"}}]}\n\n',
      'data: [DONE]\n\n'
    ]))
    const onChunk = vi.fn()
    const result = await stream([], 'sk-key', onChunk)
    expect(result).toBe('A')
    expect(onChunk).toHaveBeenCalledOnce()
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 403,
      json: () => Promise.resolve({ error: { message: 'Forbidden' } })
    })
    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow('Forbidden')
  })
})
