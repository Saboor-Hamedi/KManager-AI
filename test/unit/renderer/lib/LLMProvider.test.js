import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockQuery = vi.fn()
const mockStream = vi.fn()

vi.mock('../../../../src/renderer/src/lib/DeepSeek', () => ({ query: mockQuery, stream: mockStream }))
vi.mock('../../../../src/renderer/src/lib/ChatGPT', () => ({ query: mockQuery, stream: mockStream }))
vi.mock('../../../../src/renderer/src/lib/Gemini', () => ({ query: mockQuery, stream: mockStream }))
vi.mock('../../../../src/renderer/src/lib/Grok', () => ({ query: mockQuery, stream: mockStream }))
vi.mock('../../../../src/renderer/src/lib/Claude', () => ({ query: mockQuery, stream: mockStream }))

const { queryLLM, checkIsConversational, streamRagAnswer, fetchDynamicPrompts } = await import('../../../../src/renderer/src/lib/LLMProvider')

describe('queryLLM', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('throws if no API key', async () => {
    await expect(queryLLM([], {}, 'deepseek', '')).rejects.toThrow('API key not configured')
  })

  it('throws if placeholder API key', async () => {
    await expect(queryLLM([], {}, 'deepseek', 'your_deepseek_api_key_here')).rejects.toThrow('API key not configured')
  })

  it('throws if deepseek placeholder key used with any provider', async () => {
    const providers = ['deepseek', 'chatgpt', 'gemini', 'grok', 'claude']
    for (const prov of providers) {
      await expect(queryLLM([], {}, prov, 'your_deepseek_api_key_here')).rejects.toThrow('API key not configured')
    }
  })

  it('delegates to the specified provider', async () => {
    mockQuery.mockResolvedValue('response')
    const result = await queryLLM([{ role: 'user', text: 'hello' }], {}, 'deepseek', 'sk-valid')
    expect(mockQuery).toHaveBeenCalledOnce()
    const [apiMessages, apiKey] = mockQuery.mock.calls[0]
    expect(apiKey).toBe('sk-valid')
    expect(apiMessages).toHaveLength(2)
    expect(apiMessages[0].role).toBe('system')
    expect(apiMessages[1].role).toBe('user')
    expect(result).toBe('response')
  })

  it('converts bot role to assistant', async () => {
    mockQuery.mockResolvedValue('ok')
    await queryLLM([{ role: 'bot', text: 'hi' }], {}, 'gemini', 'sk-valid')
    expect(mockQuery.mock.calls[0][0][1].role).toBe('assistant')
  })

  it('filters out user-provided system messages, replaces with its own', async () => {
    mockQuery.mockResolvedValue('ok')
    await queryLLM([{ role: 'system', content: 'custom instruction' }, { role: 'user', text: 'hi' }], {}, 'deepseek', 'sk-key')
    const apiMessages = mockQuery.mock.calls[0][0]
    expect(apiMessages).toHaveLength(2)
    expect(apiMessages[0].role).toBe('system')
    expect(apiMessages[0].content).toContain('KManager AI')
    expect(apiMessages[1].role).toBe('user')
  })

  it('fallback to deepseek for unknown provider', async () => {
    mockQuery.mockResolvedValue('fallback')
    const result = await queryLLM([], {}, 'nonexistent', 'sk-key')
    expect(result).toBe('fallback')
  })

  it('includes system prompt with app state', async () => {
    mockQuery.mockResolvedValue('ok')
    await queryLLM([], { activeTab: 'Dashboard', totalDocuments: 10, totalChunks: 50, recentSearches: 3, filesByType: [{ file_type: 'pdf', count: 5 }] }, 'deepseek', 'sk-key')
    const systemMsg = mockQuery.mock.calls[0][0][0]
    expect(systemMsg.content).toContain('KManager AI')
    expect(systemMsg.content).toContain('Dashboard')
    expect(systemMsg.content).toContain('10')
    expect(systemMsg.content).toContain('50')
    expect(systemMsg.content).toContain('pdf: 5')
  })

  it('handles empty app state gracefully', async () => {
    mockQuery.mockResolvedValue('ok')
    await queryLLM([], {}, 'deepseek', 'sk-key')
    const systemMsg = mockQuery.mock.calls[0][0][0]
    expect(systemMsg.content).toContain('Unknown')
    expect(systemMsg.content).toContain('N/A')
  })

  it('handles provider rejection', async () => {
    mockQuery.mockRejectedValue(new Error('Rate limit exceeded'))
    await expect(queryLLM([], {}, 'deepseek', 'sk-key')).rejects.toThrow('Rate limit exceeded')
  })

  it('passes messages with text field as content', async () => {
    mockQuery.mockResolvedValue('ok')
    await queryLLM([{ role: 'user', text: 'hello' }], {}, 'deepseek', 'sk-key')
    expect(mockQuery.mock.calls[0][0][1].content).toBe('hello')
  })

  it('passes messages with content field directly', async () => {
    mockQuery.mockResolvedValue('ok')
    await queryLLM([{ role: 'user', content: 'direct content' }], {}, 'deepseek', 'sk-key')
    expect(mockQuery.mock.calls[0][0][1].content).toBe('direct content')
  })

  it('routes to each provider', async () => {
    mockQuery.mockResolvedValue('routed')
    for (const prov of ['deepseek', 'chatgpt', 'gemini', 'grok', 'claude']) {
      await queryLLM([], {}, prov, 'sk-key')
      expect(mockQuery).toHaveBeenCalled()
      mockQuery.mockReset()
    }
  })
})

describe('checkIsConversational', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  it('returns false for empty API key', async () => {
    expect(await checkIsConversational('hi', 'deepseek', '')).toBe(false)
  })

  it('returns false for placeholder API key', async () => {
    expect(await checkIsConversational('hi', 'deepseek', 'your_deepseek_api_key_here')).toBe(false)
  })

  it('returns true for common greetings without API call', async () => {
    for (const greeting of ['hi', 'hello', 'hey', 'greetings', 'sup', 'yo', 'hi there', 'hello there']) {
      expect(await checkIsConversational(greeting, 'deepseek', 'sk-valid')).toBe(true)
    }
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('is case-insensitive for greetings', async () => {
    expect(await checkIsConversational('Hello', 'deepseek', 'sk-valid')).toBe(true)
    expect(await checkIsConversational('HEY', 'deepseek', 'sk-valid')).toBe(true)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('strips punctuation from greetings', async () => {
    expect(await checkIsConversational('hello!', 'deepseek', 'sk-valid')).toBe(true)
    expect(await checkIsConversational('hi.', 'deepseek', 'sk-valid')).toBe(true)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('returns false for long queries without API call', async () => {
    expect(await checkIsConversational('a'.repeat(51), 'deepseek', 'sk-valid')).toBe(false)
  })

  it('returns false for exactly 50 char non-greeting query', async () => {
    mockQuery.mockResolvedValue('QUERY')
    expect(await checkIsConversational('x'.repeat(50), 'deepseek', 'sk-valid')).toBe(false)
    expect(mockQuery).toHaveBeenCalledOnce()
  })

  it('delegates to provider for ambiguous short queries', async () => {
    mockQuery.mockResolvedValue('CONVERSATIONAL')
    expect(await checkIsConversational('thanks', 'deepseek', 'sk-valid')).toBe(true)
    expect(mockQuery).toHaveBeenCalledOnce()
  })

  it('returns false if provider response contains QUERY', async () => {
    mockQuery.mockResolvedValue('QUERY')
    expect(await checkIsConversational('how many documents', 'deepseek', 'sk-valid')).toBe(false)
  })

  it('trims whitespace from provider response', async () => {
    mockQuery.mockResolvedValue('  CONVERSATIONAL  ')
    expect(await checkIsConversational('thanks', 'deepseek', 'sk-valid')).toBe(true)
  })

  it('returns false on API error', async () => {
    mockQuery.mockRejectedValue(new Error('API error'))
    expect(await checkIsConversational('how are you', 'deepseek', 'sk-valid')).toBe(false)
  })

  it('sends system prompt for routing', async () => {
    mockQuery.mockResolvedValue('QUERY')
    await checkIsConversational('tell me about cancer', 'deepseek', 'sk-valid')
    const [apiMessages] = mockQuery.mock.calls[0]
    expect(apiMessages[0].role).toBe('system')
    expect(apiMessages[0].content).toContain('query router')
    expect(apiMessages[1].content).toBe('tell me about cancer')
  })

  it('fallback to deepseek for unknown provider', async () => {
    mockQuery.mockResolvedValue('CONVERSATIONAL')
    expect(await checkIsConversational('yo', 'nonexistent', 'sk-key')).toBe(true)
  })
})

describe('streamRagAnswer', () => {
  beforeEach(() => {
    mockStream.mockReset()
    mockQuery.mockReset()
  })

  it('throws if no API key', async () => {
    await expect(streamRagAnswer('query', [], 'deepseek', '')).rejects.toThrow('API key not configured')
  })

  it('throws if placeholder API key', async () => {
    await expect(streamRagAnswer('q', [], 'deepseek', 'your_deepseek_api_key_here')).rejects.toThrow('API key not configured')
  })

  it('delegates to provider with context when chunks provided', async () => {
    mockStream.mockResolvedValue('answer')
    const chunks = [{ content: 'PSA is a biomarker' }]
    const onChunk = vi.fn()
    await streamRagAnswer('what is PSA', chunks, 'deepseek', 'sk-key', onChunk)

    expect(mockStream).toHaveBeenCalledOnce()
    const [apiMessages, apiKey] = mockStream.mock.calls[0]
    expect(apiKey).toBe('sk-key')
    expect(apiMessages).toHaveLength(2)
    expect(apiMessages[0].role).toBe('system')
    expect(apiMessages[1].content).toContain('PSA is a biomarker')
    expect(apiMessages[1].content).toContain('what is PSA')
  })

  it('does not include context text when chunks are empty', async () => {
    mockStream.mockResolvedValue('answer')
    await streamRagAnswer('question', [], 'deepseek', 'sk-key', vi.fn())
    const userContent = mockStream.mock.calls[0][0][1].content
    expect(userContent).not.toContain('Here is relevant information')
    expect(userContent).toContain('Question: question')
  })

  it('does not include context text when chunks is null', async () => {
    mockStream.mockResolvedValue('answer')
    await streamRagAnswer('question', null, 'deepseek', 'sk-key', vi.fn())
    const userContent = mockStream.mock.calls[0][0][1].content
    expect(userContent).not.toContain('Here is relevant information')
  })

  it('includes conversation history', async () => {
    mockStream.mockResolvedValue('answer')
    const history = [{ role: 'user', content: 'previous q' }, { role: 'assistant', content: 'previous a' }]
    await streamRagAnswer('new q', [], 'deepseek', 'sk-key', vi.fn(), history)

    const apiMessages = mockStream.mock.calls[0][0]
    expect(apiMessages).toHaveLength(4)
    expect(apiMessages[1].content).toBe('previous q')
    expect(apiMessages[2].content).toBe('previous a')
    expect(apiMessages[3].content).toContain('new q')
  })

  it('filters out empty history entries', async () => {
    mockStream.mockResolvedValue('answer')
    const history = [{ role: 'user', content: '' }, { role: 'user', content: 'valid' }]
    await streamRagAnswer('q', [], 'deepseek', 'sk-key', vi.fn(), history)
    const apiMessages = mockStream.mock.calls[0][0]
    expect(apiMessages).toHaveLength(3)
  })

  it('converts bot role to assistant in history', async () => {
    mockStream.mockResolvedValue('answer')
    const history = [{ role: 'bot', content: 'previous answer' }]
    await streamRagAnswer('q', [], 'deepseek', 'sk-key', vi.fn(), history)
    expect(mockStream.mock.calls[0][0][1].role).toBe('assistant')
  })

  it('calls onChunk with each accumulated chunk from stream', async () => {
    let callIndex = 0
    const expectedAccumulations = ['Hello', 'Hello world', 'Hello world!']
    mockStream.mockImplementation(async (messages, apiKey, onChunk) => {
      for (const acc of expectedAccumulations) {
        onChunk(acc)
      }
      return 'Hello world!'
    })
    const onChunk = vi.fn()
    const result = await streamRagAnswer('q', [], 'deepseek', 'sk-key', onChunk)
    expect(result).toBe('Hello world!')
    expect(onChunk).toHaveBeenCalledTimes(3)
    expect(onChunk).toHaveBeenNthCalledWith(1, 'Hello')
    expect(onChunk).toHaveBeenNthCalledWith(2, 'Hello world')
    expect(onChunk).toHaveBeenNthCalledWith(3, 'Hello world!')
  })

  it('system prompt instructs to never mention sources', async () => {
    mockStream.mockResolvedValue('answer')
    await streamRagAnswer('q', [{ content: 'data' }], 'deepseek', 'sk-key', vi.fn())
    const systemMsg = mockStream.mock.calls[0][0][0].content
    expect(systemMsg).toContain('Never mention sources')
    expect(systemMsg).toContain('Do not say "based on"')
  })

  it('fallback to deepseek for unknown provider', async () => {
    mockStream.mockResolvedValue('ok')
    await streamRagAnswer('q', [], 'nonexistent', 'sk-key', vi.fn())
    expect(mockStream).toHaveBeenCalled()
  })

  it('handles provider stream error', async () => {
    mockStream.mockRejectedValue(new Error('Stream interrupted'))
    await expect(streamRagAnswer('q', [], 'deepseek', 'sk-key', vi.fn())).rejects.toThrow('Stream interrupted')
  })
})

describe('fetchDynamicPrompts', () => {
  beforeEach(() => {
    mockQuery.mockReset()
    mockStream.mockReset()
  })

  it('returns null if no API key', async () => {
    expect(await fetchDynamicPrompts('q', 'a', 'deepseek', '')).toBeNull()
  })

  it('returns null if placeholder API key', async () => {
    expect(await fetchDynamicPrompts('q', 'a', 'deepseek', 'your_deepseek_api_key_here')).toBeNull()
  })

  it('returns null if query is empty', async () => {
    expect(await fetchDynamicPrompts('', 'a', 'deepseek', 'sk-key')).toBeNull()
  })

  it('returns null if ragAnswer is empty', async () => {
    expect(await fetchDynamicPrompts('q', '', 'deepseek', 'sk-key')).toBeNull()
  })

  it('returns null if query is null', async () => {
    expect(await fetchDynamicPrompts(null, 'answer', 'deepseek', 'sk-key')).toBeNull()
  })

  it('returns null if ragAnswer is null', async () => {
    expect(await fetchDynamicPrompts('q', null, 'deepseek', 'sk-key')).toBeNull()
  })

  it('returns parsed prompt suggestions on success', async () => {
    mockQuery.mockResolvedValue('["Tell me more", "How does it work?", "Show an example"]')
    const result = await fetchDynamicPrompts('biomarkers', 'PSA is a biomarker.', 'deepseek', 'sk-key')
    expect(result).toEqual(['Tell me more', 'How does it work?', 'Show an example'])
  })

  it('strips markdown code fences from response', async () => {
    mockQuery.mockResolvedValue('```json\n["First prompt", "Second prompt", "Third prompt"]\n```')
    const result = await fetchDynamicPrompts('q', 'a', 'deepseek', 'sk-key')
    expect(result).toEqual(['First prompt', 'Second prompt', 'Third prompt'])
  })

  it('strips fences without json language tag', async () => {
    mockQuery.mockResolvedValue('```\n["A", "B", "C"]\n```')
    const result = await fetchDynamicPrompts('q', 'a', 'deepseek', 'sk-key')
    expect(result).toEqual(['A', 'B', 'C'])
  })

  it('returns null on JSON parse failure', async () => {
    mockQuery.mockResolvedValue('not valid json')
    const result = await fetchDynamicPrompts('q', 'a', 'deepseek', 'sk-key')
    expect(result).toBeNull()
  })

  it('returns null on non-array JSON', async () => {
    mockQuery.mockResolvedValue('{"key": "value"}')
    const result = await fetchDynamicPrompts('q', 'a', 'deepseek', 'sk-key')
    expect(result).toBeNull()
  })

  it('returns null on empty array', async () => {
    mockQuery.mockResolvedValue('[]')
    const result = await fetchDynamicPrompts('q', 'a', 'deepseek', 'sk-key')
    expect(result).toBeNull()
  })

  it('truncates to 3 prompts if more returned', async () => {
    mockQuery.mockResolvedValue('["A", "B", "C", "D", "E"]')
    const result = await fetchDynamicPrompts('q', 'a', 'deepseek', 'sk-key')
    expect(result).toEqual(['A', 'B', 'C'])
  })

  it('returns null on API error', async () => {
    mockQuery.mockRejectedValue(new Error('API error'))
    const result = await fetchDynamicPrompts('q', 'a', 'deepseek', 'sk-key')
    expect(result).toBeNull()
  })

  it('sends query and ragAnswer in the user message', async () => {
    mockQuery.mockResolvedValue('["Q1", "Q2", "Q3"]')
    await fetchDynamicPrompts('my query', 'my answer', 'deepseek', 'sk-key')
    const userMsg = mockQuery.mock.calls[0][0][1]
    expect(userMsg.content).toContain('my query')
    expect(userMsg.content).toContain('my answer')
  })

  it('fallback to deepseek for unknown provider', async () => {
    mockQuery.mockResolvedValue('["A", "B", "C"]')
    const result = await fetchDynamicPrompts('q', 'a', 'nonexistent', 'sk-key')
    expect(result).toEqual(['A', 'B', 'C'])
  })
})
