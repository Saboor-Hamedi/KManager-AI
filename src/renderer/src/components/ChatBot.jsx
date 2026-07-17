import React, { useState, useRef, useEffect, memo, useCallback } from 'react'
import { MessageSquare, X, Send, Bot, User, Plus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatMarkdownText, remarkMath, rehypeKatex } from './search/DocumentRenderer'
import { cn } from '../lib/utils'
import { getSetting } from '../lib/settings'
import { queryDeepSeek } from '../lib/deepseek'

const BotMessage = memo(({ text, idx, onSave, savedState }) => (
  <div className="flex flex-col items-start">
    <div className="flex items-start gap-2">
      <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[var(--bg-active)] text-[var(--text-accent)] border border-[var(--border-subtle)]">
        <Bot size={12} />
      </div>
      <div className="px-3 py-2 rounded-lg text-[11px] leading-relaxed bg-[var(--bg-panel)] text-[var(--text-main)] border border-[var(--border-dim)] rounded-tl-none max-w-[85%] min-w-0" style={{ overflowWrap: 'break-word' }}>
        <div style={{ overflowWrap: 'break-word' }}>
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
            p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
            strong: ({node, ...props}) => <strong className="font-bold text-[var(--text-accent)]" {...props} />,
            em: ({node, ...props}) => <em className="italic text-[var(--text-muted)]" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-1 space-y-0.5 marker:text-[var(--text-muted)]" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-1 space-y-0.5 marker:text-[var(--text-muted)]" {...props} />,
            li: ({node, ...props}) => <li {...props} />,
            code: ({node, inline, ...props}) => inline
              ? <code className="bg-black/20 px-1 py-0.5 rounded-[5px] font-mono text-[10px]" {...props} />
              : <code className="block bg-black/20 p-2 rounded-[5px] font-mono text-[10px] mb-1 overflow-x-auto whitespace-pre custom-scrollbar" {...props} />
          }}>
            {formatMarkdownText(text)}
          </ReactMarkdown>
        {idx > 0 && (
          <button
            onClick={() => onSave(idx, text)}
            disabled={savedState === 'saving' || savedState === 'saved'}
            className={`mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-all ${
              savedState === 'saved'
                ? 'text-green-400 cursor-default'
                : savedState === 'saving'
                  ? 'text-[var(--text-muted)] opacity-70 cursor-wait'
                  : 'text-[var(--text-faint)] hover:text-[var(--text-muted)]'
            }`}
          >
            {savedState === 'saved' ? (
              <><div className="w-2 h-2 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mr-1"><svg width="4" height="4" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5 6 5 8.5 9.5 3.5"></polyline></svg></div> Saved</>
            ) : savedState === 'saving' ? (
              <><span className="w-2 h-2 border border-[var(--text-muted)] border-t-transparent rounded-full animate-spin mr-1" /> Saving...</>
            ) : (
              <><Plus size={8} className="mr-0.5" /> Save</>
            )}
          </button>
        )}
        </div>
        </div>
      </div>
    </div>
))

const UserMessage = memo(({ text }) => (
  <div className="flex items-start justify-end">
    <div className="flex items-start gap-2 flex-row-reverse">
      <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[var(--bg-panel)] text-[var(--text-muted)]">
        <User size={12} />
      </div>
      <div className="px-3 py-2 rounded-lg text-[11px] leading-relaxed bg-[var(--bg-active)] text-[var(--text-accent)] rounded-tr-none max-w-[85%] break-words">
        {text}
      </div>
    </div>
  </div>
))

const ChatBot = ({ appState = {} }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hello. How can I help you?' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [savedResponses, setSavedResponses] = useState({})
  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)

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
      const apiKey = await getSetting('DEEPSEEK_API_KEY', import.meta.env.VITE_DEEPSEEK_API_KEY || '')
      if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
        setMessages(prev => [...prev, { role: 'bot', text: 'Error: DeepSeek API key not configured.' }])
        setIsTyping(false)
        return
      }
      const botReply = await queryDeepSeek([...messages, userMsg], appState, apiKey)
      setMessages(prev => [...prev, { role: 'bot', text: botReply }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'bot', text: `Connection to DeepSeek Core failed: ${error.message}` }])
    } finally {
      setIsTyping(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-6 flex items-center justify-center w-10 h-10 rounded-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-accent)] shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:bg-[#2a3644] hover:border-[#4e6074] hover:shadow-[0_6px_25px_rgba(0,0,0,0.6)] hover:-translate-y-1 transition-all duration-300 z-40 group",
          isOpen ? "scale-0 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
      >
        <div className="absolute inset-0 rounded-full bg-[var(--text-accent)]/5 blur-md group-hover:bg-[var(--text-accent)]/15 transition-all" />
        <MessageSquare size={18} className="relative z-10" />
      </button>

      <div
        className={cn(
          "fixed bottom-6 right-6 w-80 sm:w-96 bg-[var(--bg-card)] border border-[var(--border-dim)] rounded-lg shadow-2xl flex flex-col transition-all duration-300 transform origin-bottom-right z-50",
          isOpen ? "scale-100 opacity-100" : "scale-0 opacity-0 pointer-events-none"
        )}
        style={{ height: '500px' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-dim)] bg-[var(--bg-app)] rounded-t-lg shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-[var(--text-accent)]" />
            <h3 className="text-xs font-bold tracking-widest text-[var(--text-main)]">Assistant</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
            <X size={15} />
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 custom-scrollbar">
          <div className="flex flex-col gap-3">
            {messages.length <= 1 && !isTyping && (
              <div className="flex flex-col items-center justify-center text-center py-6 px-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-active)] border border-[var(--border-subtle)] flex items-center justify-center mb-3">
                  <Bot size={20} className="text-[var(--text-accent)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1">KManager AI Assistant</h3>
                <p className="text-[10px] text-[var(--text-muted)] mb-4 max-w-[200px] leading-relaxed">
                  I can help you search your knowledge base, explain features, and navigate the system.
                </p>
                <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
                  <button onClick={() => setInput('How do I search my documents?')} className="w-full text-left px-3 py-1.5 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-subtle)]">
                    How do I search my documents?
                  </button>
                  <button onClick={() => setInput('What can KManager AI do?')} className="w-full text-left px-3 py-1.5 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-subtle)]">
                    What can KManager AI do?
                  </button>
                  <button onClick={() => setInput('How do I connect to a database?')} className="w-full text-left px-3 py-1.5 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-subtle)]">
                    How do I connect to a database?
                  </button>
                </div>
              </div>
            )}
            {messages.map((msg, idx) => (
              idx === 0 && messages.length <= 1 ? null :
              msg.role === 'user'
                ? <UserMessage key={idx} text={msg.text} />
                : <BotMessage key={idx} text={msg.text} idx={idx} onSave={handleSaveResponse} savedState={savedResponses[idx]} />
            ))}
            {isTyping && (
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 shrink-0 rounded flex items-center justify-center bg-[var(--bg-active)] text-[var(--text-accent)] border border-[var(--border-subtle)]">
                  <Bot size={12} />
                </div>
                <div className="px-3 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-tl-none flex items-center gap-1 break-words">
                  <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-1.5 h-1.5 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-[var(--border-dim)] bg-[var(--bg-app)] rounded-b-lg shrink-0">
          <form onSubmit={handleSend} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded text-xs text-[var(--text-main)] px-3 py-2.5 pr-10 focus:outline-none transition-colors placeholder:text-[var(--text-faint)]"
            />
            <button type="submit" className="absolute right-1.5 top-1.5 p-1 text-[var(--text-accent)] hover:text-[var(--text-main)] transition-colors">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

export default memo(ChatBot)
