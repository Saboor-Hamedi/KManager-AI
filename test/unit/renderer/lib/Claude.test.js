import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

const { query, stream } = await import('../../../../src/renderer/src/lib/Claude')

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

describe('Claude.query', () => {
  beforeEach(() => mockFetch.mockReset())

  it('sends POST to Anthropic API', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ content: [{ text: 'Hello from Claude' }] })
    })
    const messages = [{ role: 'system', content: 'Be helpful' }, { role: 'user', content: 'hi' }]
    const result = await query(messages, 'sk-test')
    const [url, opts] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.anthropic.com/v1/messages')
    expect(opts.headers['x-api-key']).toBe('sk-test')
    expect(opts.headers['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse(opts.body)
    expect(body.model).toBe('claude-3-5-sonnet-20241022')
    expect(body.system).toBe('Be helpful')
    expect(body.messages).toHaveLength(1)
    expect(result).toBe('Hello from Claude')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } })
    })
    await expect(query([], 'sk-bad')).rejects.toThrow('Invalid API key')
  })

  it('falls back to status code', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 429,
      json: () => Promise.resolve({})
    })
    await expect(query([], 'sk-key')).rejects.toThrow('Claude API returned status 429')
  })
})

describe('Claude.stream', () => {
  beforeEach(() => mockFetch.mockReset())

  it('streams content_block_delta events', async () => {
    mockFetch.mockResolvedValue(createMockStream([
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" world"}}\n\n',
      'data: [DONE]\n\n'
    ]))
    const onChunk = vi.fn()
    const result = await stream([], 'sk-key', onChunk)
    expect(result).toBe('Hello world')
    expect(onChunk).toHaveBeenCalledTimes(2)
  })

  it('ignores non-text-delta events', async () => {
    mockFetch.mockResolvedValue(createMockStream([
      'data: {"type":"content_block_start","index":0}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"OK"}}\n\n',
      'data: [DONE]\n\n'
    ]))
    const result = await stream([], 'sk-key', vi.fn())
    expect(result).toBe('OK')
  })

  it('throws on API error', async () => {
    mockFetch.mockResolvedValue({
      ok: false, status: 403,
      json: () => Promise.resolve({ error: { message: 'Forbidden' } })
    })
    await expect(stream([], 'sk-key', vi.fn())).rejects.toThrow('Forbidden')
  })
})
