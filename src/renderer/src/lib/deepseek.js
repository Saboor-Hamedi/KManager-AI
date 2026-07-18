const TIMEOUT_MS = 25000 // 25 seconds

/**
 * Creates a fetch with an AbortController timeout.
 * Returns { response, cleanup } — call cleanup() to cancel the timer after fetch resolves.
 */
const fetchWithTimeout = (url, options, timeoutMs = TIMEOUT_MS) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal })
    .then(response => {
      clearTimeout(timer)
      return response
    })
    .catch(err => {
      clearTimeout(timer)
      if (err.name === 'AbortError') {
        throw new Error('Connection timed out. DeepSeek API is unreachable — check your network or VPN.')
      }
      throw err
    })
}

export const query = async (messages, apiKey) => {
  const response = await fetchWithTimeout('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.3,
      max_tokens: 800
    })
  })

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error?.message || `DeepSeek API returned status ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

export const stream = async (messages, apiKey, onChunk) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response
  try {
    response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.3,
        max_tokens: 1500,
        stream: true
      }),
      signal: controller.signal
    })
  } catch (err) {
    clearTimeout(timer)
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out. DeepSeek API is unreachable — check your network or VPN.')
    }
    throw err
  }

  if (!response.ok) {
    clearTimeout(timer)
    const errData = await response.json().catch(() => ({}))
    throw new Error(errData.error?.message || `API returned status ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let fullAnswer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunkStr = decoder.decode(value, { stream: true })
      const lines = chunkStr.split('\n').filter(line => line.trim() !== '')
      for (const line of lines) {
        if (line === 'data: [DONE]') {
          clearTimeout(timer)
          return fullAnswer
        }
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim()
          try {
            const parsed = JSON.parse(dataStr)
            const content = parsed.choices?.[0]?.delta?.content || ''
            if (content) {
              fullAnswer += content
              if (onChunk) onChunk(fullAnswer)
            }
          } catch (e) {
            // Ignore partial stream packets
          }
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Stream timed out. DeepSeek API is unreachable — check your network or VPN.')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }

  return fullAnswer
}
