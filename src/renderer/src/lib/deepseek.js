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
    return `[Source ${index + 1}: ${chunk.title || 'Document'}]\n${chunk.content || ''}`;
  }).join('\n\n---\n\n') : '';

  const systemPrompt = `You are a brilliant, highly intelligent, and versatile hybrid AI assistant embedded within a precision Knowledge Management platform.
You possess the deep reasoning, conversational fluency, and coding/technical mastery of an expert AI, while having access to the user's personal knowledge base.

### YOUR OPERATING PRINCIPLES:
1. **Intelligent Hybrid Synthesis (Grounding + General Knowledge):**
   - You will receive "RETRIEVED KNOWLEDGE BASE CONTEXT SOURCES". Use this information to answer the user's prompt.
   - **CRITICAL:** Do NOT ever say "According to the provided sources", "Based on the database", or "The provided text says...". Speak natively and confidently as if you inherently know the information. Integrate the knowledge base facts seamlessly into your answer as your own knowledge.
   - If the user asks a question and the retrieved context does not fully cover it (or is missing), **do NOT refuse or say the knowledge base lacks information. Instead, seamlessly and confidently answer using your extensive general world knowledge and technical capabilities**, just like ChatGPT.
2. **Detail & Depth:**
   - Always provide comprehensive, detailed answers. **Generate at least three well-structured paragraphs** for your explanation unless the user specifically asks for a single sentence.
3. **Beautiful ChatGPT-Style Formatting:**
   - Use clean, beautiful Markdown formatting.
   - Use bold text (**like this**) to highlight key terms, metrics, or important concepts.
   - Use bullet points when listing items.
   - Provide high-quality code blocks with language highlighting if applicable.
4. **Conversational Continuity:**
   - Maintain natural context across multi-turn conversations.
5. **No Trailing Questions or Offers:**
   - Never end your response with open-ended follow-up questions, suggestions, or offers (such as "Would you like me to elaborate on any specific aspect...", or "Let me know if you need clarification"). State the facts, explanation, or analysis cleanly and end directly right there.`;

  const formattedHistory = (history || [])
    .filter(m => m && m.content && typeof m.content === 'string' && m.content.trim() !== '')
    .map(m => ({
      role: m.role === 'assistant' || m.role === 'bot' ? 'assistant' : 'user',
      content: m.content.trim()
    }));

  const userContent = hasContext
    ? `RETRIEVED KNOWLEDGE BASE CONTEXT SOURCES:\n${contextText}\n\nUSER QUERY: ${query}`
    : `USER QUERY: ${query}`;

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
