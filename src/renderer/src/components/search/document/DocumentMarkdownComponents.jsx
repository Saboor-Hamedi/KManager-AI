import React, { Suspense, lazy } from 'react'
import DocumentAdaptiveCodeBlock from './DocumentAdaptiveCodeBlock'
const MermaidDiagram = lazy(() => import('../MermaidDiagram'))
const HoverWikilink = lazy(() => import('../HoverWikilink'))
const MarkdownImage = lazy(() => import('../MarkdownImage'))

// Pill tag for [[wikilinks]] — renders the page name without the brackets
export const WikiTag = ({ label }) => (
  <span className="inline-flex items-center gap-1 mx-0.5 my-0.5 border-0 text-[var(--text-accent)] text-[13.5px] font-semibold font-sans leading-none cursor-default whitespace-nowrap">
    <span className="opacity-60 text-[12px]">◈</span>
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

export const renderCalloutOrParagraph = (children, props, fallbackRenderer) => {
  const rawText = Array.isArray(children)
    ? children.map(c => (typeof c === 'string' ? c : '')).join('')
    : typeof children === 'string'
    ? children
    : ''

  if (/^\[!TIP\]/i.test(rawText)) {
    return (
      <div className="callout-box my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-emerald-500 bg-emerald-500/10 text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm not-italic">
        <div className="font-semibold tracking-wider text-[12px] text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
          💡 TIP
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!TIP\]\s*/i)}</div>
      </div>
    )
  }
  if (/^\[!NOTE\]/i.test(rawText)) {
    return (
      <div className="callout-box my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-blue-500 bg-blue-500/10 text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm not-italic">
        <div className="font-semibold tracking-wider text-[12px] text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1.5">
          ℹ️ NOTE
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!NOTE\]\s*/i)}</div>
      </div>
    )
  }
  if (/^\[!(IMPORTANT|WARNING|CAUTION)\]/i.test(rawText)) {
    return (
      <div className="callout-box my-4 p-3.5 pl-4 rounded-[5px] border-l-[3.5px] border-amber-500 bg-amber-500/10 text-[var(--text-main)] text-[13.5px] leading-relaxed flex flex-col gap-1 shadow-sm not-italic">
        <div className="font-semibold tracking-wider text-[12px] text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5">
          ⚠️ ATTENTION
        </div>
        <div className="text-[var(--text-main)]">{cleanCalloutChildren(children, /^\[!(IMPORTANT|WARNING|CAUTION)\]\s*/i)}</div>
      </div>
    )
  }

  // ── Wikilink tag cloud ──────────────────────────────────────────────────
  const childArray = React.Children.toArray(children)

  const allWikiTags = childArray.length > 0 && childArray.every(child => {
    if (typeof child === 'string') return /^\s*$/.test(child)
    return child?.type === WikiTag || child?.type === WikiHoverCite || child?.props?.node?.tagName === 'span' || child?.type === 'span'
  })

  if (allWikiTags) {
    return (
      <div className="flex flex-wrap items-center gap-1.5 my-3" {...props}>
        {childArray}
      </div>
    )
  }

  // ── Metadata List Formatting ────────────────────────────────────────────
  if (typeof rawText === 'string' && rawText.trim().startsWith('Id: ') && rawText.includes('Title: ') && rawText.includes('Timestamp: ')) {
    const regex = /(Id|Title|Language|Tags|Selection|IsPinned|CustomIcon|Timestamp):\s*(.*?)(?=\s+(Id|Title|Language|Tags|Selection|IsPinned|CustomIcon|Timestamp):|$)/g;
    const items = [];
    let match;
    while ((match = regex.exec(rawText)) !== null) {
      items.push({ key: match[1], value: match[2] });
    }
    
    if (items.length > 0) {
      return (
        <ul className="list-disc pl-5 my-4 space-y-1.5 marker:text-[var(--text-accent)] font-normal text-[var(--text-main)] text-[14px] break-words" {...props}>
          {items.map((item, idx) => (
            <li key={idx} className="pl-1 leading-relaxed">
              <strong className="font-semibold text-[var(--text-main)] opacity-90">{item.key}:</strong> {item.value}
            </li>
          ))}
        </ul>
      )
    }
  }

  if (fallbackRenderer) {
    return fallbackRenderer(children, props)
  }

  return (
    <div className="mb-4 leading-relaxed font-normal text-[var(--text-main)] text-[14.5px] break-words whitespace-pre-wrap text-justify" {...props}>
      {children}
    </div>
  )
}

export const WikiHoverCite = ({ idx, title, displayNum }) => {
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

export const cleanMarkdownComponents = {
  h1: ({node, ...props}) => <h1 className="text-[18px] font-bold text-[var(--text-main)] mt-6 mb-3 break-words" {...props} />,
  h2: ({node, ...props}) => <h2 className="text-[16px] font-bold text-[var(--text-main)] mt-6 mb-3 break-words" {...props} />,
  h3: ({node, ...props}) => <h3 className="text-[15px] font-semibold text-[var(--text-main)] mt-5 mb-2.5 break-words" {...props} />,
  h4: ({node, ...props}) => <h4 className="text-[14px] font-semibold text-[var(--text-main)] mt-4 mb-2 break-words" {...props} />,
  p: ({node, children, ...props}) => renderCalloutOrParagraph(children, props),
  div: ({node, children, ...props}) => {
    if (typeof props.className === 'string' && props.className.includes('leading-relaxed font-normal text-[var(--text-main)]')) {
      return renderCalloutOrParagraph(children, props, (c, p) => <div {...p}>{c}</div>)
    }
    return <div {...props}>{children}</div>
  },
  ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-5 space-y-2.5 marker:text-[var(--text-accent)] font-normal text-[var(--text-main)] text-[14px] break-words" {...props} />,
  ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-5 space-y-2.5 marker:text-[var(--text-accent)] font-normal text-[var(--text-main)] text-[14px] break-words" {...props} />,
  li: ({node, ...props}) => <li className="pl-1.5 leading-relaxed" {...props} />,
  img: ({node, src, alt, ...props}) => (
    <Suspense fallback={<div className="w-full h-[200px] my-6 rounded-[5px] bg-[#1e1e1e] animate-pulse ring-1 ring-white/5 flex items-center justify-center text-[12px] text-white/30 tracking-widest uppercase">Loading Image...</div>}>
      <MarkdownImage src={src} alt={alt} {...props} />
    </Suspense>
  ),
  strong: ({node, ...props}) => <strong className="font-semibold text-[var(--text-main)]" {...props} />,
  code: ({node, inline, className, children, ...props}) => {
    const match = /language-([\w-]+)/.exec(className || '')
    const lang = match ? match[1] : null
    const codeString = String(children).replace(/\n$/, '')

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
    const lowerLang = (lang || '').toLowerCase()
    
    const mermaidLangs = [
      'mermaid', 'graph', 'flowchart', 'sequencediagram', 'classdiagram', 
      'statediagram', 'statediagram-v2', 'erdiagram', 'gantt', 'pie', 'gitgraph'
    ]
    
    const isMermaidLang = mermaidLangs.includes(lowerLang)
    
    const isMultiLine = codeString.includes('\n')
    const isBlockCode = Boolean(lang) || isMultiLine
    
    const isMermaid = isBlockCode && (
      isMermaidLang ||
      cleanCode.startsWith('graph ') ||
      cleanCode.startsWith('flowchart ') ||
      cleanCode.startsWith('sequenceDiagram') ||
      cleanCode.startsWith('classDiagram') ||
      cleanCode.startsWith('stateDiagram') ||
      cleanCode.startsWith('erDiagram') ||
      cleanCode.startsWith('gantt')
    )

    if (isMermaid) {
      let finalChartString = codeString
      if (lowerLang !== 'mermaid' && isMermaidLang && !cleanCode.toLowerCase().startsWith(lowerLang)) {
        const correctCaseLang = ['sequenceDiagram', 'classDiagram', 'stateDiagram', 'stateDiagram-v2', 'erDiagram', 'gitGraph']
          .find(l => l.toLowerCase() === lowerLang) || lowerLang
        finalChartString = `${correctCaseLang}\n${codeString}`
      }

      return (
        <Suspense fallback={<div className="my-4 h-24 rounded-xl border border-[#2e2e2e] bg-[#141414] flex items-center justify-center text-gray-500 text-xs animate-pulse">Rendering diagram...</div>}>
          <MermaidDiagram chart={finalChartString} />
        </Suspense>
      )
    }

    const isBlock = isBlockCode || (Boolean(lang) && codeString.length > 40)

    if (isBlock) {
      if (!lang) {
        return (
          <pre className="bg-transparent border border-white/5 p-3.5 rounded-[6px] my-4 overflow-x-auto text-[13px] text-[var(--text-main)] font-mono leading-relaxed whitespace-pre-wrap custom-scrollbar">
            {codeString.trim()}
          </pre>
        )
      }
      return (
        <DocumentAdaptiveCodeBlock code={codeString.trim()} language={lang || 'text'} title={lang || 'CODE'} />
      )
    }

    return (
      <code className="text-[13px] text-[var(--text-accent)] font-semibold font-mono break-words whitespace-pre-wrap border-0" {...props}>
        {children}
      </code>
    )
  },
  blockquote: ({node, ...props}) => (
    <blockquote className="border-l-[3.5px] border-[var(--text-accent)] bg-[var(--text-accent)]/10 pl-4 py-2 pr-4 rounded-r-[4px] text-[var(--text-main)] italic my-4 break-words shadow-sm has-[.callout-box]:border-0 has-[.callout-box]:bg-transparent has-[.callout-box]:p-0 has-[.callout-box]:m-0 has-[.callout-box]:shadow-none" {...props} />
  ),
  a: ({node, href, children, ...props}) => {
    if (href && href.startsWith('#')) {
      return (
        <a
          href={href}
          onClick={(e) => {
            e.preventDefault()
            const id = href.substring(1)
            const el = document.getElementById(id)
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }}
          className="text-[var(--text-accent)] hover:underline hover:opacity-80 transition-all font-medium break-words"
          {...props}
        >
          {children}
        </a>
      )
    }

    return (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault()
          if (!href) return
          if (window.api?.system?.openExternal) {
            window.api.system.openExternal(href)
          } else {
            window.open(href, '_blank')
          }
        }}
        className="text-[var(--text-accent)] underline underline-offset-2 hover:opacity-80 cursor-pointer transition-opacity break-words font-medium"
        title={href}
        {...props}
      >
        {children}
      </a>
    )
  },
  hr: ({node, ...props}) => <div className="horizontal-divider my-6" {...props} />,
  table: ({node, ...props}) => (
    <div className="my-6 w-full overflow-x-auto bg-[var(--bg-panel)] rounded-[8px] shadow-sm max-w-full border border-[var(--border-dim)]">
      <table className="w-full text-left border-collapse text-xs text-[var(--text-main)] m-0" {...props} />
    </div>
  ),
  thead: ({node, ...props}) => <thead className="bg-black/[0.08] border-b border-[var(--border-subtle)] text-left" {...props} />,
  tbody: ({node, ...props}) => <tbody className="divide-y divide-white/5 dark:divide-white/[0.04]" {...props} />,
  tr: ({node, ...props}) => <tr className="bg-transparent transition-none border-0" {...props} />,
  th: ({node, ...props}) => <th className="py-2.5 px-4 text-xs font-semibold text-[var(--text-main)] whitespace-nowrap select-text border-0" {...props} />,
  td: ({node, ...props}) => <td className="py-2.5 px-4 text-xs text-[var(--text-main)]/90 leading-relaxed break-words select-text border-0" {...props} />,
  em: ({node, ...props}) => <em className="italic text-[var(--text-accent)] font-normal" {...props} />,
  details: ({node, ...props}) => (
    <details className="my-3 border border-white/[0.08] bg-[var(--bg-panel)] rounded-[6px] overflow-hidden group shadow-sm px-4 group-open:pb-2 [&>summary+br]:hidden [&>summary+p]:mt-2" {...props} />
  ),
  summary: ({node, ...props}) => (
    <summary className="-mx-4 px-4 py-2 bg-[var(--bg-active)]/40 cursor-pointer text-[13.5px] font-semibold text-[var(--text-main)] list-none flex items-center justify-between hover:bg-white/[0.06] transition-colors group-open:border-b group-open:border-white/[0.04]" {...props}>
      <span className="flex-1">{props.children}</span>
      <span className="shrink-0 ml-3 opacity-50 group-open:rotate-180 transition-transform">▼</span>
    </summary>
  )
}
