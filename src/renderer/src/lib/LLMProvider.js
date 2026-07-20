import * as DeepSeek from './DeepSeek';
import * as ChatGPT from './ChatGPT';
import * as Gemini from './Gemini';
import * as Grok from './Grok';
import * as Claude from './Claude';

const PROVIDERS = {
  deepseek: DeepSeek,
  chatgpt: ChatGPT,
  gemini: Gemini,
  grok: Grok,
  claude: Claude
};

export const queryLLM = async (messages, appState, provider, apiKey) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    throw new Error('API key not configured in Settings.');
  }

  let systemPrompt = `You are KManager AI, an intelligent assistant. You help users with general questions, their documents, and system information.

You have access to information about the user's database:
- **Hybrid Search**: Combines semantic vector search (pgvector), full-text keyword search, and fuzzy trigram matching.
- **Document Ingestion**: Supports PDF, Markdown, JSON, code files. Extracts text and generates embeddings fully offline.
- **RAG Synthesis**: Optional AI-powered answers grounded in the user's documents.
- **Local AI**: All embeddings run locally via @xenova/transformers. No cloud dependency for search.
- **Database Storage**: PostgreSQL 14+ with pgvector extension for document storage.

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
5. NEVER end your response with follow-up questions, suggestions, or offers to help. Just answer the question and stop.
6. If the user asks about features, explain them naturally.
7. Do not mention the database, vault, documents, or sources in your answer unless specifically asked.
8. If the user asks you to write, generate, or formulate a search query or question, format EACH suggested query EXACTLY like this on its own line: [Your suggested query here](#search). Do not add quotes around the text.`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'bot' ? 'assistant' : m.role,
      content: m.attachedFile 
        ? `[Attached File: ${m.attachedFile.name}]\n\n${m.attachedFile.content}\n\nUser Query: ${m.text || m.content}` 
        : (m.text || m.content)
    }))
  ];

  const client = PROVIDERS[provider] || PROVIDERS.deepseek;
  return client.query(apiMessages, apiKey);
};

export const checkIsConversational = async (query, provider, apiKey) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') return false;
  
  // Fast local check for common 1-2 word greetings to save API latency
  const cleanQuery = query.trim().toLowerCase().replace(/[^a-z\s]/g, '');
  if (['hi', 'hello', 'hey', 'greetings', 'sup', 'yo', 'hi there', 'hello there'].includes(cleanQuery)) {
    return true;
  }
  if (cleanQuery.length > 50) return false; // long queries are likely real searches

  const client = PROVIDERS[provider] || PROVIDERS.deepseek;
  try {
    const text = await client.query([
      { 
        role: 'system', 
        content: 'You are a query router. Determine if the user input is a casual conversational greeting or small talk (like "hello", "hi", "how are you", "thanks") OR a real search query for a knowledge base. Reply with EXACTLY ONE WORD: either "CONVERSATIONAL" or "QUERY".' 
      },
      { role: 'user', content: query }
    ], apiKey);
    return text.trim().toUpperCase().includes('CONVERSATIONAL');
  } catch (err) {
    return false;
  }
};

export const streamRagAnswer = async (query, retrievedChunks, provider, apiKey, onChunk, history = []) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
    throw new Error('API key not configured in Settings.');
  }

  const hasContext = retrievedChunks && retrievedChunks.length > 0;
  const contextText = hasContext ? retrievedChunks.map((chunk) => {
    return `${chunk.content || ''}`;
  }).join('\n\n') : '';

  const systemPrompt = `You are a helpful, conversational, and brilliant AI assistant (like ChatGPT). You have access to context extracted from the user's personal documents. Answer their questions naturally, seamlessly blending the provided context with your general knowledge.

### CRITICAL FORMATTING RULES:
1. **Markdown is MANDATORY**: You MUST format your response beautifully using Markdown.
2. **Bold text**: ALWAYS use **bold text** for key concepts, names, and section headers.
3. **Bullet points**: ALWAYS use bullet points (\`-\` or \`*\`) when listing items, differences, or steps. NEVER output plain text lists.
4. **Clean up artifacts**: The provided context is extracted from PDFs and may have weird line breaks or artifacts. Ignore them and output perfectly clean, structured paragraphs.
5. **No Source Citations**: Never say "based on the provided text", "according to the document", or "in the context". Just state the facts as if you naturally know them.
6. **No trailing questions**: Never end your response with "Would you like to know more?", "How else can I help?", or similar follow-ups.`;

  const formattedHistory = (history || [])
    .filter(m => m && m.content && typeof m.content === 'string' && m.content.trim() !== '')
    .map(m => ({
      role: m.role === 'assistant' || m.role === 'bot' ? 'assistant' : 'user',
      content: m.content.trim()
    }));

  const userContent = hasContext
    ? `CONTEXT FROM USER DOCUMENTS:\n---\n${contextText}\n---\n\nUSER QUESTION:\n${query}`
    : `USER QUESTION:\n${query}`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...formattedHistory,
    { role: 'user', content: userContent }
  ];

  const client = PROVIDERS[provider] || PROVIDERS.deepseek;
  return client.stream(apiMessages, apiKey, onChunk);
};

export const fetchDynamicPrompts = async (query, ragAnswer, provider, apiKey) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here' || !query || !ragAnswer) {
    return null;
  }

  try {
    const client = PROVIDERS[provider] || PROVIDERS.deepseek;
    const text = await client.query([
      {
        role: 'system',
        content: 'You are a prompt suggestion engine. Given a user query and an AI synthesized answer, generate EXACTLY 3 short, insightful, engaging follow-up questions that the user might want to ask next to explore the topic further. Return ONLY a valid JSON array of 3 strings, with no markdown, backticks, or extra text. Example format: ["How does X compare to Y?", "Give a practical code example for X", "What are the limitations of Z?"]'
      },
      {
        role: 'user',
        content: `User Query: ${query}\n\nAI Answer: ${ragAnswer}`
      }
    ], apiKey);

    // Attempt to parse the response as JSON
    // Some models wrap in markdown ```json ... ```, so clean it
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/```json/g, '').replace(/```/g, '').trim();
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```/g, '').trim();
    }
    const parsed = JSON.parse(cleanText);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.slice(0, 3);
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch dynamic prompts:', error);
    return null;
  }
};
