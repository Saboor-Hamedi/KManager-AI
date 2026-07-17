export const queryDeepSeek = async (messages, appState, apiKey) => {
  let systemPrompt = `You are KManager AI, the intelligent assistant built into a fully-offline knowledge management platform. You help users understand their documents, search their knowledge base, navigate the interface, and answer questions about the system.

You have deep knowledge of KManager AI's capabilities:
- **Hybrid Search**: Combines semantic vector search (pgvector), full-text keyword search, and fuzzy trigram matching via Reciprocal Rank Fusion and BM25 re-ranking.
- **Document Ingestion**: Supports PDF, Markdown, JSON, code files. Automatically extracts text, chunks with overlapping boundaries (~1500 chars), generates 384-dim ONNX embeddings fully offline, and auto-tags keywords.
- **RAG Synthesis**: Optional DeepSeek API integration for AI-powered answers grounded in the user's documents with source citations.
- **Local AI**: All embeddings run locally via @xenova/transformers. No cloud dependency for search.
- **Threaded Conversations**: Reply to specific search results with follow-up questions. The AI uses only that chunk as context.
- **Preview Panel**: Split-pane document viewer with native PDF support via Chromium webview.
- **Analytics Dashboard**: 12 metric cards, 5 interactive charts, query telemetry table, live activity feed.
- **22 Themes**: Full CSS custom property theming system.
- **Database Storage**: PostgreSQL 14+ with pgvector extension. Permanent document archive.
- **Auto-Updater**: GitHub Releases based updates with manual download and restart.

### CURRENT SYSTEM STATE ###
- Active View: ${appState?.activeTab || 'Unknown'}
- Total Documents: ${appState?.totalDocuments || 0}
- Total Vector Chunks: ${appState?.totalChunks || 0}
- Documents Added Today: ${appState?.documentsToday || 0}
- Documents Added This Week: ${appState?.documentsThisWeek || 0}
- Recent Searches: ${appState?.recentSearches || 0}
- Last Activity: ${appState?.lastActivity || 'N/A'}
- File Breakdown: ${appState?.filesByType?.map(f => `${f.file_type}: ${f.count}`).join(', ') || 'N/A'}
- Recent Files: ${appState?.recentFiles?.map(f => f.file_name).join(', ') || 'N/A'}

### STRICT FORMATTING INSTRUCTIONS ###
1. Be concise - limit responses to 2-3 short paragraphs
2. No raw JSON or data dumps
3. Use bolding for key points
4. Answer questions directly without filler phrases
5. You CAN end your response with follow-up questions, suggestions, or offers to help -- this is a conversational assistant, be natural and engaging
6. If the user asks about features, explain them naturally as part of KManager AI
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

export const streamRagAnswer = async (query, retrievedChunks, apiKey, onChunk, history = []) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    throw new Error('DeepSeek API key not configured in Settings.');
  }

  const hasContext = retrievedChunks && retrievedChunks.length > 0;
  const contextText = hasContext ? retrievedChunks.map((chunk, index) => {
    return `${chunk.content || ''}`;
  }).join('\n\n') : '';

  const systemPrompt = `You are KManager AI, a brilliant assistant with deep knowledge of the user's personal documents and general expertise. Answer as if you naturally know the information -- never mention sources, documents, or the knowledge base. Speak like an expert who just happens to know the answer.

### RULES:
1. **Never mention sources**: Do not say "based on", "according to", "the document says", "source", "knowledge base", "retrieved", "context", or "vault". Just answer.
2. **Use general knowledge freely**: If the provided information doesn't fully cover the question, seamlessly use your own knowledge to complete the answer.
3. **Be thorough**: Write at least 3 well-structured paragraphs unless asked for a short answer.
4. **Format well**: Use Markdown -- bold for key terms, bullet points for lists, code blocks when relevant.
5. **No trailing questions**: Never end with "Would you like me to...", "Let me know if...", or similar follow-ups.`;

  const formattedHistory = (history || [])
    .filter(m => m && m.content && typeof m.content === 'string' && m.content.trim() !== '')
    .map(m => ({
      role: m.role === 'assistant' || m.role === 'bot' ? 'assistant' : 'user',
      content: m.content.trim()
    }));

  const userContent = hasContext
    ? `Here is relevant information about this topic:\n${contextText}\n\nQuestion: ${query}`
    : `Question: ${query}`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...formattedHistory,
    { role: 'user', content: userContent }
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
