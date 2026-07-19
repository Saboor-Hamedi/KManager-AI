import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const { query, stream } = await import('../../../../src/renderer/src/lib/DeepSeek')

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

describe('DeepSeek.query', () => {
  beforeEach(() => mockFetch.mockReset())

  it('sends POST to DeepSeek API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Hello' } }] })
    })
    const result = await query([{ role: 'user', content: 'hi' }], 'sk-test')
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.deepseek.com/chat/completions')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Authorization']).toBe('Bearer sk-test')
    expect(JSON.parse(opts.body).model).toBe('deepseek-chat')
    expect(result).toBe('Hello')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({ error: { message: 'Unauthorized' } })
    })
    await expect(query([], 'sk-bad')).rejects.toThrow('Unauthorized')
  })

  // Slow test: waits for DeepSeek's built-in 25s timeout
  it.skip('aborts on timeout', async () => {
    mockFetch.mockImplementation((url, opts) => {
      return new Promise((_, reject) => {
        opts.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
      })
    })
    await expect(query([], 'sk-key')).rejects.toThrow('timed out')
  })
})

describe('DeepSeek.stream', () => {
  beforeEach(() => mockFetch.mockReset())

  it('streams content and calls onChunk', async () => {
    mockFetch.mockResolvedValue(createMockStream([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n'
    ]))
    const onChunk = vi.fn()
    const result = await stream([], 'sk-key', onChunk)
    expect(result).toBe('Hello world')
    expect(onChunk).toHaveBeenCalledTimes(2)
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limited' } })
    })
    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow('Rate limited')
  })
})
