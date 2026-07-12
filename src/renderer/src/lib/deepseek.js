export const queryDeepSeek = async (messages, appState, apiKey) => {
  let systemPrompt = `You are a helpful dashboard assistant embedded inside a data analytics platform.
You help users understand the data, navigate the interface, and answer questions about the system.
Be concise, professional, and direct.

### CURRENT SYSTEM STATE ###
- Active View: ${appState?.activeTab || 'Unknown'}

### STRICT FORMATTING INSTRUCTIONS ###
1. Be concise - limit responses to 2-3 short paragraphs
2. No raw JSON or data dumps
3. Use bolding for key points
4. Answer questions directly without filler phrases
`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'bot' ? 'assistant' : m.role,
      content: m.text || m.content
    }))
  ];

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: apiMessages,
      temperature: 0.3,
      max_tokens: 800
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || `DeepSeek API returned status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const checkIsConversational = async (query, apiKey) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') return false;
  
  // Fast local check for common 1-2 word greetings to save API latency
  const cleanQuery = query.trim().toLowerCase().replace(/[^a-z\s]/g, '');
  if (['hi', 'hello', 'hey', 'greetings', 'sup', 'yo', 'hi there', 'hello there'].includes(cleanQuery)) {
    return true;
  }
  if (cleanQuery.length > 50) return false; // long queries are likely real searches

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { 
          role: 'system', 
          content: 'You are a query router. Determine if the user input is a casual conversational greeting or small talk (like "hello", "hi", "how are you", "thanks") OR a real search query for a knowledge base. Reply with EXACTLY ONE WORD: either "CONVERSATIONAL" or "QUERY".' 
        },
        { role: 'user', content: query }
      ],
      temperature: 0.1,
      max_tokens: 10
    })
  }).catch(() => null);

  if (!response || !response.ok) return false;
  const data = await response.json();
  const text = data.choices[0]?.message?.content?.trim() || '';
  return text.toUpperCase().includes('CONVERSATIONAL');
};

export const streamRagAnswer = async (query, retrievedChunks, apiKey, onChunk) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    throw new Error('DeepSeek API key not configured in Settings.');
  }

  const contextText = (retrievedChunks || []).map((chunk, index) => {
    return `[Source ${index + 1}: ${chunk.title || 'Document'}]\n${chunk.content || ''}`;
  }).join('\n\n---\n\n');

  const systemPrompt = `You are KManager AI, a precision Knowledge Management RAG assistant.
Synthesize a direct, highly accurate answer to the user's question based ONLY on the provided retrieved context sources.
If the context does not contain relevant information to answer the question (e.g., if the user just says "Hello"), politely state that you cannot answer based on the knowledge base. Do not rely on outside knowledge or provide generic conversational filler.
Cite sources naturally where helpful (e.g. [Source 1]).
Use clean Markdown formatting, concise bullet points or code blocks where appropriate.`;

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `CONTEXT SOURCES:\n${contextText}\n\nQUESTION: ${query}` }
      ],
      temperature: 0.2,
      max_tokens: 1200,
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
        if (dataStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(dataStr);
          const content = parsed.choices?.[0]?.delta?.content || '';
          if (content) {
            fullAnswer += content;
            if (onChunk) onChunk(fullAnswer);
          }
        } catch (e) {
          // Ignore partial stream packets
        }
      }
    }
  }

  return fullAnswer;
};
