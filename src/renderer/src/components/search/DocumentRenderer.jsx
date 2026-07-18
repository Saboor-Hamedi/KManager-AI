import React, { useState, useEffect, Suspense, lazy } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, X } from 'lucide-react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
const MermaidDiagram = lazy(() => import('./MermaidDiagram'))

const ReactMarkdown = lazy(() => import('react-markdown'))

const formatMarkdownText = (text) => {
  if (!text || typeof text !== 'string') return ''

  // Normalize LaTeX math expressions before markdown parsing:
  // 1. Convert block \[ ... \] to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
  // 2. Convert inline \( ... \) to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`)
  // 3. Convert square-bracketed equations right on a line (e.g. [ f_{\text{Hybrid}}(q, d) = \alpha ... ]) into $$ ... $$
  text = text.replace(
    /^\s*\[\s*([^\]\n]*?(?:\\(?:text|alpha|beta|gamma|delta|frac|sum|cdot|int|prod|sigma|theta|omega|partial|mu|pi|lambda|epsilon|_|\^)|[_^]\{|[_^][A-Za-z0-9]|=|\+)[^\]\n]*?)\s*\]\s*$/gm,
    (_, m) => `\n$$\n${m.trim()}\n$$\n`
  )
  // 4. Convert inline `[ f_{\text{...}} = ... ]` inside paragraphs when it contains distinct LaTeX math keywords
  text = text.replace(
    /\[\s*([^\]\n]*?(?:\\(?:text|alpha|beta|gamma|delta|frac|sum|cdot|int|prod|sigma|theta|omega|partial|mu|pi|lambda|epsilon)|[_^]\{)[^\]\n]*?)\s*\]/g,
    (_, m) => `$$ ${m.trim()} $$`
  )

  // Restore newlines between collapsed markdown table rows (| foo || bar | -> | foo |\n| bar |)
  let result = text
    .replace(/(\|\s*[-:]+[-| :]*\|)\s*\|/g, '$1\n|')
    .replace(/\|\s*\|\s*(?=[A-Za-z0-9*_`\[|])/g, '|\n| ')
    .replace(/\|\s+\|/g, '|\n|')

  // Decode literal hex escape sequences (e.g. \xf4, $'\xf4') into actual characters
  result = result.replace(/(?:\$')?\\x([0-9a-fA-F]{2})'?/g, (match, hex) => {
    try {
      // First try URI decode (handles some utf-8 bytes)
      return decodeURIComponent('%' + hex)
    } catch {
      // Fallback to basic char code
      return String.fromCharCode(parseInt(hex, 16))
    }
  })

  // Detect lines that are ONLY a pipe-separated list of [[wikilinks]] (common in Obsidian
  // note metadata like "wikilinks" fields). Render them as a tag cloud paragraph instead.
  result = result.replace(
    /^(\s*\|\s*\[\[[^\]]+\]\]\s*)+\|?\s*$/gm,
    (line) => {
      const tags = [...line.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1])
      return tags.map(t => `\`wikilink:${t}\``).join(' ')
    }
  )

  // Convert remaining standalone [[wikilinks]] to inline wikilink tokens
  result = result.replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_, page) => `\`wikilink:${page.trim()}\``)

  // Convert [Source X] or [Source X: Title] into `sourcecite:` inline code tokens so they render as clickable badges
  result = result.replace(/\[Source\s+#?(\d+)(?:\s*[:|-]\s*([^\]]+))?\]/gi, (_, idx, title) => {
    return `\`sourcecite:${idx}|${(title || '').trim()}\``
  })

  // Clean up and normalize Markdown tables across chunks so they always render properly
  const lines = result.split('\n')
  const formattedLines = []
  let inTable = false
  let tableRowCount = 0

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    const isTableRow = trimmed.startsWith('|') && trimmed.endsWith('|')

    if (isTableRow) {
      if (!inTable) {
        inTable = true
        tableRowCount = 0
      }
      
      const isSeparatorLine = trimmed.includes('---') || trimmed.match(/^\|\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?$/)
      const colCount = Math.max(1, (trimmed.match(/\|/g) || []).length - 1)

      if (tableRowCount === 0 && isSeparatorLine) {
        // If a chunked table starts with just the separator line (`| --- | --- |`), prepend a clean header so react-markdown can render it
        const headerRow = '| ' + Array(colCount).fill(0).map((_, idx) => `Col ${idx + 1}`).join(' | ') + ' |'
        formattedLines.push(headerRow)
        const cleanSeparator = '| ' + Array(colCount).fill('---').join(' | ') + ' |'
        formattedLines.push(cleanSeparator)
        tableRowCount += 2
        continue
      }

      if (isSeparatorLine) {
        // Normalize any `--` / `---` separator row to clean `| --- | --- |`
        const cleanSeparator = '| ' + Array(colCount).fill('---').join(' | ') + ' |'
        formattedLines.push(cleanSeparator)
      } else {
        formattedLines.push(lines[i])
        // If this was row 0 (the header) and the next line is NOT a separator line, insert a clean separator right after row 0
        if (tableRowCount === 0 && i + 1 < lines.length) {
          const nextTrimmed = lines[i + 1].trim()
          const nextIsSeparator = nextTrimmed.includes('---') || nextTrimmed.match(/^\|\s*[-:]+\s*(\|\s*[-:]+\s*)+\|?$/)
          if (nextTrimmed.startsWith('|') && !nextIsSeparator) {
            formattedLines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
          }
        }
      }
      tableRowCount++
    } else {
      inTable = false
      tableRowCount = 0
      formattedLines.push(lines[i])
    }
  }
  return formattedLines.join('\n')
}

const CodeCopyButton = ({ code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] border-0 bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-[10.5px] font-medium h-5"
      title="Copy code"
    >
      {copied ? (
        <>
          <Check size={12} className="text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          <span>Copy</span>
        </>
      )}
    </button>
  )
}

const getIsLight = () => {
  if (typeof document === 'undefined') return false
  const dt = document.documentElement.getAttribute('data-theme')
  if (dt === 'light') return true
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-app').trim().toLowerCase()
  return bg === '#ffffff' || bg === '#fff' || bg === 'rgb(255, 255, 255)' || bg === '#f9fafb'
}

const AdaptiveCodeBlock = ({ code, language, title, showLineNumbers = false }) => {
  const [isLight, setIsLight] = useState(getIsLight)

  useEffect(() => {
    setIsLight(getIsLight())
    const observer = new MutationObserver(() => {
      setIsLight(getIsLight())
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="my-3 rounded-[5px] overflow-hidden border-0 bg-[var(--bg-card)] max-w-full shadow-sm">
      <div className="bg-[var(--bg-panel)] px-3.5 py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between text-xs font-semibold text-[var(--text-main)] h-8">
        <span className="font-mono uppercase text-[var(--text-accent)] tracking-wider text-[11px]">{title || language || 'CODE'}</span>
        <CodeCopyButton code={code} />
      </div>
      <SyntaxHighlighter
        children={code}
        style={isLight ? oneLight : vscDarkPlus}
        language={language || 'text'}
        showLineNumbers={showLineNumbers}
        PreTag="div"
        customStyle={{
          margin: 0,
          background: 'transparent',
          color: isLight ? '#1f2937' : '#e5e7eb',
          fontSize: '13px',
          padding: '1rem',
          overflowX: 'auto'
        }}
        wrapLines={true}
        wrapLongLines={true}
      />
    </div>
  )
}

// Pill tag for [[wikilinks]] — renders the page name without the brackets
const WikiTag = ({ label }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 my-0.5 rounded-[5px] bg-[var(--bg-panel)] border-0 text-[var(--text-accent)] text-[11px] font-medium font-sans leading-none hover:bg-[var(--bg-active)] transition-colors cursor-default whitespace-nowrap">
    <span className="opacity-40 text-[9px]">◈</span>
    {label}
  </span>
)


const cleanCalloutChildren = (children, regex) => {
  return React.Children.map(children, child => {
    if (typeof child === 'string') {
      return child.replace(regex, '').trimStart()
    }
    return child
  })
}

const renderCalloutOrParagraph = (children, props) => {
  const rawText = Array.isArray(children)
    ? children.map(c => (typeof c === 'string' ? c : '')).join('')
    : typeof children === 'string'
    ? children
    : ''

  if (/^\[!TIP\]/i.test(rawText)) {
    return (
      <div className="my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-emerald-500 border-0 bg-[var(--bg-panel)] text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm">
        <div className="font-semibold tracking-wider text-[11px] text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
          💡 TIP
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!TIP\]\s*/i)}</div>
      </div>
    )
  }
  if (/^\[!NOTE\]/i.test(rawText)) {
    return (
      <div className="my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-blue-500 border-0 bg-[var(--bg-panel)] text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm">
        <div className="font-semibold tracking-wider text-[11px] text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
          ℹ️ NOTE
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!NOTE\]\s*/i)}</div>
      </div>
    )
  }
  if (/^\[!(IMPORTANT|WARNING|CAUTION)\]/i.test(rawText)) {
    return (
      <div className="my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-amber-500 border-0 bg-[var(--bg-panel)] text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm">
        <div className="font-semibold tracking-wider text-[11px] text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
          ⚠️ ATTENTION
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!(IMPORTANT|WARNING|CAUTION)\]\s*/i)}</div>
      </div>
    )
  }

  // ── Wikilink tag cloud ──────────────────────────────────────────────────
  // When a paragraph contains only WikiTag pills (no plain text between them),
  // render it as a flex-wrap cloud so tags flow naturally across multiple lines.
  const childArray = React.Children.toArray(children)
  const allWikiTags = childArray.length > 0 && childArray.every(child => {
    if (typeof child === 'string') return /^\s*$/.test(child) // allow whitespace-only strings
    return child?.type === WikiTag
  })

  if (allWikiTags) {
    return (
      <div className="flex flex-wrap gap-1 my-3" {...props}>
        {childArray}
      </div>
    )
  }

  return (
    <div className="mb-4 leading-relaxed font-normal text-[var(--text-main)] text-[14.5px] break-words whitespace-normal" {...props}>
      {children}
    </div>
  )
}

const WikiHoverCite = ({ idx, title }) => {
  const [showHover, setShowHover] = React.useState(false)
  const [chunkText, setChunkText] = React.useState('')
  const hoverTimeoutRef = React.useRef(null)

  const handleMouseEnter = () => {
    if (showHover) return
    hoverTimeoutRef.current = setTimeout(() => {
      setShowHover(true)
      if (!chunkText && window.api?.db?.query) {
        window.api.db.query('SELECT content FROM document_chunks WHERE id = $1 OR source_index = $1 LIMIT 1', [idx])
          .then(res => {
            if (res && res[0] && res[0].content) {
              setChunkText(res[0].content)
            }
          })
          .catch(() => {})
      }
    }, 150)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }

  useEffect(() => {
    if (!showHover) return
    const handleClickOutside = () => {
      setShowHover(false)
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [showHover])

  return (
    <span className="relative inline-block overflow-visible" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (window.__openCitationPreviewModal) {
            window.__openCitationPreviewModal(idx, title)
          }
        }}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 mx-0.5 rounded-[5px] bg-[var(--text-accent)]/15 hover:bg-[var(--text-accent)]/25 border-0 text-[var(--text-accent)] text-[11px] font-bold cursor-pointer transition-all shadow-sm select-none align-middle"
        title={`Click to preview Source ${idx}`}
      >
        <span>[Source {idx}]</span>
      </button>

      {showHover && (
        <div 
          onClick={(e) => e.stopPropagation()}
          style={{ backgroundColor: '#161922', opacity: 1, backdropFilter: 'none' }}
          className="absolute left-0 bottom-full mb-2 z-[99999] w-[420px] max-w-[95vw] rounded-[8px] border border-[#2d3548] shadow-[0_20px_60px_rgba(0,0,0,0.95)] overflow-hidden animate-in fade-in duration-150 text-left select-text"
        >
          <div className="flex items-center justify-between px-3 py-2 bg-[#0e1117]/80 border-b border-[#2d3548]/40">
            <span className="text-[10px] font-semibold text-[#8a95a5] truncate max-w-[200px] uppercase tracking-wider">{title || `Source #${idx}`}</span>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                onClick={() => {
                  if (chunkText) navigator.clipboard.writeText(chunkText)
                }}
                className="px-2 py-1 bg-transparent hover:bg-white/5 text-[10px] font-medium text-[#9a9a9a] hover:text-[#e0e0e0] rounded-[4px] border-0 transition-colors"
              >
                Copy
              </button>
              <button
                onClick={() => {
                  setShowHover(false)
                  if (window.__openCitationPreviewModal) window.__openCitationPreviewModal(idx, title)
                }}
                className="px-2 py-1 bg-transparent hover:bg-[var(--text-accent)]/10 text-[10px] font-medium text-[var(--text-accent)] rounded-[4px] border-0 transition-colors"
              >
                Open Full
              </button>
              <div className="w-[1px] h-3 bg-[#2d3548]/80 mx-1"></div>
              <button
                onClick={() => setShowHover(false)}
                className="w-5 h-5 rounded-[4px] hover:bg-white/10 text-[#7a8595] hover:text-white transition-colors flex items-center justify-center shrink-0 border-0"
                title="Close popover"
              >
                <X size={12} strokeWidth={2.5} />
              </button>
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto custom-scrollbar p-3.5 text-[10px] text-[#c0c0c0] leading-relaxed font-sans break-words bg-[#161922]">
            <DocumentRenderer className="text-[#c0c0c0] text-[10px] leading-relaxed max-w-full overflow-visible" content={chunkText || `Source citation #${idx}. Click badge or 'Open Full' to view complete document drawer.`} />
          </div>
        </div>
      )}
    </span>
  )
}

const cleanMarkdownComponents = {
  h1: ({node, ...props}) => <h1 className="text-base font-bold text-[var(--text-main)] mt-5 mb-2.5 break-words" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-sm font-bold text-[var(--text-main)] mt-4 mb-2 border-b border-[var(--border-subtle)] pb-1.5 break-words" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-xs font-semibold text-[var(--text-main)] mt-3 mb-1.5 uppercase tracking-wide break-words" {...props} />,
  h4: ({node, ...props}) => <h4 className="text-xs font-semibold text-[var(--text-main)] mt-2 mb-1 break-words" {...props} />,
  p: ({node, children, ...props}) => renderCalloutOrParagraph(children, props),
  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1.5 marker:text-[var(--text-accent)] font-normal text-[var(--text-main)] text-[14px] break-words" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1.5 marker:text-[var(--text-accent)] font-normal text-[var(--text-main)] text-[14px] break-words" {...props} />,
  li: ({node, ...props}) => <li className="pl-1 font-normal break-words" {...props} />,
  strong: ({node, ...props}) => <strong className="font-semibold text-[var(--text-main)]" {...props} />,
  code: ({node, inline, className, children, ...props}) => {
    const match = /language-(\w+)/.exec(className || '')
    const lang = match ? match[1] : null
    const codeString = String(children).replace(/\n$/, '')

    // ── Wikilink pills ────────────────────────────────────────────────────
    // formatMarkdownText encodes [[Page]] as `wikilink:Page`. Intercept here
    // and render as a styled pill tag rather than a code block.
    if (codeString.startsWith('wikilink:')) {
      return <WikiTag label={codeString.slice('wikilink:'.length)} />
    }

    if (codeString.startsWith('sourcecite:')) {
      const parts = codeString.slice('sourcecite:'.length).split('|')
      const idx = parseInt(parts[0], 10)
      const title = parts[1] || `Source ${idx}`
      return <WikiHoverCite idx={idx} title={title} />
    }

    const cleanCode = codeString.trim()
    const isMermaid = !inline && (
      lang === 'mermaid' ||
      cleanCode.startsWith('graph ') ||
      cleanCode.startsWith('flowchart ') ||
      cleanCode.startsWith('sequenceDiagram') ||
      cleanCode.startsWith('classDiagram') ||
      cleanCode.startsWith('stateDiagram') ||
      cleanCode.startsWith('erDiagram') ||
      cleanCode.startsWith('gantt')
    )

    if (isMermaid) {
      return (
        <Suspense fallback={<div className="my-4 h-24 rounded-xl border border-[#2e2e2e] bg-[#141414] flex items-center justify-center text-gray-500 text-xs animate-pulse">Rendering diagram...</div>}>
          <MermaidDiagram chart={codeString} />
        </Suspense>
      )
    }

    // Only render a full code box if it spans multiple lines OR has an explicit language tag
    const isMultiLine = codeString.includes('\n')
    const isBlock = !inline && (isMultiLine || (Boolean(lang) && codeString.length > 40))

    if (isBlock) {
      return (
        <AdaptiveCodeBlock code={codeString.trim()} language={lang || 'text'} title={lang || 'CODE'} />
      )
    }

    return (
      <code className="bg-[var(--bg-panel)] border-0 px-1.5 py-0.5 rounded-[5px] text-[13px] text-[var(--text-main)] font-mono break-words whitespace-pre-wrap" {...props}>
        {children}
      </code>
    )
  },
  blockquote: ({node, ...props}) => (
    <blockquote className="border-l-[3.5px] border-[var(--text-accent)] bg-[var(--bg-panel)]/80 rounded-[5px] px-4 py-3 text-[var(--text-main)] italic my-4 border-0 shadow-sm break-words" {...props} />
  ),
  a: ({node, ...props}) => <a className="text-[var(--text-accent)] hover:underline font-medium break-words" target="_blank" rel="noopener noreferrer" {...props} />,
  hr: ({node, ...props}) => <hr className="border-[var(--border-subtle)] my-6" {...props} />,
  table: ({node, ...props}) => (
    <div className="my-5 overflow-x-auto rounded-[5px] border-0 bg-[var(--bg-card)] max-w-full shadow-sm">
      <table className="w-full text-left border-collapse text-[13px] text-[var(--text-main)]" {...props} />
    </div>
  ),
  thead: ({node, ...props}) => <thead className="bg-[var(--bg-panel)] border-b border-[var(--border-subtle)] font-bold text-[var(--text-main)]" {...props} />,
  tbody: ({node, ...props}) => <tbody className="divide-y divide-[var(--border-subtle)]" {...props} />,
  tr: ({node, ...props}) => <tr className="hover:bg-[var(--bg-active)] transition-colors" {...props} />,
  th: ({node, ...props}) => <th className="px-4 py-3 font-semibold text-[var(--text-main)] uppercase tracking-wider text-[11px] whitespace-nowrap" {...props} />,
  td: ({node, ...props}) => <td className="px-4 py-3 text-[var(--text-main)] break-words" {...props} />,
  em: ({node, ...props}) => <em className="italic text-[var(--text-accent)] font-normal" {...props} />
}

const formatJsonContent = (content) => {
  if (!content || typeof content !== 'string') return content || ''
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch (e) {
    return content
  }
}

const DocumentRenderer = ({ content, category = 'DOCUMENT', fileTitle = '', className }) => {
  if (!content) return null

  const ext = fileTitle ? fileTitle.split('.').pop().toLowerCase() : ''
  const isCodeFile = ['py', 'js', 'jsx', 'ts', 'tsx', 'sql', 'html', 'css', 'sh', 'bash', 'java', 'cpp', 'c', 'rust', 'go'].includes(ext)

  if (category === 'JSON' || ext === 'json') {
    const formattedJson = formatJsonContent(content)
    if (content.length > 100000) {
      return (
        <div className="bg-[#1e1e1e] rounded-[5px] border-0 p-4 overflow-auto text-gray-300 text-[13px] font-mono leading-relaxed custom-scrollbar shadow-sm">
          <div className="mb-2 text-[#858585] text-xs font-sans border-b border-[#2e2e2e] pb-2">File too large for syntax highlighting. Showing formatted raw text.</div>
          <pre>{formattedJson}</pre>
        </div>
      )
    }
    return (
      <AdaptiveCodeBlock code={formattedJson} language="json" title="JSON Data" showLineNumbers={true} />
    )
  }

  if (isCodeFile) {
    if (content.length > 100000) {
      return (
        <div className="bg-[#1e1e1e] rounded-[5px] border-0 p-4 overflow-auto text-gray-300 text-[13px] font-mono leading-relaxed custom-scrollbar shadow-sm">
          <div className="mb-2 text-[#858585] text-xs font-sans">File too large for syntax highlighting. Showing raw text.</div>
          <pre>{content}</pre>
        </div>
      )
    }
    return (
      <AdaptiveCodeBlock code={content.trim()} language={ext || 'text'} title={`${ext} Source File`} showLineNumbers={true} />
    )
  }

  const formattedContent = formatMarkdownText(content)

  return (
    <div className={className || "text-[var(--text-main)] text-[14.5px] leading-relaxed max-w-full overflow-visible"}>
      <Suspense fallback={<div className="flex items-center justify-center py-10 text-[var(--text-muted)] animate-pulse text-sm">Loading document...</div>}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={cleanMarkdownComponents}>
          {formattedContent}
        </ReactMarkdown>
      </Suspense>
    </div>
  )
}

export default DocumentRenderer
export { cleanMarkdownComponents, formatMarkdownText, formatJsonContent, remarkMath, rehypeKatex }
