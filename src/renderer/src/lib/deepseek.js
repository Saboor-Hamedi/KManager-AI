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
