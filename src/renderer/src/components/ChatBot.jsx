import React, { useState, useRef, useEffect, memo, useCallback } from 'react'
import { MessageSquare, X, Send, Bot, User, Plus, Check, ArrowUp, ThumbsUp, ThumbsDown, Copy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatMarkdownText, remarkMath, rehypeKatex } from './search/DocumentRenderer'
import SuggestedPrompts from './search/SuggestedPrompts'
import { cn } from '../lib/utils'
import { getSetting } from '../lib/settings'
import { queryLLM } from '../lib/LLMProvider'
import { useKeyboardShortcuts } from '../../../utils/useKeyboardShortcuts'

const BotMessage = memo(({ text, idx, onSave, savedState, queryText, onSelectPrompt }) => {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFeedback = (type) => {
    setFeedback(feedback === type ? null : type)
  }

  return (
    <div className="flex flex-col items-start w-full animate-in fade-in duration-200">
      <div className="flex flex-col max-w-[85%] w-full">
        <div className="py-2 text-xs leading-relaxed text-justify bg-transparent text-[var(--text-main)] shadow-none border-0" style={{ overflowWrap: 'break-word' }}>
          <div style={{ overflowWrap: 'break-word' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
              p: ({node, ...props}) => <p className="mb-2 last:mb-0 text-justify" {...props} />,
              strong: ({node, ...props}) => <strong className="font-bold text-[var(--text-accent)]" {...props} />,
              em: ({node, ...props}) => <em className="italic text-[var(--text-muted)]" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-0.5 marker:text-[var(--text-muted)]" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5 marker:text-[var(--text-muted)]" {...props} />,
              li: ({node, ...props}) => <li {...props} />,
              code: ({node, inline, ...props}) => inline
                ? <code className="bg-[var(--bg-active)] text-[var(--text-accent)] px-1 py-0.5 rounded-[3px] font-mono text-[10px]" {...props} />
                : <code className="block bg-[var(--bg-app)] text-[var(--text-muted)] p-2 rounded-[5px] font-mono text-[10px] mb-2 overflow-x-auto whitespace-pre custom-scrollbar" {...props} />
            }}>
              {formatMarkdownText(text)}
            </ReactMarkdown>
          </div>
        </div>
        {idx > 0 && (
          <div className="flex flex-col gap-2 mt-1.5 w-full">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center bg-[var(--bg-panel)]/80 rounded-[5px] overflow-hidden h-6 shrink-0 select-none">
                <button
                  onClick={() => handleFeedback('helpful')}
                  className={`h-full px-2 transition-colors flex items-center justify-center border-0 ${
                    feedback === 'helpful' ? 'text-[#a855f7]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                  }`}
                  title="Helpful response"
                >
                  <ThumbsUp size={12} />
                </button>
                <button
                  onClick={() => handleFeedback('unhelpful')}
                  className={`h-full px-2 transition-colors flex items-center justify-center border-0 ${
                    feedback === 'unhelpful' ? 'text-red-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown size={12} />
                </button>
                <button
                  onClick={handleCopy}
                  className="h-full px-2 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
                  title="Copy response text"
                >
                  {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>

              <button
                onClick={() => onSave(idx, text)}
                disabled={savedState === 'saving' || savedState === 'saved'}
                className={`flex items-center justify-center h-6 px-2.5 rounded-[5px] transition-all border-0 ${
                  savedState === 'saved'
                    ? 'bg-green-500/10 text-green-400 cursor-default'
                    : savedState === 'saving'
                      ? 'bg-[var(--bg-active)] text-[var(--text-muted)] opacity-70 cursor-wait'
                      : 'bg-[var(--bg-panel)]/80 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                }`}
                title={savedState === 'saved' ? 'Saved' : 'Save to Knowledge Base'}
              >
                {savedState === 'saved' ? (
                  <Check size={12} className="text-green-400" />
                ) : savedState === 'saving' ? (
                  <span className="w-2.5 h-2.5 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={12} />
                )}
              </button>
            </div>

            {queryText && (
              <div className="w-full pt-1">
                <SuggestedPrompts
                  msg={{ id: idx, query: queryText, ragStatus: 'done', ragAnswer: text, results: [] }}
                  onSelectPrompt={onSelectPrompt}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

const UserMessage = memo(({ text }) => (
  <div className="flex justify-end w-full py-1 animate-in fade-in duration-200">
    <div className="bg-transparent max-w-[85%] border-0 shadow-none text-justify">
      <p className="text-xs leading-relaxed font-normal text-[var(--text-main)] whitespace-pre-wrap break-words text-justify">{text}</p>
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
            className="bg-[var(--bg-app)] rounded-[5px] shadow-[var(--shadow-modal)] flex flex-col overflow-hidden w-[80vw] h-[85vh] max-w-[920px] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header matching main window titlebar style & proportions */}
            <div className="h-7 bg-[var(--bg-panel)]/80 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center gap-2 px-3 h-full">
                <Bot size={15} className="text-[var(--text-accent)]" />
                <h3 className="text-xs font-semibold text-[var(--text-main)] tracking-tight">KManager Agent</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="h-full px-3.5 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center" title="Close (Esc)">
                <X size={14} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 md:px-10 custom-scrollbar">
              <div className="max-w-3xl mx-auto flex flex-col gap-3 h-full pb-16">
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
                    : <BotMessage
                        key={idx}
                        text={msg.text}
                        idx={idx}
                        onSave={handleSaveResponse}
                        savedState={savedResponses[idx]}
                        queryText={idx > 0 ? messages[idx - 1]?.text || '' : ''}
                        onSelectPrompt={sendQuickPrompt}
                      />
                ))}
                {isTyping && (
                  <div className="flex items-start w-full animate-in fade-in duration-200">
                    <div className="px-4 py-3 rounded-[5px] bg-[var(--bg-panel)]/90 shadow-sm flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[var(--text-accent)] rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-[var(--text-accent)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-1.5 h-1.5 bg-[var(--text-accent)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} className="h-16 shrink-0" />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 bg-transparent shrink-0">
              <div className="max-w-3xl mx-auto w-full">
                <div className="flex flex-col bg-[var(--bg-card)] rounded-xl transition-all duration-200 overflow-hidden shadow-sm">
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
