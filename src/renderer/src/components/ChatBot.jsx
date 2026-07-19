import React, { useState, useRef, useEffect, memo, useCallback } from 'react'
import { MessageSquare, X, Send, Bot, User, Plus, Check, ArrowUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatMarkdownText, remarkMath, rehypeKatex } from './search/DocumentRenderer'
import { cn } from '../lib/utils'
import { getSetting } from '../lib/settings'
import { queryLLM } from '../lib/LLMProvider'
import { useKeyboardShortcuts } from '../../../utils/useKeyboardShortcuts'

const BotMessage = memo(({ text, idx, onSave, savedState }) => (
  <div className="flex flex-col items-start w-full animate-in fade-in duration-200">
    <div className="flex items-start gap-2.5 max-w-[85%]">
      <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[var(--bg-active)] text-[var(--text-accent)] border border-[var(--border-subtle)]">
        <Bot size={12} />
      </div>
      <div className="flex flex-col">
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
          </div>
        </div>
        {idx > 0 && (
          <div className="flex justify-start mt-1.5">
            <button
              onClick={() => onSave(idx, text)}
              disabled={savedState === 'saving' || savedState === 'saved'}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-[5px] text-[9px] font-medium transition-all ${
                savedState === 'saved'
                  ? 'bg-green-500/10 text-green-400 cursor-default'
                  : savedState === 'saving'
                    ? 'bg-[var(--bg-active)] text-[var(--text-muted)] opacity-70 cursor-wait'
                    : 'bg-[var(--bg-active)] text-[var(--text-faint)] hover:text-white hover:bg-[var(--text-accent)]/20'
              }`}
            >
              {savedState === 'saved' ? (
                <><Check size={8} className="text-green-400" /> Saved</>
              ) : savedState === 'saving' ? (
                <><span className="w-2 h-2 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" /> Saving...</>
              ) : (
                <><Plus size={8} /> Save</>
              )}
            </button>
          </div>
        )}
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
  const textareaRef = useRef(null)

  const enhancedAppState = { ...appState, ...dbStats }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      if (input && input.trim() !== '') {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
      }
    }
  }, [input])

  const handleInput = useCallback((e) => {
    const val = e.target.value
    setInput(val)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
    }
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

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
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
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
        title="Open Assistant"
      >
        <MessageSquare size={18} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
          <div
            className="bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl shadow-[var(--shadow-modal)] flex flex-col overflow-hidden w-[80vw] h-[85vh] max-w-[920px] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header matching main window titlebar style & proportions */}
            <div className="h-7 bg-[var(--bg-panel)]/80 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2 px-3 h-full">
                <Bot size={15} className="text-[var(--text-accent)]" />
                <h3 className="text-xs font-semibold text-[var(--text-main)] tracking-tight">KManager Agent</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="h-full px-3.5 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center" title="Close (Esc)">
                <X size={14} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 md:px-10 custom-scrollbar">
              <div className="max-w-3xl mx-auto flex flex-col gap-4 h-full">
                {messages.length === 0 && !isTyping && (
                  <div className="flex flex-col items-center justify-center text-center py-12 px-4 h-full animate-in fade-in duration-300">
                    <div className="w-12 h-12 rounded-xl bg-[var(--bg-active)] flex items-center justify-center mb-4 shadow-sm border border-[var(--border-subtle)]">
                      <kbd className="font-mono font-bold text-base text-[var(--text-accent)]">KM</kbd>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--text-main)] mb-1.5">KManager AI</h3>
                    <p className="text-xs text-[var(--text-muted)] mb-8 max-w-[320px] leading-relaxed">
                      {dbStats.totalDocuments
                        ? `Your knowledge base has ${dbStats.totalDocuments} documents. Ask me anything.`
                        : 'Ask me about your knowledge base or features.'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-md">
                      {['Summarize my recent notes', 'Find concepts in my vault', 'Compare two topics'].map((s) => (
                        <button key={s} onClick={() => sendQuickPrompt(s)}
                          className="flex-1 text-left px-3.5 py-2.5 text-xs text-[var(--text-faint)] hover:text-[var(--text-main)] bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] rounded-lg border border-transparent hover:border-[var(--border-subtle)] transition-colors">
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
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 bg-[var(--bg-app)] shrink-0">
              <div className="max-w-3xl mx-auto w-full">
                <div className="flex flex-col bg-[var(--bg-card)] rounded-xl border border-[var(--border-dim)] transition-all duration-200 overflow-hidden shadow-sm">
                  {/* Top Row: Auto-growing Textarea */}
                  <textarea 
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question across your knowledge base..."
                    className="w-full bg-transparent border-none outline-none text-[13.5px] font-normal text-[var(--text-main)] py-3 px-4 placeholder-[var(--text-muted)]/60 resize-none leading-relaxed overflow-y-auto custom-scrollbar max-h-40"
                    autoComplete="off"
                    spellCheck="false"
                  />

                  {/* Bottom Row: Send Button & Actions */}
                  <div className="flex items-center justify-between px-3 pb-2 pt-1 select-none">
                    <span className="text-[11px] text-[var(--text-faint)]">
                      Press Enter to send, Shift + Enter for new line
                    </span>
                    <button 
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className="w-7 h-7 rounded-full bg-[var(--text-accent)] hover:opacity-90 text-white disabled:opacity-30 transition-all duration-150 flex items-center justify-center shadow-sm shrink-0"
                      title="Send message"
                    >
                      <ArrowUp size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default memo(ChatBot)
