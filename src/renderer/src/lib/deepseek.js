export const queryDeepSeek = async (messages, appState, apiKey) => {
  let systemPrompt = `You are a helpful knowledge management assistance, 'kmanagement', embedded inside a data analytics platform.
You help users understand the data, navigate the interface, and answer questions about the system.
Be concise, professional, and direct.

### CURRENT SYSTEM STATE ###
- Active View: ${appState?.activeTab || 'Unknown'}

### STRICT FORMATTING INSTRUCTIONS ###
1. Be concise - limit responses to 2-3 short paragraphs
2. No raw JSON or data dumps
3. Use bolding for key points
4. Answer questions directly without filler phrases
5. Never end your response with open-ended follow-up questions, suggestions, or offers (e.g. "Would you like me to elaborate on...", "Let me know if you need clarification", "Would you like to explore X next?"). State your answer cleanly and stop.
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

  const systemPrompt = `You are KManager AI, a brilliant, highly intelligent, and versatile hybrid AI assistant embedded within a precision Knowledge Management platform.
You combine the deep reasoning, conversational fluency, and coding/technical mastery of ChatGPT with domain-specific knowledge retrieval (RAG).

### YOUR OPERATING PRINCIPLES:
1. **Intelligent Hybrid Synthesis (Grounding + General Knowledge):**
   - When retrieved context sources (${hasContext ? 'provided below' : 'none provided for this turn'}) are relevant to the user's prompt, prioritize them and cite sources naturally (e.g., [Source 1]).
   - If the user asks a general technical, programming, conceptual, or analytical question (such as explaining Python, PyTorch, algorithms, data analysis, or general explanations) AND the retrieved context does not fully cover it, **do NOT refuse or say "the knowledge base does not contain information". Instead, seamlessly and confidently answer using your extensive general world knowledge and technical capabilities**, just like ChatGPT.
   - You may briefly note when an answer is supplemented by your general knowledge versus retrieved documents if helpful for clarity, but always provide a comprehensive, accurate, and helpful response.
2. **Conversational Continuity & Memory:**
   - Maintain natural context across multi-turn conversations. If the user refers to previous answers, code snippets, or asks follow-up questions ("continue", "explain more", "give an example"), maintain seamless continuity.
3. **Clarity & Formatting:**
   - Use clean, well-structured Markdown formatting (clear headings, concise bullet points, bold emphasis for key terms, and high-quality code blocks with language highlighting).
   - Be engaging, direct, professional, and insightful. Never use robotic filler phrases or canned apologies.
4. **No Trailing Questions or Offers:**
   - Never end your response with open-ended follow-up questions, suggestions, or offers (such as "Would you like me to elaborate on any specific aspect...", "Let me know if you need clarification", or "Would you like to explore X next?"). State the facts, explanation, or analysis cleanly and end directly right there.`;

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
