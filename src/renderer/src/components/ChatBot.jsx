import React, { useState, useRef, useEffect, useLayoutEffect, memo, useCallback, useMemo } from 'react'
import { MessageSquare, X, Send, Bot, User, Plus, Check, ArrowUp, ThumbsUp, ThumbsDown, Copy, Search, ArrowRight, Trash2, FileText, Paperclip } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { formatMarkdownText, remarkMath, rehypeKatex } from './search/DocumentRenderer'
import SuggestedPrompts from './search/SuggestedPrompts'
import { cn } from '../lib/utils'
import { getSetting } from '../lib/settings'
import { queryLLM } from '../lib/LLMProvider'
import { useKeyboardShortcuts } from '../../../utils/useKeyboardShortcuts'

const ChatCodeBlock = memo(({ lang, codeString }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative group my-4 rounded-lg overflow-hidden border border-[var(--border-subtle)] shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-[#1e1e1e]">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#161b22] border-b border-white/[0.05]">
        <span className="text-[10px] font-medium text-white/50 uppercase tracking-wider">{lang || 'Code'}</span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-white/40 hover:text-white hover:bg-white/10 transition-colors border-0"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-[10px] font-medium text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span className="text-[10px] font-medium">Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        children={codeString}
        style={vscDarkPlus}
        language={lang || 'text'}
        showLineNumbers={false}
        PreTag="div"
        customStyle={{
          margin: 0,
          background: '#1e1e1e',
          color: '#d4d4d4',
          fontSize: '11.5px',
          padding: '1rem',
          overflowX: 'auto',
          lineHeight: '1.6'
        }}
        wrapLines={true}
        wrapLongLines={false}
      />
    </div>
  )
})

const BotMessage = memo(({ text, idx, onSave, savedState, queryText, onSelectPrompt }) => {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFeedback = (type) => {
    const newFeedback = feedback === type ? null : type
    setFeedback(newFeedback)
    if (newFeedback && window.api?.db?.submitFeedback) {
      const score = newFeedback === 'helpful' ? 1 : -1
      window.api.db.submitFeedback(queryText || text.slice(0, 80) || 'Chat query', score)
        .catch(err => console.error('Chat feedback error:', err))
    }
  }

  return (
    <div className="flex flex-col items-start w-full animate-in fade-in duration-200">
      <div className="flex flex-col w-full">
        <div className="py-2 text-xs leading-relaxed text-justify bg-transparent text-[var(--text-main)] shadow-none border-0" style={{ overflowWrap: 'break-word' }}>
          <div style={{ overflowWrap: 'break-word' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
              p: ({node, children, ...props}) => {
                const extractText = (nodes) => {
                  return React.Children.toArray(nodes).map(child => {
                    if (typeof child === 'string') return child
                    if (child && child.props && child.props.children) return extractText(child.props.children)
                    return ''
                  }).join('')
                }
                const lineText = extractText(children).trim()
                
                if (lineText.endsWith('?') && lineText.length > 5 && lineText.length < 250) {
                   const cleanText = lineText.replace(/^(\d+\.|-|\*)\s*/, '').trim()
                   return (
                      <div className="my-2">
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('fill-search', { detail: { query: cleanText } }))
                            window.dispatchEvent(new CustomEvent('close-chatbot'))
                          }}
                          className="w-full group flex items-start gap-3 px-4 py-3 rounded-[8px] bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] border border-white/[0.04] hover:border-[var(--text-accent)]/50 text-[12.5px] text-[var(--text-main)] hover:text-[var(--text-accent)] transition-all duration-200 shadow-sm text-left max-w-full break-words"
                        >
                          <span className="shrink-0 mt-0.5 text-[12px] opacity-70 group-hover:opacity-100 transition-opacity">💡</span>
                          <span className="flex-1 transition-colors leading-relaxed">{cleanText}</span>
                          <ArrowRight size={14} className="shrink-0 mt-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--text-accent)]" />
                        </button>
                      </div>
                   )
                }
                return <p className="mb-2 last:mb-0 text-justify" {...props}>{children}</p>
              },
              strong: ({node, ...props}) => <strong className="font-bold text-[var(--text-accent)]" {...props} />,
              em: ({node, ...props}) => <em className="italic text-[var(--text-muted)]" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-0.5 marker:text-[var(--text-muted)]" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-0.5 marker:text-[var(--text-muted)]" {...props} />,
              li: ({node, children, ...props}) => {
                const extractText = (nodes) => {
                  return React.Children.toArray(nodes).map(child => {
                    if (typeof child === 'string') return child
                    if (child && child.props && child.props.children) return extractText(child.props.children)
                    return ''
                  }).join('')
                }
                const lineText = extractText(children).trim()
                
                if (lineText.endsWith('?') && lineText.length > 5 && lineText.length < 250) {
                   const cleanText = lineText.replace(/^(\d+\.|-|\*)\s*/, '').trim()
                   return (
                      <li className="my-2 list-none" {...props}>
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('fill-search', { detail: { query: cleanText } }))
                            window.dispatchEvent(new CustomEvent('close-chatbot'))
                          }}
                          className="w-full group flex items-start gap-3 px-4 py-3 rounded-[8px] bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] border border-white/[0.04] hover:border-[var(--text-accent)]/50 text-[12.5px] text-[var(--text-main)] hover:text-[var(--text-accent)] transition-all duration-200 shadow-sm text-left max-w-full break-words -ml-4"
                        >
                          <span className="shrink-0 mt-0.5 text-[12px] opacity-70 group-hover:opacity-100 transition-opacity">💡</span>
                          <span className="flex-1 transition-colors leading-relaxed">{cleanText}</span>
                          <ArrowRight size={14} className="shrink-0 mt-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--text-accent)]" />
                        </button>
                      </li>
                   )
                }
                return <li {...props}>{children}</li>
              },
              code: ({node, inline, className, children, ...props}) => {
                if (inline) {
                  return <code className="bg-[var(--bg-active)] text-[var(--text-accent)] px-1.5 py-0.5 rounded-[4px] font-mono text-[11.5px]" {...props}>{children}</code>
                }
                const match = /language-(\w+)/.exec(className || '')
                const lang = match ? match[1] : ''
                const codeString = String(children).replace(/\n$/, '')
                
                return <ChatCodeBlock lang={lang} codeString={codeString} />
              },
              a: ({node, href, children, ...props}) => {
                if (href === '#search') {
                  return (
                    <button
                      onClick={() => {
                        const queryStr = React.Children.toArray(children).join('')
                        window.dispatchEvent(new CustomEvent('fill-search', { detail: { query: queryStr } }))
                        window.dispatchEvent(new CustomEvent('close-chatbot'))
                      }}
                      className="flex items-center gap-2.5 px-3.5 py-2.5 my-2 w-full bg-[var(--bg-card)] hover:bg-[var(--bg-active)] border border-[var(--border-subtle)] hover:border-[var(--text-accent)]/50 rounded-[8px] transition-all text-left shadow-sm group"
                      title="Send this query to Dashboard Search"
                    >
                      <div className="w-5 h-5 rounded-full bg-[var(--text-accent)]/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Search size={10} className="text-[var(--text-accent)]" />
                      </div>
                      <span className="font-semibold text-[12px] text-[var(--text-main)] leading-snug tracking-tight">{children}</span>
                    </button>
                  )
                }
                return <a href={href} className="text-[var(--text-accent)] hover:underline" {...props}>{children}</a>
              },
              table: ({node, ...props}) => (
                <div className="w-full overflow-x-auto my-4 bg-transparent border-0 shadow-none custom-scrollbar">
                  <table className="w-full text-left border-collapse text-[12px] text-[var(--text-main)]" {...props} />
                </div>
              ),
              thead: ({node, ...props}) => <thead className="bg-transparent border-b border-white/10 dark:border-[var(--border-subtle)]/50 font-bold text-[var(--text-main)]" {...props} />,
              tbody: ({node, ...props}) => <tbody className="divide-y divide-white/5 dark:divide-[var(--border-subtle)]/20" {...props} />,
              tr: ({node, ...props}) => <tr className="bg-transparent transition-none" {...props} />,
              th: ({node, ...props}) => <th className="py-2.5 pr-6 pl-0 first:pl-0 font-semibold text-[var(--text-main)] normal-case tracking-normal whitespace-nowrap" {...props} />,
              td: ({node, ...props}) => <td className="py-2.5 pr-6 pl-0 first:pl-0 text-[var(--text-main)]/80 leading-relaxed break-words" {...props} />
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

const UserMessage = memo(({ text, attachedFile }) => (
  <div className="flex flex-col items-end w-full py-1 animate-in fade-in duration-200">
    {attachedFile && (
      <div className="relative flex flex-col mb-3 w-[140px] h-[140px] bg-[var(--bg-active)] border border-white/[0.05] rounded-[24px] opacity-90 transition-colors shadow-sm self-end">
        <div className="p-4 pb-2">
          <div className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-[var(--bg-panel)] mb-1 shadow-sm">
            <FileText size={20} className="text-[#10a37f] dark:text-[#2dd4bf]" />
          </div>
        </div>
        <div className="px-4 pb-4 flex-1 overflow-hidden flex items-start">
          <span className="text-[12px] font-semibold text-[var(--text-main)] leading-[1.3] line-clamp-3 break-words uppercase tracking-wide opacity-90">
            {attachedFile.name}
          </span>
        </div>
      </div>
    )}
    <div className="bg-[var(--bg-panel)] px-4 py-3 max-w-[90%] rounded-2xl rounded-tr-sm border border-white/[0.05] shadow-sm">
      <p className="text-[13.5px] leading-relaxed font-normal text-[var(--text-main)] whitespace-pre-wrap break-words">{text}</p>
    </div>
  </div>
))

const EMPTY_STATE = {}

const ChatBot = ({ appState = EMPTY_STATE }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [savedResponses, setSavedResponses] = useState({})
  const [dbStats, setDbStats] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)
  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const enhancedAppState = useMemo(() => ({ ...appState, ...dbStats }), [appState, dbStats])

  useEffect(() => {
    const handleClose = () => setIsOpen(false)
    window.addEventListener('close-chatbot', handleClose)
    return () => window.removeEventListener('close-chatbot', handleClose)
  }, [])

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      if (input && input.trim() !== '') {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
      }
    }
  }, [input])

  const handleInput = useCallback((e) => {
    setInput(e.target.value)
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return

    // Prevent massive files from exceeding the LLM context limit
    if (file.size > 1024 * 1024) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: `**File Too Large**: The file \`${file.name}\` is ${(file.size / (1024*1024)).toFixed(2)} MB. \n\nFiles attached directly to the chat must be under **1 MB** to fit securely within the AI's short-term memory limit. For massive files or datasets, please ingest them into your Knowledge Base first, and then ask me to search for them instead!` 
      }])
      return
    }

    try {
      const path = window.api.getPathForFile(file)
      if (path) {
        const content = await window.api.system.readFileContent(path)
        if (content) {
          setAttachedFile({ name: file.name, content })
        }
      }
    } catch (err) {
      console.error('Failed to read dragged file:', err)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    // Reset the input so the same file can be selected again if needed
    e.target.value = ''

    if (file.size > 1024 * 1024) {
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: `**File Too Large**: The file \`${file.name}\` is ${(file.size / (1024*1024)).toFixed(2)} MB. \n\nFiles attached directly to the chat must be under **1 MB**. For massive files, please ingest them into your Knowledge Base first!` 
      }])
      return
    }

    try {
      const path = window.api.getPathForFile(file)
      if (path) {
        const content = await window.api.system.readFileContent(path)
        if (content) {
          setAttachedFile({ name: file.name, content })
        }
      }
    } catch (err) {
      console.error('Failed to read selected file:', err)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setAttachedFile(null)
    setSavedResponses({})
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

  const sendQuickPrompt = useCallback(async (text) => {
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
  }, [isTyping, messages, enhancedAppState])

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
    if ((!input.trim() && !attachedFile) || isTyping) return

    const currentAttached = attachedFile
    const userMsg = { role: 'user', content: input, attachedFile: currentAttached }
    setMessages(prev => [...prev, { role: 'user', text: input, attachedFile: currentAttached }])
    setInput('')
    setAttachedFile(null)
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
          "fixed bottom-5 right-5 flex items-center justify-center w-8 h-8 rounded-[6px] bg-[var(--bg-panel)] border border-white/[0.05] text-[var(--text-accent)] shadow-none hover:bg-white/[0.04] hover:text-[var(--text-main)] transition-all duration-150 z-40",
          isOpen ? "scale-75 opacity-0 pointer-events-none" : "scale-100 opacity-100"
        )}
        title="Open Assistant"
      >
        <MessageSquare size={15} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
          <div
            className="bg-[var(--bg-app)] rounded-[5px] shadow-[var(--shadow-modal)] flex flex-col overflow-hidden w-[80vw] h-[85vh] max-w-[920px] animate-in zoom-in-95 duration-200 relative"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Header matching main window titlebar style & proportions */}
            <div className="h-[26px] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 select-none border-b border-white/[0.04] relative z-40">
              <div className="flex items-center gap-1.5 px-2.5 h-full">
                <Bot size={13} className="text-[var(--text-accent)] shrink-0" />
                <h3 className="text-[11px] font-semibold text-[var(--text-main)] tracking-tight">KManager Agent</h3>
              </div>
              <div className="flex h-full items-center">
                {messages.length > 0 && (
                  <button onClick={handleClearChat} className="h-full px-3 hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-red-400 transition-colors flex items-center justify-center border-0" title="Clear Session">
                    <Trash2 size={12} />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center border-0" title="Close (Esc)">
                  <X size={13} />
                </button>
              </div>
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
                    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
                      {['Summarize key insights across documents', 'Find core concepts and definitions', 'Compare two related topics'].map((s) => (
                        <button key={s} onClick={() => sendQuickPrompt(s)}
                          className="flex-1 text-left px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] bg-white/[0.03] hover:bg-white/[0.06] rounded-[5px] border-0 transition-colors">
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  msg.role === 'user'
                    ? <UserMessage key={idx} text={msg.text} attachedFile={msg.attachedFile} />
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

            <div className="px-6 pb-6 pt-2 bg-transparent shrink-0 relative z-40">
              <div className="max-w-3xl mx-auto w-full">
                <div 
                  className="flex flex-col bg-white/[0.02] border border-white/[0.05] rounded-[24px] transition-all duration-200 overflow-hidden relative"
                  onDragEnter={handleDragOver}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  
                  {isDragging && (
                    <div className="absolute inset-0 z-50 bg-[var(--bg-panel)]/95 backdrop-blur flex flex-col items-center justify-center border-2 border-dashed border-[var(--text-accent)] rounded-[24px] pointer-events-none transition-all duration-200">
                      <FileText size={24} className="text-[var(--text-accent)] mb-2 animate-bounce" />
                      <h3 className="text-sm font-bold text-[var(--text-main)]">Drop file to attach</h3>
                    </div>
                  )}

                  {attachedFile && (
                    <div className="relative flex flex-col mx-4 mt-4 w-[140px] h-[140px] bg-[var(--bg-active)] hover:bg-white/[0.04] border border-white/[0.05] rounded-[24px] group animate-in slide-in-from-bottom-2 duration-200 transition-colors shadow-sm">
                      <div className="p-4 pb-2">
                        <div className="w-10 h-10 flex items-center justify-center rounded-[10px] bg-[var(--bg-panel)] mb-1 shadow-sm">
                          <FileText size={20} className="text-[#10a37f] dark:text-[#2dd4bf]" />
                        </div>
                      </div>
                      <div className="px-4 pb-4 flex-1 overflow-hidden flex items-start">
                        <span className="text-[12px] font-semibold text-[var(--text-main)] leading-[1.3] line-clamp-3 break-words uppercase tracking-wide opacity-90">
                          {attachedFile.name}
                        </span>
                      </div>
                      <button 
                        onClick={() => setAttachedFile(null)} 
                        className="absolute -top-2 -right-2 w-7 h-7 flex items-center justify-center bg-[var(--bg-card)] border border-white/[0.1] hover:bg-red-500 hover:border-red-500 hover:text-white rounded-full text-[var(--text-muted)] transition-all opacity-0 group-hover:opacity-100 shadow-md z-10"
                      >
                        <X size={14} strokeWidth={2.5} />
                      </button>
                    </div>
                  )}

                  {/* Top Row: Auto-growing Textarea */}
                  <textarea 
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question or drop a file to attach..."
                    className="w-full bg-transparent border-none outline-none text-[13.5px] font-normal text-[var(--text-main)] py-3 px-4 placeholder-[var(--text-muted)]/60 resize-none leading-relaxed overflow-y-auto custom-scrollbar max-h-40"
                    autoComplete="off"
                    spellCheck="false"
                  />

                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={handleFileSelect}
                  />

                  {/* Bottom Row: Send Button & Actions */}
                  <div className="flex items-center justify-between px-3 pb-2 pt-1 select-none">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center justify-center w-7 h-7 rounded-[8px] bg-white/[0.02] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-all border-0 shrink-0" 
                        title="Click to select a file or drag & drop anywhere"
                      >
                        <Paperclip size={14} />
                      </button>
                      <span className="text-[11px] text-[var(--text-faint)] hidden sm:block">
                        Press Enter to send • Drag & drop to attach files
                      </span>
                    </div>
                    <button 
                      onClick={handleSend}
                      disabled={(!input.trim() && !attachedFile) || isTyping}
                      className="w-7 h-7 rounded-[8px] bg-[var(--text-accent)] hover:opacity-90 text-white disabled:opacity-30 transition-all duration-150 flex items-center justify-center border-0 shrink-0"
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
