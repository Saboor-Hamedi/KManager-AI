import React, { useState, useRef, useEffect, useLayoutEffect, memo, useCallback, useMemo } from 'react'
import { MessageSquare, X, Send, Bot, User, Plus, Check, ArrowUp, ThumbsUp, ThumbsDown, Copy, Search, ArrowRight, Trash2, FileText, Paperclip, RefreshCw, Database } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { formatMarkdownText, remarkMath, rehypeKatex, WikiHoverCite } from './search/DocumentRenderer'
import SuggestedPrompts from './search/SuggestedPrompts'
import { cn } from '../lib/utils'
import { getSetting } from '../lib/settings'
import { queryLLM } from '../lib/LLMProvider'
import { useKeyboardShortcuts } from '../../../utils/useKeyboardShortcuts'
import ConfirmModal from './layout/ConfirmModal'
import Wrapper from './code/Wrapper'

const MermaidDiagram = React.lazy(() => import('./search/MermaidDiagram'))
const MarkdownImage = React.lazy(() => import('./search/MarkdownImage'))

const ChatCodeBlock = memo(({ lang, codeString }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Wrapper maxHeight={400}>
      <div className="my-4 rounded-t-[5px] rounded-b-none overflow-hidden bg-[#1e1e1e] shadow-sm max-w-full ring-1 ring-white/5">
        {/* Persistent Small Header - Ultra Subtle */}
        <div className="flex items-center justify-between px-2 py-1 bg-transparent select-none">
          <div className="text-[12px] font-semibold text-white/30 uppercase tracking-widest pl-1 leading-none mt-px">
            {lang || 'Code'}
          </div>
          <div className="flex items-center opacity-70 hover:opacity-100 transition-opacity">
            <button 
              onClick={handleCopy}
              className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors border-0"
              title="Copy to clipboard"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
        </div>
        <SyntaxHighlighter
          children={codeString}
          style={vscDarkPlus}
          language={lang || 'text'}
          showLineNumbers={false}
          PreTag="div"
          className="custom-scrollbar"
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
    </Wrapper>
  )
})

const BotMessage = memo(({ text, idx, onSave, savedState, queryText, onSelectPrompt, isLatest }) => {
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [displayedText, setDisplayedText] = useState(isLatest ? '' : text)

  useEffect(() => {
    if (!isLatest) {
      setDisplayedText(text)
      return
    }
    let i = displayedText.length
    if (i >= text.length) return

    const interval = setInterval(() => {
      i += Math.max(2, Math.floor(text.length / 50)) // scale speed with length
      if (i >= text.length) {
        setDisplayedText(text)
        clearInterval(interval)
      } else {
        setDisplayedText(text.slice(0, i))
      }
    }, 15)
    return () => clearInterval(interval)
  }, [text, isLatest])

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

  const formattedText = displayedText

  return (
    <div className="flex flex-col items-start w-full animate-in fade-in duration-200">
      <div className="flex flex-col w-full">
        <div className="py-2 text-xs leading-relaxed text-left bg-transparent text-[var(--text-main)] shadow-none border-0" style={{ overflowWrap: 'break-word' }}>
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
                      <div className="my-1">
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('fill-search', { detail: { query: cleanText } }))
                            window.dispatchEvent(new CustomEvent('close-chatbot'))
                          }}
                          className="w-full group flex items-start gap-2.5 px-3 py-2 rounded-[6px] bg-transparent hover:bg-[var(--bg-active)] text-[12.5px] text-[var(--text-main)] hover:text-[var(--text-accent)] transition-all duration-200 text-left max-w-full break-words"
                        >
                          <span className="shrink-0 mt-0.5 text-[12px] opacity-70 group-hover:opacity-100 transition-opacity">💡</span>
                          <span className="flex-1 transition-colors leading-relaxed">{cleanText}</span>
                          <ArrowRight size={14} className="shrink-0 mt-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--text-accent)]" />
                        </button>
                      </div>
                   )
                }
                return <p className="mb-2 last:mb-0 text-left" {...props}>{children}</p>
              },
              strong: ({node, ...props}) => <strong className="font-bold text-[var(--text-accent)]" {...props} />,
              em: ({node, ...props}) => <em className="italic text-[var(--text-muted)]" {...props} />,
              h1: ({node, ...props}) => <h1 className="text-[15px] font-bold mt-5 mb-3 text-[var(--text-main)]" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-[14px] font-bold mt-4 mb-2.5 text-[var(--text-main)]" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-[13px] font-bold mt-4 mb-2 text-[var(--text-main)]" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-3 space-y-1.5 marker:text-[var(--text-muted)]" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-3 space-y-1.5 marker:text-[var(--text-muted)]" {...props} />,
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
                      <li className="my-0.5 list-none" {...props}>
                        <button
                          onClick={() => {
                            window.dispatchEvent(new CustomEvent('fill-search', { detail: { query: cleanText } }))
                            window.dispatchEvent(new CustomEvent('close-chatbot'))
                          }}
                          className="w-full group flex items-start gap-2.5 px-3 py-2 rounded-[6px] bg-transparent hover:bg-[var(--bg-active)] text-[12.5px] text-[var(--text-main)] hover:text-[var(--text-accent)] transition-all duration-200 text-left max-w-full break-words -ml-3"
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
              img: ({node, src, alt, ...props}) => (
                <React.Suspense fallback={<div className="w-full h-[200px] my-4 rounded-[5px] bg-[#1e1e1e] animate-pulse ring-1 ring-white/5 flex items-center justify-center text-[12px] text-white/30 tracking-widest uppercase">Loading Image...</div>}>
                  <MarkdownImage src={src} alt={alt} {...props} />
                </React.Suspense>
              ),
              code: ({node, className, children, ...props}) => {
                const match = /language-(\w+)/.exec(className || '')
                const lang = match ? match[1] : ''
                const codeString = String(children).replace(/\n$/, '')
                
                if (codeString.startsWith('sourcecite:')) {
                  const parts = codeString.slice('sourcecite:'.length).split('|')
                  const rawIdx = parts[0]
                  const idx = isNaN(Number(rawIdx)) ? rawIdx : Number(rawIdx)
                  const title = parts[1] || `Source ${idx}`
                  const displayNum = parts[2] || (isNaN(Number(idx)) ? '?' : idx)
                  return <WikiHoverCite idx={idx} title={title} displayNum={displayNum} />
                }

                const isMultiLine = codeString.includes('\n')
                const isBlock = isMultiLine || Boolean(lang)

                if (!isBlock) {
                  return <code className="bg-[var(--bg-active)] px-1.5 py-0.5 rounded-[4px] text-[11.5px] text-[var(--text-accent)] font-mono break-words whitespace-pre-wrap border-0" {...props}>{children}</code>
                }
                
                if (lang.toLowerCase() === 'mermaid') {
                  return (
                    <React.Suspense fallback={<div className="p-4 text-[12px] text-center text-[var(--text-muted)] animate-pulse">Loading diagram renderer...</div>}>
                      <MermaidDiagram chart={codeString} />
                    </React.Suspense>
                  )
                }

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
                return <a href={href} className="text-[var(--text-accent)] hover:underline" target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
              },
              table: ({node, ...props}) => (
                <div className="w-full overflow-x-auto my-4 bg-transparent border-0 shadow-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <table className="w-full text-left border-collapse text-[12px] text-[var(--text-main)]" {...props} />
                </div>
              ),
              thead: ({node, ...props}) => <thead className="bg-transparent border-b border-white/10 dark:border-[var(--border-subtle)]/50 font-bold text-[var(--text-main)]" {...props} />,
              tbody: ({node, ...props}) => <tbody className="divide-y divide-white/5 dark:divide-[var(--border-subtle)]/20" {...props} />,
              tr: ({node, ...props}) => <tr className="bg-transparent transition-none" {...props} />,
              th: ({node, ...props}) => <th className="py-2.5 pr-6 pl-0 first:pl-0 font-semibold text-[var(--text-main)] normal-case tracking-normal whitespace-nowrap" {...props} />,
              td: ({node, ...props}) => <td className="py-2.5 pr-6 pl-0 first:pl-0 text-[var(--text-main)]/80 leading-relaxed break-words" {...props} />
            }}>
              {formatMarkdownText(formattedText)}
            </ReactMarkdown>
          </div>
        </div>
        {idx > 0 && displayedText === text && (
          <div className="flex flex-col gap-2 mt-1.5 w-full animate-in fade-in duration-300">
            <div className="flex items-center gap-1.5 mt-1">
              <div className="flex items-center gap-1 shrink-0 select-none">
                <button
                  onClick={() => handleFeedback('helpful')}
                  className={`p-1.5 rounded-[4px] transition-colors flex items-center justify-center border-0 ${
                    feedback === 'helpful' ? 'text-[#a855f7] bg-[var(--bg-active)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                  }`}
                  title="Helpful response"
                >
                  <ThumbsUp size={13} />
                </button>
                <button
                  onClick={() => handleFeedback('unhelpful')}
                  className={`p-1.5 rounded-[4px] transition-colors flex items-center justify-center border-0 ${
                    feedback === 'unhelpful' ? 'text-red-400 bg-[var(--bg-active)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                  }`}
                  title="Not helpful"
                >
                  <ThumbsDown size={13} />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-[4px] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
                  title="Copy response text"
                >
                  {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
                <button
                  onClick={() => queryText && onSelectPrompt(queryText)}
                  className="p-1.5 rounded-[4px] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
                  title="Regenerate response"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              <button
                onClick={() => onSave(idx, text)}
                disabled={savedState === 'saving' || savedState === 'saved'}
                className={`flex items-center justify-center p-1.5 rounded-[4px] transition-all border-0 shadow-none ${
                  savedState === 'saved'
                    ? 'text-green-400 cursor-default bg-transparent'
                    : savedState === 'saving'
                      ? 'text-[var(--text-muted)] opacity-70 cursor-wait bg-transparent'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] bg-transparent'
                }`}
                title={savedState === 'saved' ? 'Saved' : 'Save to Knowledge Base'}
              >
                {savedState === 'saved' ? (
                  <Check size={13} className="text-green-400" />
                ) : savedState === 'saving' ? (
                  <span className="w-3 h-3 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={13} />
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
  <div className="flex flex-col items-end w-full py-2 animate-in fade-in duration-200">
    {attachedFile && (
      <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-[#2b313a]/50 border border-white/[0.05] rounded-lg shadow-sm self-end">
        <FileText size={14} className="text-[#10a37f] dark:text-[#2dd4bf]" />
        <span className="text-[11px] font-semibold text-[var(--text-main)] truncate max-w-[200px]">
          {attachedFile.name}
        </span>
      </div>
    )}
    <div className="bg-[#2b313a] px-4 py-3 max-w-[90%] rounded-2xl rounded-tr-sm border border-white/[0.05] shadow-sm">
      <p className="text-[13.5px] leading-relaxed font-normal text-[var(--text-main)] whitespace-pre-wrap break-words">{text}</p>
    </div>
  </div>
))


const EMPTY_STATE = {}

const ChatBot = ({ inline = false, initialQuery = '', appState = EMPTY_STATE }) => {
  const [isOpen, setIsOpen] = useState(inline)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState(initialQuery)
  const [isTyping, setIsTyping] = useState(false)
  const [savedResponses, setSavedResponses] = useState({})
  const [dbStats, setDbStats] = useState({})
  const [isDragging, setIsDragging] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)
  
  const allPrompts = useMemo(() => [
    'Summarize key insights across documents',
    'Find core concepts and definitions',
    'Compare two related topics',
    'What are the main themes in my library?',
    'Find actionable items in recent notes',
    'Explain the most complex topic simply',
    'Generate a study guide from my notes',
    'List all unresolved questions in my documents'
  ], [])
  
  const [randomSuggestions, setRandomSuggestions] = useState([])
  
  useEffect(() => {
    setRandomSuggestions([...allPrompts].sort(() => 0.5 - Math.random()).slice(0, 3))
  }, [allPrompts])

  const messagesEndRef = useRef(null)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  const enhancedAppState = useMemo(() => ({ ...appState, ...dbStats }), [appState, dbStats])

  useEffect(() => {
    const handleClose = () => setIsOpen(false)
    const handleToggle = () => setIsOpen(prev => !prev)
    window.addEventListener('close-chatbot', handleClose)
    window.addEventListener('toggle-chatbot', handleToggle)
    return () => {
      window.removeEventListener('close-chatbot', handleClose)
      window.removeEventListener('toggle-chatbot', handleToggle)
    }
  }, [])

  useKeyboardShortcuts({
    onToggleChat: () => setIsOpen(prev => !prev),
    onEscape: isOpen ? () => {
      setIsOpen(false)
      return true
    } : undefined
  })

  useLayoutEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      if (input && input.trim() !== '') {
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
      }
    }
  }, [input])

  useEffect(() => {
    if (isOpen && textareaRef.current && !inline) {
      // Small timeout ensures the modal is visible before focusing
      setTimeout(() => textareaRef.current.focus(), 50)
    }
  }, [isOpen, inline])

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

  const [showConfirm, setShowConfirm] = useState(false)

  const handleClearChat = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const executeClearChat = () => {
    setMessages([])
    setAttachedFile(null)
    setSavedResponses({})
    setShowConfirm(false)
  }



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
      let query = 'AI Response'
      if (idx > 0 && messages[idx - 1].role === 'user') {
        query = messages[idx - 1].text
      }
      const res = await window.electron.ipcRenderer.invoke('db:ingest-text', { title: query, text })
      if (!res.success && res.message && res.message.includes('DUPLICATE_CONTENT')) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Duplicate data: This response already exists in your library.', type: 'info', duration: 4000 } }))
      } else if (res.success) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Saved to library', type: 'success', duration: 3000 } }))
      }
      setSavedResponses(prev => ({ ...prev, [idx]: res.success ? 'saved' : 'error' }))
    } catch (err) {
      if (err.message && err.message.includes('DUPLICATE_CONTENT')) {
        window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Duplicate data: This response already exists in your library.', type: 'info', duration: 4000 } }))
      }
      setSavedResponses(prev => ({ ...prev, [idx]: 'error' }))
    }
  }, [messages])

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
    const timer = setTimeout(scrollToBottom, 150)
    return () => clearTimeout(timer)
  }, [messages, isTyping, isOpen, scrollToBottom])

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



  const [scope, setScope] = useState('All Files')
  const toggleScope = () => {
    const scopes = ['All Files', 'Recent Files', 'Current Folder']
    setScope(scopes[(scopes.indexOf(scope) + 1) % scopes.length])
  }

  const ChatUI = (
    <div
      className={cn(
        "bg-[var(--bg-app)] flex flex-col overflow-hidden relative",
        inline ? "w-full h-full" : "rounded-[5px] shadow-[var(--shadow-modal)] w-[80vw] h-[85vh] max-w-[920px] animate-in zoom-in-95 duration-200"
      )}
      onClick={!inline ? (e) => e.stopPropagation() : undefined}
    >
      {/* Header matching main window titlebar style & proportions */}
      {!inline && (
        <div className="h-[26px] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 select-none border-b border-white/[0.04] relative z-40">
          <div className="flex items-center gap-1.5 px-2.5 h-full">
            <Bot size={13} className="text-[var(--text-accent)] shrink-0" />
            <h3 className="text-[12px] font-semibold text-[var(--text-main)] tracking-tight">KManager Agent</h3>
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
      )}

      {inline && messages.length > 0 && (
        <div className="absolute top-4 right-4 z-50">
          <button onClick={handleClearChat} className="p-2 rounded hover:bg-white/[0.05] text-[var(--text-muted)] hover:text-red-400 transition-colors flex items-center justify-center border-0 shadow-sm" title="Clear Session">
            <Trash2 size={14} />
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pt-6 pb-2 md:px-10 custom-scrollbar">
        <div className="max-w-3xl mx-auto flex flex-col gap-3 h-full min-h-full">
          {messages.length === 0 && !isTyping && (
            <div className="flex flex-col items-center justify-center text-center py-6 px-4 h-full flex-1 animate-in fade-in duration-300 relative">
              
              {/* Subtle Background Watermark */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] select-none">
                <div className="text-[200px] font-black tracking-tighter text-white">KM</div>
              </div>

              <div className="w-12 h-12 rounded-xl bg-[var(--bg-active)] flex items-center justify-center mb-4 shadow-sm border border-[var(--border-subtle)] relative z-10">
                <kbd className="font-mono font-bold text-base text-[var(--text-accent)]">KM</kbd>
              </div>
              <h3 className="text-base font-semibold text-[var(--text-main)] mb-1.5 relative z-10">KManager AI</h3>
              <p className="text-xs text-[var(--text-muted)] mb-6 max-w-[320px] leading-relaxed relative z-10">
                {dbStats.totalDocuments
                  ? `Your knowledge base has ${dbStats.totalDocuments} documents. Ask me anything.`
                  : 'Ask me about your knowledge base or features.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md relative z-10">
                {randomSuggestions.map((s) => (
                  <button key={s} onClick={() => sendQuickPrompt(s)}
                    className="flex-1 text-left px-3 py-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] bg-white/[0.03] hover:bg-white/[0.06] rounded-[5px] border-0 transition-colors shadow-sm">
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
                  isLatest={idx === messages.length - 1}
                />
          ))}
          {isTyping && (
            <div className="flex items-start w-full animate-in fade-in duration-200">
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[var(--bg-panel)] shadow-sm flex items-center gap-2 border border-white/[0.05]">
                <Bot size={14} className="text-[#10a37f] animate-pulse" />
                <span className="text-[12px] font-medium text-[var(--text-muted)] animate-pulse">Thinking...</span>
              </div>
            </div>
          )}
          {(messages.length > 0 || isTyping) && <div ref={messagesEndRef} className="h-6 shrink-0" />}
        </div>
      </div>

      <div className={cn("bg-transparent shrink-0 relative z-40", inline ? "px-0 pb-0 pt-0 border-t border-white/[0.06] bg-[var(--bg-panel)]" : "px-6 pb-6 pt-2")}>
        <div className={cn("max-w-3xl mx-auto w-full", inline && "max-w-full")}>
          <div 
            className={cn("flex flex-col transition-all duration-200 overflow-hidden relative", inline ? "bg-transparent border-0 rounded-none" : "bg-white/[0.02] border border-white/[0.05] rounded-[24px]")}
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

            {/* Scope Indicator */}
            <div className="flex items-center gap-1.5 pt-1 px-3 pb-0 overflow-x-auto custom-scrollbar">
              <button 
                onClick={toggleScope}
                className="flex items-center gap-1 text-[8px] font-bold tracking-wider uppercase text-[var(--text-accent)] bg-[var(--text-accent)]/15 hover:bg-[var(--text-accent)]/25 hover:scale-105 px-1.5 py-0.5 rounded-sm shadow-sm shrink-0 border-0 transition-all cursor-pointer"
              >
                <Database size={8} /> Scope: {scope}
              </button>
            </div>

            {/* Top Row: Auto-growing Textarea */}
            <textarea 
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question or drop a file to attach..."
              className={cn("w-full bg-transparent border-none outline-none font-normal text-[var(--text-main)] resize-none leading-relaxed overflow-y-auto custom-scrollbar max-h-40", inline ? "text-[13px] py-1.5 px-3 placeholder-[var(--text-faint)]" : "text-[13px] py-2 px-3 placeholder-[var(--text-muted)]/60")}
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
            <div className="flex items-center justify-between select-none px-3 pb-2 pt-0">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center w-6 h-6 rounded-[6px] bg-white/[0.02] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-all border-0 shrink-0" 
                  title="Click to select a file or drag & drop anywhere"
                >
                  <Paperclip size={12} />
                </button>
                <span className="text-[10px] text-[var(--text-faint)] hidden sm:block">
                  Press Enter to send • Drag & drop to attach files
                </span>
              </div>
              <button 
                onClick={handleSend}
                disabled={(!input.trim() && !attachedFile) || isTyping}
                className={cn("w-6 h-6 rounded-[6px] transition-all duration-200 flex items-center justify-center border-0 shrink-0", 
                  (input.trim() || attachedFile) && !isTyping
                    ? "bg-[#10a37f] hover:bg-[#0d8a6b] text-white shadow-[0_0_12px_rgba(16,163,127,0.4)]"
                    : "bg-white/[0.05] text-[var(--text-muted)] opacity-50"
                )}
                title="Send message"
              >
                <ArrowUp size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (inline) {
    return (
      <>
        {ChatUI}
        <ConfirmModal
          isOpen={showConfirm}
          message="Clear current session? Your chat history will be permanently deleted."
          onConfirm={executeClearChat}
          onCancel={() => setShowConfirm(false)}
          confirmText="Clear Session"
        />
      </>
    )
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
          {ChatUI}
        </div>
      )}

      <ConfirmModal
        isOpen={showConfirm}
        message="Clear current session? Your chat history will be permanently deleted."
        onConfirm={executeClearChat}
        onCancel={() => setShowConfirm(false)}
        confirmText="Clear Session"
      />
    </>
  )
}

export default memo(ChatBot)
