import React, { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, X } from 'lucide-react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import './horizontal.css'
const MermaidDiagram = lazy(() => import('./MermaidDiagram'))
const HoverWikilink = lazy(() => import('./HoverWikilink'))
const MarkdownImage = lazy(() => import('./MarkdownImage'))

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

  // 0. Remove completely hallucinated ```markdown fences around the whole document
  result = result.replace(/^```(markdown|md|text)?\n([\s\S]*?)\n```$/gm, '$2')
  
  // 0.5 Remove 4-space indentations that cause accidental code blocks (except for lists)
  result = result.replace(/^( {4}|\t)(?!\s*[-*+]\s|\s*\d+\.\s)/gm, '')

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

  // Auto-convert raw online image URLs into markdown image syntax
  // Looks for http/https URLs ending in common image extensions that aren't already wrapped in markdown links/images or HTML tags
  result = result.replace(/(?<!\]\()(?<!src=["'])(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"'<>]*)?)/gi, (match) => {
    return `![Image](${match})`
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

  // Convert [Source X] / [Source X: Title] / [Doc X] / standalone [1] into `sourcecite:` tokens
  // Display numbers are ALWAYS sequential 1, 2, 3... in order of first appearance
  let citeCounter = 1
  const citeMap = new Map() // key → sequential display number

  const assignCite = (idx, title) => {
    const key = String(idx).trim()
    if (!citeMap.has(key)) {
      citeMap.set(key, citeCounter++)
    }
    return `\`sourcecite:${key}|${(title || '').trim()}|${citeMap.get(key)}\``
  }

  // [Source #1], [Source 1: Title], [Doc #1], [Ref 1], standalone [1] (up to 2 digits)
  result = result.replace(/\[(?:(?:Source|Doc|Ref|Document)\s*#?)?([0-9]{1,2})(?:\s*[:|-]\s*([^\]]+))?\]/gi, (_, idx, title) => assignCite(idx, title))

  // [Source #abc] with alphanumeric IDs
  result = result.replace(/\[Source\s+#?([a-zA-Z0-9_-]+)(?:\s*[:|-]\s*([^\]]+))?\]/gi, (_, idx, title) => assignCite(idx, title))

  // Bare `sourcecite:X` tokens not yet numbered
  result = result.replace(/`sourcecite:([^|`]+)(?:\|([^|`]*))?(?:\|([^|`]*))?`/g, (match, idx, title, existingNum) => {
    if (existingNum) return match // already numbered, leave as-is
    return assignCite(idx, title)
  })

  // Clean up and normalize Markdown tables across chunks so they always render properly inside unified wrappers
  const lines = result.split('\n')
  const formattedLines = []
  let inTable = false
  let tableRowCount = 0

  for (let i = 0; i < lines.length; i++) {
    let trimmed = lines[i].trim()

    // Smart table row detection: recover table headers or rows where leading/trailing pipe (|) was omitted or stripped
    // e.g., "Retrieval latency | Index performance |" right before a table separator or row
    const pipeCount = (trimmed.match(/\|/g) || []).length
    const isSeparatorLine = pipeCount >= 1 && (
      /^\s*\|?\s*[-:]+\s*\|\s*[-:]+/.test(trimmed) ||
      /\|\s*[-:]+\s*\|/.test(trimmed)
    )

    if (!trimmed.startsWith('|') && pipeCount >= 1) {
      const nextTrimmed = (i + 1 < lines.length) ? lines[i + 1].trim() : ''
      const prevTrimmed = (i - 1 >= 0) ? lines[i - 1].trim() : ''
      const nextPipeCount = (nextTrimmed.match(/\|/g) || []).length
      const nextIsSep = nextPipeCount >= 1 && (/^\s*\|?\s*[-:]+\s*\|\s*[-:]+/.test(nextTrimmed) || /\|\s*[-:]+\s*\|/.test(nextTrimmed))
      const prevPipeCount = (prevTrimmed.match(/\|/g) || []).length
      const prevIsSepOrRow = prevTrimmed.startsWith('|') || (prevPipeCount >= 1 && (/^\s*\|?\s*[-:]+\s*\|\s*[-:]+/.test(prevTrimmed) || /\|\s*[-:]+\s*\|/.test(prevTrimmed)))
      
      // If this row is right above a table separator, right below a table row/separator, or ends with '|' with multiple columns
      if (nextIsSep || nextTrimmed.startsWith('|') || prevIsSepOrRow || (trimmed.endsWith('|') && pipeCount >= 1)) {
        trimmed = '| ' + trimmed
      }
    }

    const isTableRow = isSeparatorLine || (trimmed.startsWith('|') && (trimmed.endsWith('|') || pipeCount >= 1))

    if (isTableRow) {
      if (!trimmed.endsWith('|')) {
        trimmed = trimmed + ' |'
      }
      if (!inTable) {
        inTable = true
        tableRowCount = 0
      }
      
      const colCount = Math.max(1, (trimmed.match(/\|/g) || []).length - 1)

      if (tableRowCount === 0 && isSeparatorLine) {
        // If a chunked table starts with just the separator line (`| --- | --- |`), prepend a clean header
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
        formattedLines.push(trimmed)
        // If this was row 0 (the header) and the next line is NOT a separator line, insert a clean separator right after row 0
        if (tableRowCount === 0 && i + 1 < lines.length) {
          const nextTrimmed = lines[i + 1].trim()
          const nextPipeCount = (nextTrimmed.match(/\|/g) || []).length
          const nextIsSeparator = nextPipeCount >= 1 && (/^\s*\|?\s*[-:]+\s*\|\s*[-:]+/.test(nextTrimmed) || /\|\s*[-:]+\s*\|/.test(nextTrimmed))
          if ((nextTrimmed.startsWith('|') || nextPipeCount >= 1) && !nextIsSeparator && !nextTrimmed.includes('---')) {
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

  let finalResult = formattedLines.join('\n')

  // ── Make chunks flow like real, properly formatted paragraphs ──
  // 1. Capitalize the very first letter of the text if it is lowercase ([a-z])
  finalResult = finalResult.replace(/^(\s*(?:[>*#\-\d.]+\s+)*)([a-z])/gm, (_, prefix, char) => prefix + char.toUpperCase())
  
  // 2. Capitalize the first letter right after a period, question mark, or exclamation point if lowercase
  finalResult = finalResult.replace(/([.!?]\s+|\n\n\s*|\n\s*-\s+|\n\s*\d+\.\s+)([a-z])/g, (_, prefix, char) => prefix + char.toUpperCase())

  // ── Smart Section & Numbered List Formatting ──
  // Break inline numbered list items (`1. `, `2. ` or `1) `, `2) `) onto double newlines when following punctuation or continuing a list
  finalResult = finalResult.replace(/([.:!?;])\s+(\d{1,2}[\.\)])\s+([A-Z])/g, '$1\n\n$2 $3')
  finalResult = finalResult.replace(/([.:!?;])\s+(\d{1,2}[\.\)])\s+([A-Z])/g, '$1\n\n$2 $3')

  // Break inline numbered headings/sections (`2:3b Program input files:`, `1: Embedding strategies`) onto double newlines as distinct headers
  finalResult = finalResult.replace(/([.:!?;])\s+(\d{1,2}(?::[0-9a-zA-Z]+)?\s+[^.:!?;]+:)\s+([A-Z])/g, '$1\n\n### $2\n\n$3')

  // Ensure any heading (#, ##, ###) is strictly preceded and followed by blank lines so react-markdown always renders an actual heading tag
  finalResult = finalResult.replace(/([^\n])\s*\n*(#{1,6}\s+[^\n]+)/g, '$1\n\n$2')
  finalResult = finalResult.replace(/(#{1,6}\s+[^\n]+)\n+([^\n#])/g, '$1\n\n$2')

  // Break right after introductory colons when immediately followed by a list item (`The following is the process:\n\n1. ...`)
  finalResult = finalResult.replace(/:\s+(\d{1,2}[\.\)])\s+/g, ':\n\n$1 ')

  // 3. Clean up artificial single line breaks from PDF extraction while keeping paragraphs, tables, and lists intact
  const paragraphLines = finalResult.split('\n')
  const cleanedParagraphs = []
  let currentParagraph = []
  let insideBlock = false

  for (let i = 0; i < paragraphLines.length; i++) {
    const line = paragraphLines[i]
    const trimmed = line.trim()

    const isSpecialLine = trimmed.startsWith('|') || 
                          trimmed.startsWith('#') || 
                          trimmed.startsWith('- ') || 
                          trimmed.startsWith('* ') || 
                          trimmed.startsWith('> ') || 
                          trimmed.match(/^\d+[\.\)]\s+/) || 
                          trimmed.startsWith('```') || 
                          trimmed.startsWith('$$') || 
                          trimmed.includes('---') || 
                          trimmed.startsWith('`wikilink:') ||
                          trimmed.startsWith('`sourcecite:')

    if (trimmed.startsWith('```') || trimmed.startsWith('$$')) {
      insideBlock = !insideBlock
    }

    if (insideBlock || isSpecialLine || trimmed === '') {
      if (currentParagraph.length > 0) {
        cleanedParagraphs.push(currentParagraph.join(' '))
        currentParagraph = []
        if (isSpecialLine && cleanedParagraphs.length > 0 && cleanedParagraphs[cleanedParagraphs.length - 1] !== '') {
          cleanedParagraphs.push('')
        }
      }
      if (isSpecialLine && (trimmed.startsWith('#') || trimmed.match(/^\d+[\.\)]\s+/)) && cleanedParagraphs.length > 0 && cleanedParagraphs[cleanedParagraphs.length - 1] !== '') {
        cleanedParagraphs.push('')
      }
      cleanedParagraphs.push(line)
      if (isSpecialLine && trimmed.startsWith('#')) {
        cleanedParagraphs.push('')
      }
    } else {
      currentParagraph.push(trimmed)
    }
  }
  if (currentParagraph.length > 0) {
    cleanedParagraphs.push(currentParagraph.join(' '))
  }

  const endRefsParagraphs = cleanedParagraphs.map(line => {
    if (!line.includes('`sourcecite:')) return line
    const citeTokens = []
    let cleaned = line.replace(/`sourcecite:([^|`]+)(?:\|([^|`]*))?(?:\|([^|`]*))?`/g, (match) => {
      citeTokens.push(match)
      return ''
    })
    cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trimEnd()
    if (citeTokens.length > 0) {
      return cleaned + (cleaned.length > 0 ? ' ' : '') + citeTokens.join(' ')
    }
    return cleaned
  })

  return endRefsParagraphs.join('\n')
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
      className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] rounded-[4px] transition-colors"
      title="Copy to clipboard"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  )
}

const fastJsonHighlight = (jsonString) => {
  if (typeof jsonString !== 'string') return ''
  // Escape HTML characters safely before highlighting
  const escaped = jsonString
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped.replace(
    /("(?:\\\\|\\"|[^"])*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (match, str, colon, kw, num) => {
      if (colon) return `<span style="color: #9cdcfe">${str}</span>${colon}`;
      if (str) return `<span style="color: #ce9178">${str}</span>`;
      if (kw) return `<span style="color: #569cd6">${kw}</span>`;
      if (num) return `<span style="color: #b5cea8">${num}</span>`;
      return match;
    }
  );
};

const AdaptiveCodeBlock = ({ code, language, title, showLineNumbers = false }) => {
  return (
    <div className="my-5 rounded-[8px] overflow-hidden bg-[var(--bg-panel)] border border-[var(--border-dim)] shadow-sm relative group/code">
      {/* Persistent Small Header - Ultra Subtle */}
      <div className="flex items-center justify-between px-5 py-2.5 bg-black/[0.08] select-none border-b border-[var(--border-subtle)]">
        <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest pl-1">
          {title || language || 'code'}
        </div>
        <div className="flex items-center transition-opacity">
          <CodeCopyButton code={code} />
        </div>
      </div>
      <div className="overflow-x-auto bg-transparent custom-scrollbar pb-2">
        {language === 'json' ? (
          <pre 
            className="m-0 bg-transparent text-[var(--text-main)] text-[12.5px] leading-[1.6] px-[1.75rem] py-[1rem] overflow-x-auto font-mono"
            dangerouslySetInnerHTML={{ __html: fastJsonHighlight(code) }}
          />
        ) : (
          <SyntaxHighlighter
            children={code}
            style={vscDarkPlus}
            language={language || 'text'}
            showLineNumbers={showLineNumbers}
            PreTag="div"
            customStyle={{
              margin: 0,
              background: 'transparent',
              color: 'var(--text-main)',
              fontSize: '13px',
              padding: '1rem 1.75rem',
              overflowX: 'auto',
              lineHeight: '1.6'
            }}
            wrapLines={true}
            wrapLongLines={false}
          />
        )}
      </div>
    </div>
  )
}

// Pill tag for [[wikilinks]] — renders the page name without the brackets
const WikiTag = ({ label }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 my-0.5 rounded-[5px] bg-[var(--bg-panel)] border-0 text-[var(--text-accent)] text-[12px] font-medium font-sans leading-none hover:bg-[var(--bg-active)] transition-colors cursor-default whitespace-nowrap">
    <span className="opacity-40 text-[12px]">◈</span>
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
        <div className="font-semibold tracking-wider text-[12px] text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
          💡 TIP
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!TIP\]\s*/i)}</div>
      </div>
    )
  }
  if (/^\[!NOTE\]/i.test(rawText)) {
    return (
      <div className="my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-blue-500 border-0 bg-[var(--bg-panel)] text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm">
        <div className="font-semibold tracking-wider text-[12px] text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
          ℹ️ NOTE
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!NOTE\]\s*/i)}</div>
      </div>
    )
  }
  if (/^\[!(IMPORTANT|WARNING|CAUTION)\]/i.test(rawText)) {
    return (
      <div className="my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-amber-500 border-0 bg-[var(--bg-panel)] text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm">
        <div className="font-semibold tracking-wider text-[12px] text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
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
    <div className="mb-4 leading-relaxed font-normal text-[var(--text-main)] text-[14.5px] break-words whitespace-pre-wrap text-left" {...props}>
      {children}
    </div>
  )
}

const WikiHoverCite = ({ idx, title, displayNum }) => {
  const [showHover, setShowHover] = React.useState(false)
  const [chunkText, setChunkText] = React.useState('')
  const [itemTitle, setItemTitle] = React.useState(title || '')
  const [itemCategory, setItemCategory] = React.useState('DOCUMENT')
  const buttonRef = React.useRef(null)
  const hoverTimeoutRef = React.useRef(null)

  const handleMouseEnter = () => {
    if (showHover) return
    hoverTimeoutRef.current = setTimeout(() => {
      if (window.__activeHoverWikilinkClose) window.__activeHoverWikilinkClose()
      setShowHover(true)
      
      const activeResults = window.__currentSearchMappedResults || []
      const numIdx = !isNaN(Number(idx)) ? Number(idx) - 1 : -1
      let matched = null
      
      if (numIdx >= 0 && numIdx < activeResults.length) {
        matched = activeResults[numIdx]
      } else {
        matched = activeResults.find(r => String(r.id) === String(idx) || String(r.document_id) === String(idx) || (title && r.title && r.title.toLowerCase() === title.toLowerCase()))
      }

      if (matched) {
        if (matched.content) setChunkText(matched.content)
        if (matched.title) setItemTitle(matched.title)
        if (matched.category) setItemCategory(matched.category.toUpperCase())
        return
      }

      if (!chunkText && window.api?.db?.query) {
        const strId = String(idx).trim()
        window.api.db.query(
          `SELECT dc.content, d.file_type, d.file_name FROM embedding_documents dc 
           LEFT JOIN documents d ON dc.document_id = d.id 
           WHERE dc.id::text = $1 OR dc.document_id::text = $1 OR dc.chunk_index::text = $1 OR d.file_name ILIKE $2 
           LIMIT 1`,
          [strId, title ? `%${title}%` : '']
        )
          .then(res => {
            const rows = res?.rows || res
            if (rows && rows[0]) {
              if (rows[0].content) setChunkText(rows[0].content)
              if (rows[0].file_name) setItemTitle(rows[0].file_name)
              if (rows[0].file_type) setItemCategory(rows[0].file_type.toUpperCase())
            }
          })
          .catch(() => {})
      }
    }, 150)
  }

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
  }

  const numLabel = displayNum || (isNaN(Number(idx)) ? '?' : idx)

  return (
    <span className="relative inline-block overflow-visible" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (window.__openCitationPreviewModal) {
            window.__openCitationPreviewModal(idx, itemTitle || title)
          }
        }}
        className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 mx-0.5 rounded-full bg-[var(--bg-active)] hover:bg-[var(--text-accent)] text-[var(--text-accent)] hover:text-white text-[10.5px] font-bold cursor-pointer transition-colors shadow-sm select-none align-baseline -translate-y-[1px] border-0"
        title={itemTitle || title ? `Source ${numLabel}: ${itemTitle || title}` : `Source ${numLabel}`}
      >
        <span>{numLabel}</span>
      </button>

      {showHover && (
        <Suspense fallback={null}>
          <HoverWikilink 
            item={{ 
              id: idx, 
              title: itemTitle || title || `Source #${numLabel}`, 
              content: chunkText || `Preview content for source #${numLabel} is loading or not stored locally.`, 
              category: itemCategory 
            }} 
            setShowWikiHover={setShowHover} 
            onSelect={(item) => {
              setShowHover(false)
              if (window.__openCitationPreviewModal) {
                window.__openCitationPreviewModal(item.id || idx, item.title)
              }
            }} 
            anchorRef={buttonRef} 
          />
        </Suspense>
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
  li: ({node, ...props}) => <li className="mb-2 leading-relaxed" {...props} />,
  img: ({node, src, alt, ...props}) => (
    <Suspense fallback={<div className="w-full h-[200px] my-6 rounded-[5px] bg-[#1e1e1e] animate-pulse ring-1 ring-white/5 flex items-center justify-center text-[12px] text-white/30 tracking-widest uppercase">Loading Image...</div>}>
      <MarkdownImage src={src} alt={alt} {...props} />
    </Suspense>
  ),
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
      const rawIdx = parts[0]
      const idx = isNaN(Number(rawIdx)) ? rawIdx : Number(rawIdx)
      const title = parts[1] || `Source ${idx}`
      const displayNum = parts[2] || (isNaN(Number(idx)) ? '?' : idx)
      return <WikiHoverCite idx={idx} title={title} displayNum={displayNum} />
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
      if (!lang) {
        return (
          <pre className="bg-transparent border border-white/5 p-3.5 rounded-[6px] my-4 overflow-x-auto text-[13px] text-[var(--text-main)] font-mono leading-relaxed whitespace-pre-wrap custom-scrollbar">
            {codeString.trim()}
          </pre>
        )
      }
      return (
        <AdaptiveCodeBlock code={codeString.trim()} language={lang || 'text'} title={lang || 'CODE'} />
      )
    }

    return (
      <code className="bg-[var(--bg-active)] px-1.5 py-0.5 rounded-[4px] text-[13px] text-[var(--text-accent)] font-mono break-words whitespace-pre-wrap border-0" {...props}>
        {children}
      </code>
    )
  },
  blockquote: ({node, ...props}) => (
    <blockquote className="border-l-[3.5px] border-[var(--text-accent)] bg-transparent pl-4 py-1 text-[var(--text-muted)] italic my-4 break-words" {...props} />
  ),
  a: ({node, ...props}) => <a className="text-[var(--text-accent)] hover:underline font-medium break-words" target="_blank" rel="noopener noreferrer" {...props} />,
  hr: ({node, ...props}) => <div className="horizontal-divider my-6" {...props} />,
  table: ({node, ...props}) => (
    <div className="my-3 w-full overflow-x-auto bg-transparent border-0 shadow-none">
      <table className="w-full text-left border-collapse text-xs text-[var(--text-main)]" {...props} />
    </div>
  ),
  thead: ({node, ...props}) => <thead className="bg-transparent border-b border-white/10 dark:border-white/[0.06] text-left" {...props} />,
  tbody: ({node, ...props}) => <tbody className="divide-y divide-white/5 dark:divide-white/[0.04]" {...props} />,
  tr: ({node, ...props}) => <tr className="bg-transparent transition-none border-0" {...props} />,
  th: ({node, ...props}) => <th className="py-2 px-3 text-xs font-semibold text-[var(--text-main)] whitespace-nowrap select-text bg-transparent border-0" {...props} />,
  td: ({node, ...props}) => <td className="py-2 px-3 text-xs text-[var(--text-main)]/90 leading-relaxed break-words select-text border-0" {...props} />,
  em: ({node, ...props}) => <em className="italic text-[var(--text-accent)] font-normal" {...props} />
}

const formatJsonContent = (content, maxLength = 150000) => {
  if (!content) return ''
  
  if (typeof content === 'object') {
    try {
      const stringified = JSON.stringify(content, null, 2)
      return stringified.length > maxLength 
        ? stringified.slice(0, maxLength) + '\n\n... [Content truncated for performance]' 
        : stringified
    } catch (e) {
      return String(content).slice(0, maxLength)
    }
  }
  
  if (typeof content !== 'string') return String(content).slice(0, maxLength)
  
  try {
    const parsed = JSON.parse(content)
    const stringified = JSON.stringify(parsed, null, 2)
    return stringified.length > maxLength 
      ? stringified.slice(0, maxLength) + '\n\n... [Content truncated for performance]' 
      : stringified
  } catch (e) {
    // If it's completely missing JSON brackets, it's probably pure extracted text from the DB.
    // Return null so the renderer can fall back to standard text/markdown.
    if (!content.includes('{') && !content.includes('[')) {
      return null
    }

    let displayStr = content
    if (!displayStr.includes('\n') && displayStr.includes('":"')) {
      displayStr = displayStr
        .replace(/","/g, '",\n  "')
        .replace(/\{"/g, '{\n  "')
        .replace(/"\}/g, '"\n}')
    }
    
    return displayStr.slice(0, maxLength) + (displayStr.length > maxLength ? '\n\n... [Content truncated]' : '')
  }
}

const DocumentRenderer = ({ content, category = 'DOCUMENT', fileTitle = '', results = null, className, maxLength = 150000 }) => {
  React.useEffect(() => {
    if (results && Array.isArray(results) && results.length > 0) {
      window.__currentSearchMappedResults = results
    }
  }, [results])

  if (!content) return null
  const safeContent = typeof content !== 'string' && category !== 'JSON' ? String(content) : content
  const ext = fileTitle ? fileTitle.split('.').pop().toLowerCase() : ''
  const isCodeFile = ['py', 'js', 'jsx', 'ts', 'tsx', 'sql', 'html', 'css', 'sh', 'bash', 'java', 'cpp', 'c', 'rust', 'go'].includes(ext)

  if (category === 'JSON' || ext === 'json') {
    const formattedJson = formatJsonContent(safeContent, maxLength)
    if (formattedJson !== null) {
      return (
        <AdaptiveCodeBlock code={formattedJson} language="json" title="JSON Data" showLineNumbers={true} />
      )
    }
  }

  if (isCodeFile) {
    const codeContent = safeContent.length > maxLength 
      ? safeContent.slice(0, maxLength) + '\n\n... [Content truncated for performance]'
      : safeContent
      
    return (
      <AdaptiveCodeBlock code={codeContent.trim()} language={ext || 'text'} title={`${ext} Source File`} showLineNumbers={true} />
    )
  }

  const formattedContent = formatMarkdownText(safeContent)

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
