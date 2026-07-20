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
  
  let synthesizedText = `### **Local Research Synthesis**\n\nBased on your stored documents regarding **${query}**, here are the primary technical and conceptual findings extracted from your knowledge base:\n\n#### **Key Insights & Evidence**\n\n`
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
      
      const bullet = `- **[Source #${idx}]**: ${cleaned} \`sourcecite:${idx}|${title}\`\n\n`
      
      const words = bullet.split(' ')
      for (const word of words) {
        synthesizedText += word + ' '
        onChunk(synthesizedText)
        await new Promise(resolve => setTimeout(resolve, 12))
      }
    }
  }

  synthesizedText += `#### **Summary Notes**\n\nThese findings reflect the direct references stored across ${retrievedChunks.length} matching document sections in your local repository. You can directly edit or add notes to this synthesis using the action bar below.\n\n*Extracted offline from local documents.*`
  onChunk(synthesizedText)
}

export const streamRagAnswer = async (query, retrievedChunks, provider, apiKey, onChunk, history = []) => {
  if (!apiKey || apiKey === 'your_deepseek_api_key_here' || apiKey === 'your_api_key_here') {
    return streamOfflineExtractiveRag(query, retrievedChunks, onChunk);
  }

  const hasContext = retrievedChunks && retrievedChunks.length > 0;
  const contextText = hasContext ? retrievedChunks.map((chunk, index) => {
    const sourceNum = index + 1;
    const chunkTitle = chunk.title || chunk.file_name || `Document ${sourceNum}`;
    return `[Source #${sourceNum} | Document Title: ${chunkTitle}]\n${chunk.content || ''}`;
  }).join('\n\n---\n\n') : '';

  const systemPrompt = `You are KManager AI, an advanced, intellectually brilliant AI research assistant modeled after ChatGPT and NotebookLM. Your tone is articulate, deeply analytical, authoritative, and profoundly knowledgeable across all technical and domain areas.

### YOUR CORE INTELLECTUAL RULES:
1. **Deep Cross-Document Synthesis & Multi-Hop Reasoning**: When document context IS provided and directly or partially relevant to the user's query, do not merely summarize single chunks in isolation. Synthesize, compare, and contrast information across ALL provided sources. Identify hidden connections, architectural patterns, or data trends, and cite facts precisely using numeric markers like [Source #1], [Source #2], etc., corresponding directly to the [Source #1], [Source #2] headers in the context.
2. **Exact Data & Spreadsheet Extraction**: When analyzing spreadsheets (.xlsx, .csv), numeric records, or structured tables, perform rigorous, exact data extraction. Present clean comparative Markdown tables, step-by-step calculations, or exact metrics without skipping details or making vague approximations.
3. **Conversational Continuity & Context Awareness**: You are participating in an ongoing dialogue. Always incorporate the prior messages and follow-up history provided in the chat. If the user asks "what about X?" or asks for a comparison based on your previous turn, build directly upon your past responses and the newly retrieved sources.
4. **Masterful Domain Elaboration**: After synthesizing what the sources say, transition seamlessly into a rich, intellectually rewarding elaboration using your vast general intelligence. Provide architectural insights, industry best practices, concrete examples, or fully functioning code solutions when appropriate.
5. **Handling Missing or Unrelated Context**: If the retrieved documents do NOT contain exact details regarding the user's query or are clearly unrelated (for example, if you retrieve a Table of Contents or a Vim guide when asked about English material), DO NOT cite those sources ([Source #1], etc.) and DO NOT attempt to force false connections to unrelated text. Do NOT write repetitive robotic disclaimers analyzing what the unrelated documents are about. Instead, smoothly and naturally note: "I don't see exact details in your stored documents, but here is the comprehensive answer based on domain expertise..." and immediately deliver a world-class, definitive answer!
6. **Pure Casual Small Talk Only**: ONLY if the user's prompt is strictly a casual greeting (like "hello", "hi", "how are you") with zero topic keywords, reply warmly and naturally without mentioning sources.
7. **Clean Markdown & Editable Structure**: Format your response with polished, highly structured Markdown using clear section headers (###), bulleted breakdowns, and crisp paragraphs or code blocks so the user can review, copy, modify, and save them. ALWAYS place a clean blank line right before any section header (like ### Header) so it renders as a proper heading tag.
8. **No Trailing Questions**: Never end your turn with generic follow-up prompts like "Would you like to know more?". Deliver a complete, authoritative answer.`;

  const formattedHistory = (history || [])
    .filter(m => m && m.content && typeof m.content === 'string' && m.content.trim() !== '')
    .map(m => ({
      role: m.role === 'assistant' || m.role === 'bot' ? 'assistant' : 'user',
      content: m.content.trim()
    }));

  const userContent = hasContext
    ? `CONTEXT FROM USER DOCUMENTS & EMBEDDED KNOWLEDGE BASE:\n---\n${contextText}\n---\n\nUSER QUESTION/TOPIC:\n${query}\n\n(IMPORTANT INSTRUCTION: If the above CONTEXT SOURCES directly relate to "${query}", synthesize across them using exact numeric citations ([Source #1], [Source #2], etc.). However, if the sources are unrelated to "${query}" (such as an unrelated guide or Table of Contents), DO NOT cite them or force false connections. Instead, note "I don't see exact details in your stored documents, but here is the comprehensive answer..." and immediately provide a masterful, full answer based on domain expertise. Ensure all headings like ### have blank lines before and after.)`
    : `USER QUESTION:\n${query}`;

  const apiMessages = [
    { role: 'system', content: systemPrompt },
    ...formattedHistory,
    { role: 'user', content: userContent }
  ];

  const client = PROVIDERS[provider] || PROVIDERS.deepseek;
  try {
    return await client.stream(apiMessages, apiKey, onChunk);
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
