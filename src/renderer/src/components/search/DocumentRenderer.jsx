import React, { useState, useEffect, Suspense, lazy } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'
import remarkGfm from 'remark-gfm'
const MermaidDiagram = lazy(() => import('./MermaidDiagram'))

const ReactMarkdown = lazy(() => import('react-markdown'))

const formatMarkdownText = (text) => {
  if (!text || typeof text !== 'string') return ''

  // Restore newlines between collapsed markdown table rows (| foo || bar | -> | foo |\n| bar |)
  let result = text
    .replace(/(\|\s*[-:]+[-| :]*\|)\s*\|/g, '$1\n|')
    .replace(/\|\s*\|\s*(?=[A-Za-z0-9*_`\[|])/g, '|\n| ')
    .replace(/\|\s+\|/g, '|\n|')

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

  // Ensure consecutive table rows starting with '|' have a markdown separator row (| --- |) after the first row
  const lines = result.split('\n')
  const formattedLines = []
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()
    formattedLines.push(lines[i])
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < lines.length) {
      const nextTrimmed = lines[i + 1].trim()
      if (nextTrimmed.startsWith('|') && !nextTrimmed.includes('---')) {
        const colCount = (trimmed.match(/\|/g) || []).length - 1
        if (colCount > 0) {
          formattedLines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
        }
      }
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
      className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-[10.5px] font-medium border border-[var(--border-subtle)] h-5"
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
    <div className="my-3 rounded-[5px] overflow-hidden border border-[var(--border-main)] bg-[var(--bg-card)] max-w-full">
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
  <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 my-0.5 rounded-md bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-accent)] text-[11.5px] font-medium font-sans leading-none hover:bg-[var(--bg-active)] hover:border-[var(--text-accent)] transition-colors cursor-default whitespace-nowrap">
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
      <div className="my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-emerald-500 border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm">
        <div className="font-semibold tracking-wider text-[11px] text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
          💡 TIP
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!TIP\]\s*/i)}</div>
      </div>
    )
  }
  if (/^\[!NOTE\]/i.test(rawText)) {
    return (
      <div className="my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-blue-500 border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm">
        <div className="font-semibold tracking-wider text-[11px] text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
          ℹ️ NOTE
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!NOTE\]\s*/i)}</div>
      </div>
    )
  }
  if (/^\[!(IMPORTANT|WARNING|CAUTION)\]/i.test(rawText)) {
    return (
      <div className="my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-amber-500 border border-[var(--border-subtle)] bg-[var(--bg-panel)] text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm">
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
      <code className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] px-1.5 py-0.5 rounded text-[13px] text-[var(--text-main)] font-mono break-words whitespace-pre-wrap" {...props}>
        {children}
      </code>
    )
  },
  blockquote: ({node, ...props}) => (
    <blockquote className="border-l-[3.5px] border-[var(--text-accent)] bg-[var(--bg-panel)]/80 rounded-r-md px-4 py-3 text-[var(--text-main)] italic my-4 border border-[var(--border-subtle)] shadow-sm break-words" {...props} />
  ),
  a: ({node, ...props}) => <a className="text-[var(--text-accent)] hover:underline font-medium break-words" target="_blank" rel="noopener noreferrer" {...props} />,
  hr: ({node, ...props}) => <hr className="border-[var(--border-subtle)] my-6" {...props} />,
  table: ({node, ...props}) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-[var(--border-main)] bg-[var(--bg-card)] max-w-full">
      <table className="w-full text-left border-collapse text-[13px] text-[var(--text-main)]" {...props} />
    </div>
  ),
  thead: ({node, ...props}) => <thead className="bg-[var(--bg-panel)] border-b border-[var(--border-main)] font-bold text-[var(--text-main)]" {...props} />,
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

const DocumentRenderer = ({ content, category = 'DOCUMENT', fileTitle = '' }) => {
  if (!content) return null

  const ext = fileTitle ? fileTitle.split('.').pop().toLowerCase() : ''
  const isCodeFile = ['py', 'js', 'jsx', 'ts', 'tsx', 'sql', 'html', 'css', 'sh', 'bash', 'java', 'cpp', 'c', 'rust', 'go'].includes(ext)

  if (category === 'JSON' || ext === 'json') {
    const formattedJson = formatJsonContent(content)
    if (content.length > 100000) {
      return (
        <div className="bg-[#1e1e1e] rounded-xl border border-[#2e2e2e] p-4 overflow-auto text-gray-300 text-[13px] font-mono leading-relaxed custom-scrollbar">
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
        <div className="bg-[#1e1e1e] rounded-xl border border-[#2e2e2e] p-4 overflow-auto text-gray-300 text-[13px] font-mono leading-relaxed custom-scrollbar">
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
    <div className="text-[var(--text-main)] text-[14.5px] leading-relaxed max-w-full overflow-hidden">
      <Suspense fallback={<div className="flex items-center justify-center py-10 text-[var(--text-muted)] animate-pulse text-sm">Loading document...</div>}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={cleanMarkdownComponents}>
          {formattedContent}
        </ReactMarkdown>
      </Suspense>
    </div>
  )
}

export default DocumentRenderer
export { cleanMarkdownComponents, formatMarkdownText, formatJsonContent }
