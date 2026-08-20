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
- Recent Files (last 15): ${appState?.recentFiles?.map(f => `${f.file_name} (inserted: ${new Date(f.created_at).toLocaleString()})`).join(', ') || 'N/A'}

### STRICT FORMATTING INSTRUCTIONS ###
1. Be concise - limit responses to 2-3 short paragraphs
2. No raw JSON or data dumps
3. Use bolding for key points
4. Answer questions directly without filler phrases
5. NEVER end your response with follow-up questions, suggestions, or offers to help. Just answer the question and stop.
6. If the user asks about features, explain them naturally.
7. Do not mention the database, vault, documents, or sources in your answer unless specifically asked.
8. If the user asks you to write, generate, or formulate a search query or question, format EACH suggested query EXACTLY like this on its own line: [Your suggested query here](#search). Do not add quotes around the text.
9. If the user asks you to generate, create, find, or show an image/picture, you MUST respond by returning a Markdown Image block using a service like loremflickr (e.g. \`![Image](https://loremflickr.com/800/600/keyword)\`). DO NOT apologize or say you cannot generate images. Just provide the Markdown Image block directly!`;

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

export const isCasualGreeting = (query = '') => {
  const clean = query.trim().toLowerCase().replace(/[^a-z\s']/g, '').replace(/\s+/g, ' ');
  const greetings = [
    'hi', 'hello', 'hey', 'greetings', 'sup', 'yo', 'hi there', 'hello there',
    'how are you', 'how are you doing', "how's it going", 'good morning',
    'good afternoon', 'good evening', 'thanks', 'thank you', 'thanks much',
    'who are you', 'what is your name', 'what can you do', 'good day', 'ciao',
    'hey ai', 'hello ai', 'hi ai', 'what is up', "whats up"
  ];
  if (greetings.includes(clean)) return true;
  if (clean.length < 35 && greetings.some(g => clean === g || clean.startsWith(g + ' ') || clean.endsWith(' ' + g))) {
    return true;
  }
  return false;
};

export const checkIsConversational = async (query, provider, apiKey) => {
  if (isCasualGreeting(query)) return true;
  if (!apiKey || apiKey === 'your_deepseek_api_key_here') return false;
  
  const cleanQuery = query.trim().toLowerCase().replace(/[^a-z\s]/g, '');
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

export const streamOfflineExtractiveRag = async (query, retrievedChunks, onChunk) => {
  const stopWords = new Set([
    'the','a','an','is','it','not','or','and','to','of','in','that','for',
    'on','are','was','but','this','get','have','what','why','how','does','do',
    'can','will','would','could','should','its','been','has','had','very',
    'just','really','there','their','they','them','then','some','with','out',
    'up','all','if','no','so','my','me','we','he','she','his','her','be','at'
  ])
  
  if (!retrievedChunks || retrievedChunks.length === 0) {
    if (isCasualGreeting(query)) {
      onChunk("Hello! I'm doing great, thank you for asking! I am KManager AI, your intelligent assistant. How can I help you today?")
    } else {
      onChunk("No exact local document matches found in your knowledge base for this query.\n\n*(Tip: Configure a cloud or local LLM API key in **Settings** or enable AI RAG to generate code and answers beyond your stored documents!)*")
    }
    return
  }

  const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2 && !stopWords.has(t))
  
  let synthesizedText = `> [!WARNING]\n> **No AI Provider Key Set**\n> You have not configured an API key in the AI Settings. KManager AI is currently running in an offline heuristic extraction mode. Connect a provider (OpenAI, Gemini, Claude, Grok) for full AI chat synthesis.\n\n### **Local Research Synthesis**\n\nBased on your stored documents regarding **${query}**, here are the primary technical and conceptual findings extracted from your knowledge base:\n\n#### **Key Insights & Evidence**\n\n`
  onChunk(synthesizedText)
  await new Promise(resolve => setTimeout(resolve, 20))

  for (let i = 0; i < Math.min(retrievedChunks.length, 5); i++) {
    const chunk = retrievedChunks[i]
    const title = chunk.title || chunk.file_name || `Document ${i + 1}`
    const idx = chunk.id || (i + 1)
    const content = chunk.content || ''
    
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 25)
    
    // Pick up to 2 top scoring sentences for rich context
    let scoredSentences = sentences.map(s => {
      const sLower = s.toLowerCase()
      let score = 0
      for (const qt of queryTerms) {
        if (sLower.includes(qt)) score += 3
      }
      return { text: s.trim(), score }
    }).sort((a, b) => b.score - a.score)

    let topPoints = scoredSentences.slice(0, 2).map(item => item.text).filter(Boolean)
    if (topPoints.length === 0 && content.trim().length > 0) {
      topPoints = [content.slice(0, 320).trim() + (content.length > 320 ? '...' : '')]
    }

    if (topPoints.length > 0) {
      let cleaned = topPoints.join(' ').replace(/\n+/g, ' ').trim()
      if (cleaned.length > 450) cleaned = cleaned.slice(0, 450) + '...'
      
      const paragraph = `${cleaned} \`sourcecite:${idx}|${title}\`\n\n`
      
      const words = paragraph.split(' ')
      let batch = ''
      for (let j = 0; j < words.length; j++) {
        batch += words[j] + ' '
        synthesizedText += words[j] + ' '
        if (j % 5 === 0 || j === words.length - 1) {
          onChunk(synthesizedText)
          await new Promise(resolve => setTimeout(resolve, 30))
        }
      }
    }
  }

  synthesizedText += `#### **Summary Notes**\n\nThese findings reflect the direct references stored across ${retrievedChunks.length} matching document sections in your local repository. You can directly edit or add notes to this synthesis using the action bar below.\n\n*Extracted offline from local documents.*`
  onChunk(synthesizedText)
}

export const streamRagAnswer = async (query, retrievedChunks, provider, apiKey, onChunk, history = [], abortSignal) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here' || apiKey === 'your_api_key_here') {
    return streamOfflineExtractiveRag(query, retrievedChunks, onChunk);
  }

  const hasContext = retrievedChunks && retrievedChunks.length > 0;
  const contextText = hasContext ? retrievedChunks.map((chunk, index) => {
    const sourceNum = index + 1;
    const chunkTitle = chunk.title || chunk.file_name || `Document ${sourceNum}`;
    return `[Source #${sourceNum} | Document Title: ${chunkTitle}]\n${chunk.content || ''}`;
  }).join('\n\n---\n\n') : '';

  const systemPrompt = `You are KManager AI, a focused knowledge assistant. Your job is to help users find and understand what's in their documents.

### RULES:
1. **Documents first**: Your primary job is to answer using the provided document context. Cite sources inline as [Source #1], [Source #2], etc. wherever you reference them.
2. **Be concise**: Do not write lengthy elaborations from general knowledge unless the user specifically asks for more. Answer what was asked, nothing more.
3. **No disclaimers**: NEVER say "I don't see exact details in your stored documents". If the documents are not relevant, just answer the question directly and briefly without mentioning the documents at all.
4. **No padding**: Do not write lengthy intros like "Great question!" or "Here is a masterclass on...". Start directly with the answer.
5. **Inline citations only**: Cite sources inline in the sentence where you use them, like: "According to your notes [Source #1], ...". Do not list sources at the end.
6. **Conversational continuity**: Build on prior messages in the conversation naturally.
7. **Casual greetings**: If the user sends only a greeting (hi, hello, how are you) with no topic, reply briefly and warmly.
8. **Images**: If asked to generate an image, return a Markdown image using loremflickr, e.g. \`![Image](https://loremflickr.com/800/600/keyword)\`.
9. **Formatting**: Use Markdown headers and lists only when the answer genuinely benefits from structure. For simple questions, plain prose is fine.`;

  const formattedHistory = (history || [])
    .filter(m => m && m.content && typeof m.content === 'string' && m.content.trim() !== '')
    .map(m => ({
      role: m.role === 'assistant' || m.role === 'bot' ? 'assistant' : 'user',
      content: m.content.trim()
    }));

  const userContent = hasContext
    ? `DOCUMENTS FROM USER'S KNOWLEDGE BASE:\n---\n${contextText}\n---\n\nUSER QUESTION: ${query}\n\n(Use the documents above to answer if relevant. Cite sources inline as [Source #1], [Source #2], etc. If the documents are not relevant, just answer briefly without mentioning them. Do not add disclaimers about missing documents.)`
    : `USER QUESTION: ${query}`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...formattedHistory,
    { role: 'user', content: userContent }
  ];

  const client = PROVIDERS[provider] || PROVIDERS.deepseek;
  try {
    return await client.stream(apiMessages, apiKey, onChunk, abortSignal);
  } catch (err) {
    console.warn('Cloud API streaming failed, falling back to offline extractive RAG:', err);
    return streamOfflineExtractiveRag(query, retrievedChunks, onChunk);
  }
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
