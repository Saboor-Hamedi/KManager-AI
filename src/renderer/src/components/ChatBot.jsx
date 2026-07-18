import React, { useState, useRef, useEffect, memo, useCallback } from 'react'
import { MessageSquare, X, Send, Bot, User, Plus, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatMarkdownText, remarkMath, rehypeKatex } from './search/DocumentRenderer'
import { cn } from '../lib/utils'
import { getSetting } from '../lib/settings'
import { queryLLM } from '../lib/LLMProvider'
import { useKeyboardShortcuts } from '../../../utils/useKeyboardShortcuts'

const BotMessage = memo(({ text, idx, onSave, savedState }) => (
  <div className="flex flex-col items-start w-full group animate-in fade-in duration-200">
    <div className="flex items-start gap-2.5 max-w-[85%]">
      <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[var(--bg-active)] text-[var(--text-accent)] border border-[var(--border-subtle)]">
        <Bot size={12} />
      </div>
      <div className="px-3 py-2 rounded-lg rounded-tl-sm text-[11px] leading-relaxed bg-[var(--bg-panel)] text-[var(--text-main)] border border-[var(--border-dim)] min-w-0" style={{ overflowWrap: 'break-word' }}>
        <div style={{ overflowWrap: 'break-word' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
            p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold text-[var(--text-accent)]" {...props} />,
            em: ({node, ...props}) => <em className="italic text-[var(--text-muted)]" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-0.5 marker:text-[var(--text-muted)]" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5 marker:text-[var(--text-muted)]" {...props} />,
            li: ({node, ...props}) => <li {...props} />,
            code: ({node, inline, ...props}) => inline
              ? <code className="bg-[var(--bg-active)] text-[var(--text-accent)] px-1 py-0.5 rounded-[4px] font-mono text-[10px]" {...props} />
              : <code className="block bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[var(--text-muted)] p-2 rounded-md font-mono text-[10px] mb-2 overflow-x-auto whitespace-pre custom-scrollbar" {...props} />
          }}>
            {formatMarkdownText(text)}
          </ReactMarkdown>
        {idx > 0 && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex justify-end mt-2">
            <button
              onClick={() => onSave(idx, text)}
              disabled={savedState === 'saving' || savedState === 'saved'}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all shadow-sm ${
                savedState === 'saved'
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20 cursor-default'
                  : savedState === 'saving'
                    ? 'bg-[var(--bg-active)] text-[var(--text-muted)] border border-[var(--border-subtle)] opacity-70 cursor-wait'
                    : 'bg-[var(--bg-active)] text-[var(--text-faint)] border border-[var(--border-subtle)] hover:text-white hover:border-[var(--text-accent)] hover:shadow-[0_0_10px_rgba(var(--color-accent),0.2)]'
              }`}
            >
              {savedState === 'saved' ? (
                <><Check size={10} className="text-green-400" /> Saved</>
              ) : savedState === 'saving' ? (
                <><span className="w-2.5 h-2.5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Plus size={10} /> Save</>
              )}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  </div>
))

const UserMessage = memo(({ text }) => (
  <div className="flex items-start justify-end w-full animate-in fade-in duration-200">
    <div className="flex items-start gap-2 flex-row-reverse max-w-[85%]">
      <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[var(--bg-panel)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
        <User size={12} />
      </div>
      <div className="px-3 py-2 rounded-lg rounded-tr-sm text-[11px] leading-relaxed bg-[var(--bg-active)] text-[var(--text-accent)] border border-[var(--border-subtle)] break-words">
        {text}
      </div>
    </div>
  </div>
))

const ChatBot = ({ appState = {} }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [savedResponses, setSavedResponses] = useState({})
  const [dbStats, setDbStats] = useState({})
  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)

  const enhancedAppState = { ...appState, ...dbStats }

  useKeyboardShortcuts({
    onEscape: isOpen ? () => {
      setIsOpen(false)
      return true
    } : undefined
  })

  // Fetch DB stats for system awareness
  useEffect(() => {
    if (!isOpen) return
    const fetchStats = async () => {
      try {
        const [statsRes, analyticsRes, todayRes, weekRes, typeRes, recentRes] = await Promise.allSettled([
          window.api.db.stats(),
          window.api.db.getAnalytics(),
          window.api.db.query("SELECT COUNT(*)::int as count FROM documents WHERE created_at >= CURRENT_DATE"),
          window.api.db.query("SELECT COUNT(*)::int as count FROM documents WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'"),
          window.api.db.query("SELECT file_type, COUNT(*)::int as count FROM documents GROUP BY file_type ORDER BY count DESC"),
          window.api.db.query("SELECT file_name, file_type, created_at FROM documents ORDER BY created_at DESC LIMIT 15")
        ])
        const stats = statsRes.value?.stats
        const metrics = analyticsRes.value?.metrics
        setDbStats({
          totalDocuments: stats?.total_docs || 0,
          totalChunks: stats?.total_chunks || 0,
          documentsToday: todayRes.value?.rows?.[0]?.count || 0,
          documentsThisWeek: weekRes.value?.rows?.[0]?.count || 0,
          recentSearches: metrics?.totalSearches || 0,
          lastActivity: metrics?.activityFeed?.[0]?.created_at || '',
          filesByType: typeRes.value?.rows || [],
          recentFiles: recentRes.value?.rows || []
        })
      } catch {}
    }
    fetchStats()
  }, [isOpen])

  const sendQuickPrompt = async (text) => {
    if (!text.trim() || isTyping) return
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, { role: 'user', text }])
    setIsTyping(true)
    try {
      const provider = await getSetting('ACTIVE_LLM_PROVIDER', 'deepseek')
      const apiKey = await getSetting(`${provider.toUpperCase()}_API_KEY`, '')
      if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        setMessages(prev => [...prev, { role: 'bot', text: 'Error: API key not configured in Settings.' }])
        setIsTyping(false)
        return
      }
      const botReply = await queryLLM([...messages, userMsg], enhancedAppState, provider, apiKey)
      setMessages(prev => [...prev, { role: 'bot', text: botReply }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: `Error: ${error.message}` }])
    } finally {
      setIsTyping(false)
    }
  }

  const handleSaveResponse = useCallback(async (idx, text) => {
    setSavedResponses(prev => ({ ...prev, [idx]: 'saving' }))
    try {
      let query = 'ChatBot AI Response'
      if (idx > 0 && messages[idx - 1].role === 'user') {
        query = messages[idx - 1].text
      }
      const res = await window.electron.ipcRenderer.invoke('db:ingest-text', { title: query, text })
      setSavedResponses(prev => ({ ...prev, [idx]: res.success ? 'saved' : 'error' }))
    } catch (err) {
      setSavedResponses(prev => ({ ...prev, [idx]: 'error' }))
    }
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, isOpen])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return

    const userMsg = { role: 'user', content: input }
    setMessages(prev => [...prev, { role: 'user', text: input }])
    setInput('')
    setIsTyping(true)

    try {
      const provider = await getSetting('ACTIVE_LLM_PROVIDER', 'deepseek')
      const apiKey = await getSetting(`${provider.toUpperCase()}_API_KEY`, '')
      if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        setMessages(prev => [...prev, { role: 'bot', text: 'Error: API key not configured in Settings.' }])
        setIsTyping(false)
        return
      }
      const botReply = await queryLLM([...messages, userMsg], enhancedAppState, provider, apiKey)
      setMessages(prev => [...prev, { role: 'bot', text: botReply }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'bot', text: `Connection to AI Provider failed: ${error.message}` }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-accent)] shadow-lg hover:border-[var(--text-accent)] hover:-translate-y-0.5 transition-all duration-200 z-40",
          isOpen ? "scale-75 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
      >
        <MessageSquare size={18} />
      </button>

      <div
        className={cn(
          "fixed bottom-6 right-6 w-80 sm:w-96 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg shadow-xl flex flex-col transition-all duration-200 transform origin-bottom-right z-50 overflow-hidden",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        )}
        style={{ height: '520px', maxHeight: '80vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-dim)] bg-[var(--bg-app)] shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[var(--text-accent)]" />
            <h3 className="text-xs font-semibold text-[var(--text-main)] tracking-wide">Assistant</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 custom-scrollbar">
          <div className="flex flex-col gap-4">
            {messages.length === 0 && !isTyping && (
              <div className="flex flex-col items-center justify-center text-center py-8 px-4 h-full animate-in fade-in duration-300">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg-active)] flex items-center justify-center mb-3 shadow-sm border border-[var(--border-subtle)]">
                  <kbd className="font-mono font-bold text-sm text-[var(--text-accent)]">KM</kbd>
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1">KManager AI</h3>
                <p className="text-[11px] text-[var(--text-muted)] mb-6 max-w-[220px] leading-relaxed">
                  {dbStats.totalDocuments
                    ? `Your knowledge base has ${dbStats.totalDocuments} documents. Ask me anything.`
                    : 'Ask me about your knowledge base or features.'}
                </p>
                <div className="flex flex-col gap-1.5 w-full">
                  {['Summarize my recent notes', 'Find concepts in my vault', 'Compare two topics'].map((s) => (
                    <button key={s} onClick={() => sendQuickPrompt(s)}
                      className="w-full text-left px-3 py-2 text-[11px] text-[var(--text-faint)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] rounded-md border border-transparent hover:border-[var(--border-subtle)] transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              msg.role === 'user'
                ? <UserMessage key={idx} text={msg.text} />
                : <BotMessage key={idx} text={msg.text} idx={idx} onSave={handleSaveResponse} savedState={savedResponses[idx]} />
            ))}
            {isTyping && (
              <div className="flex items-start gap-2.5 w-full animate-in fade-in duration-200">
                <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[var(--bg-active)] text-[var(--text-accent)] border border-[var(--border-subtle)]">
                  <Bot size={12} />
                </div>
                <div className="px-3 py-2.5 rounded-lg rounded-tl-sm bg-[var(--bg-panel)] border border-[var(--border-dim)] flex items-center gap-1">
                  <span className="w-1 h-1 bg-[var(--text-muted)] rounded-full animate-bounce" />
                  <span className="w-1 h-1 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1 h-1 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-[var(--border-dim)] bg-[var(--bg-app)] shrink-0">
          <form onSubmit={handleSend} className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-md text-xs text-[var(--text-main)] px-3 py-2.5 pr-10 focus:outline-none focus:border-[var(--text-accent)] transition-colors placeholder:text-[var(--text-faint)]"
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isTyping}
              className="absolute right-2 p-1 text-[var(--text-accent)] hover:text-[var(--text-main)] disabled:opacity-50 transition-colors"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export default memo(ChatBot)
