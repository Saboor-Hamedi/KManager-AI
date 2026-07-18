export const query = async (messages, apiKey) => {
  // Extract system prompt from messages, as Claude requires it at the top level
  const systemMessage = messages.find(m => m.role === 'system');
  const system = systemMessage ? systemMessage.content : '';
  const filteredMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      system,
      messages: filteredMessages,
      temperature: 0.3,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Claude API returned status ${response.status}`);
  }

  const data = await response.json();
  return data.content[0].text;
};

export const stream = async (messages, apiKey, onChunk) => {
  const systemMessage = messages.find(m => m.role === 'system');
  const system = systemMessage ? systemMessage.content : '';
  const filteredMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      system,
      messages: filteredMessages,
      temperature: 0.3,
      max_tokens: 1500,
      stream: true
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `API returned status ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullAnswer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunkStr = decoder.decode(value, { stream: true });
    const lines = chunkStr.split('\n').filter(line => line.trim() !== '');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
            const content = parsed.delta.text || '';
            if (content) {
              fullAnswer += content;
              if (onChunk) onChunk(fullAnswer);
            }
          }
        } catch (e) {
          // Ignore partial stream packets
        }
      }
    }
  }

  return fullAnswer;
};
