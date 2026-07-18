import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const { query, stream } = await import('../../../../src/renderer/src/lib/Gemini')

describe('Gemini.query', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends POST request to Gemini OpenAI-compatible endpoint', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'Hello from Gemini' } }] })
    })

    const messages = [{ role: 'user', content: 'hello' }]
    const result = await query(messages, 'sk-test')

    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions')
    expect(opts.method).toBe('POST')
    expect(opts.headers['Authorization']).toBe('Bearer sk-test')
    expect(opts.headers['Content-Type']).toBe('application/json')

    const body = JSON.parse(opts.body)
    expect(body.model).toBe('gemini-2.5-flash')
    expect(body.messages).toEqual(messages)
    expect(body.temperature).toBe(0.3)
    expect(body.max_tokens).toBe(800)

    expect(result).toBe('Hello from Gemini')
  })

  it('sends multiple messages in the body', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: 'ok' } }] })
    })
    const messages = [
      { role: 'system', content: 'be helpful' },
      { role: 'user', content: 'hello' }
    ]
    await query(messages, 'sk-key')
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.messages).toHaveLength(2)
    expect(body.messages[0].content).toBe('be helpful')
  })

  it('parses error message from API error response', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'API key invalid' } })
    })

    await expect(query([], 'sk-bad')).rejects.toThrow('API key invalid')
  })

  it('falls back to status code when error response has no message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({})
    })

    await expect(query([], 'sk-bad')).rejects.toThrow('Gemini API returned status 500')
  })

  it('handles JSON parse failure in error path', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.reject(new Error('invalid json'))
    })

    await expect(query([], 'sk-bad')).rejects.toThrow('Gemini API returned status 403')
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))
    await expect(query([], 'sk-key')).rejects.toThrow('Network failure')
  })

  it('handles 429 rate limit with retry-after info in error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limit exceeded. Retry after 30s.' } })
    })
    await expect(query([], 'sk-key')).rejects.toThrow('Rate limit exceeded')
  })

  it('handles empty response content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: '' } }] })
    })
    const result = await query([{ role: 'user', content: 'hi' }], 'sk-key')
    expect(result).toBe('')
  })

  it('errors on missing choices array', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({})
    })
    await expect(query([], 'sk-key')).rejects.toThrow()
  })
})

describe('Gemini.stream', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  function createMockStream(chunks) {
    const encoder = new TextEncoder()
    return {
      ok: true,
      body: {
        getReader: () => {
          let i = 0
          return {
            read: () => {
              if (i < chunks.length) {
                return Promise.resolve({ done: false, value: encoder.encode(chunks[i++]) })
              }
              return Promise.resolve({ done: true, value: undefined })
            }
          }
        }
      }
    }
  }

  it('sends POST with stream: true and calls onChunk with accumulated content', async () => {
    const streamChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n'
    ]
    mockFetch.mockResolvedValue(createMockStream(streamChunks))

    const onChunk = vi.fn()
    const result = await stream([{ role: 'user', content: 'hi' }], 'sk-test', onChunk)

    const [, opts] = mockFetch.mock.calls[0]
    const body = JSON.parse(opts.body)
    expect(body.stream).toBe(true)
    expect(body.max_tokens).toBe(1500)

    expect(result).toBe('Hello world')
    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello')
    expect(onChunk).toHaveBeenNthCalledWith(2, 'Hello world')
  })

  it('handles empty streaming response', async () => {
    mockFetch.mockResolvedValue(createMockStream(['data: [DONE]\n\n']))

    const onChunk = vi.fn()
    const result = await stream([], 'sk-key', onChunk)
    expect(result).toBe('')
    expect(onChunk).not.toHaveBeenCalled()
  })

  it('ignores non-data lines', async () => {
    const streamChunks = [
      ': heartbeat\n\n',
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      'data: [DONE]\n\n'
    ]
    mockFetch.mockResolvedValue(createMockStream(streamChunks))

    const result = await stream([], 'sk-key', vi.fn())
    expect(result).toBe('ok')
  })

  it('handles multiple data events in a single chunk', async () => {
    const streamChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\ndata: {"choices":[{"delta":{"content":" world"}}]}\n\ndata: [DONE]\n\n'
    ]
    mockFetch.mockResolvedValue(createMockStream(streamChunks))

    const onChunk = vi.fn()
    const result = await stream([], 'sk-key', onChunk)
    expect(result).toBe('Hello world')
    expect(onChunk).toHaveBeenCalledTimes(2)
  })

  it('tolerates partial/incomplete JSON lines', async () => {
    const streamChunks = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: incomplete\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      'data: [DONE]\n\n'
    ]
    mockFetch.mockResolvedValue(createMockStream(streamChunks))

    const onChunk = vi.fn()
    const result = await stream([], 'sk-key', onChunk)
    expect(result).toBe('Hello world')
    expect(onChunk).toHaveBeenCalledTimes(2)
  })

  it('handles content split across many small chunks', async () => {
    const words = ['The ', 'quick ', 'brown ', 'fox ', 'jumps.']
    const streamChunks = words.map(w => `data: {"choices":[{"delta":{"content":"${w}"}}]}\n\n`)
    streamChunks.push('data: [DONE]\n\n')
    mockFetch.mockResolvedValue(createMockStream(streamChunks))

    const onChunk = vi.fn()
    const result = await stream([], 'sk-key', onChunk)
    expect(result).toBe('The quick brown fox jumps.')
    expect(onChunk).toHaveBeenCalledTimes(5)
    expect(onChunk).toHaveBeenNthCalledWith(5, 'The quick brown fox jumps.')
  })

  it('parses error message from streaming API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: { message: 'Rate limited' } })
    })

    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow('Rate limited')
  })

  it('fallback to status code when streaming error has no message', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({})
    })

    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow('API returned status 503')
  })

  it('handles JSON parse failure in streaming error path', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.reject(new Error('parse error'))
    })

    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow('API returned status 403')
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'))
    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow('Network failure')
  })

  it('handles missing body reader', async () => {
    mockFetch.mockResolvedValue({ ok: true, body: null })
    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow()
  })
})
