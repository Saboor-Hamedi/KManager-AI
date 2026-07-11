import React, { useEffect, useState, useRef, memo, Suspense, lazy } from 'react'
import mermaid from 'mermaid'
import { Copy, Check, Code, Eye } from 'lucide-react'

// Initialize Mermaid once with a premium dark theme matching the app's palette
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
  fontSize: 13,
  themeVariables: {
    // Core backgrounds
    background: '#0e0e10',
    mainBkg: '#18181b',
    nodeBorder: '#3f3f46',
    clusterBkg: '#111113',
    clusterBorder: '#3f3f46',

    // Text
    primaryTextColor: '#e4e4e7',
    secondaryTextColor: '#a1a1aa',
    tertiaryTextColor: '#71717a',
    edgeLabelBackground: '#18181b',

    // Borders & lines
    lineColor: '#52525b',
    primaryBorderColor: '#4a4a52',
    secondaryBorderColor: '#3f3f46',
    tertiaryBorderColor: '#2e2e35',

    // Node fills — vivid purple accent to match app
    primaryColor: '#1c1c22',
    secondaryColor: '#1a1a20',
    tertiaryColor: '#16161c',

    // Sequence diagram specifics
    actorBkg: '#18181b',
    actorBorder: '#52525b',
    actorTextColor: '#e4e4e7',
    actorLineColor: '#52525b',
    signalColor: '#a78bfa',
    signalTextColor: '#e4e4e7',
    labelBoxBkgColor: '#1c1c22',
    labelBoxBorderColor: '#3f3f46',
    labelTextColor: '#e4e4e7',
    loopTextColor: '#e4e4e7',
    noteBorderColor: '#4a4a52',
    noteBkgColor: '#1a1a22',
    noteTextColor: '#c4b5fd',
    activationBorderColor: '#7c3aed',
    activationBkgColor: '#1e1b2e',

    // Gantt
    taskBkgColor: '#1c1c22',
    taskBorderColor: '#52525b',
    taskTextColor: '#e4e4e7',
    taskTextLightColor: '#a1a1aa',
    taskTextOutsideColor: '#a1a1aa',
    taskTextClickableColor: '#c4b5fd',
    activeTaskBkgColor: '#2d1f6e',
    activeTaskBorderColor: '#7c3aed',
    doneTaskBkgColor: '#14532d',
    doneTaskBorderColor: '#16a34a',
    critBkgColor: '#450a0a',
    critBorderColor: '#dc2626',
    todayLineColor: '#7c3aed',
    gridColor: '#27272a',
    section0: '#0e0e11',
    section1: '#111114',
    section2: '#0e0e11',
    section3: '#111114',

    // Pie chart
    pie1: '#7c3aed',
    pie2: '#6d28d9',
    pie3: '#5b21b6',
    pie4: '#4c1d95',
    pie5: '#8b5cf6',
    pie6: '#a78bfa',
    pie7: '#c4b5fd',
    pieBorderColor: '#27272a',
    pieSectionTextColor: '#e4e4e7',

    // Git graph
    git0: '#7c3aed',
    git1: '#0ea5e9',
    git2: '#16a34a',
    git3: '#d97706',
    git4: '#dc2626',
    git5: '#6366f1',
    git6: '#ec4899',
    git7: '#14b8a6',
    gitInv0: '#e4e4e7',
    gitBranchLabel0: '#e4e4e7',
    commitLabelColor: '#e4e4e7',
    commitLabelBackground: '#18181b',
    commitLabelFontSize: '11px',
    tagLabelColor: '#e4e4e7',
    tagLabelBackground: '#18181b',
    tagLabelBorder: '#52525b',
    tagLabelFontSize: '11px',
  },
  flowchart: {
    curve: 'basis',
    htmlLabels: true,
    padding: 16,
    nodeSpacing: 40,
    rankSpacing: 50
  },
  sequence: {
    diagramMarginX: 24,
    diagramMarginY: 16,
    actorMargin: 64,
    width: 160,
    height: 50,
    boxMargin: 10,
    messageMargin: 28,
    mirrorActors: false,
    useMaxWidth: true
  }
})

const MermaidDiagram = memo(({ chart }) => {
  const [svgContent, setSvgContent] = useState('')
  const [error, setError] = useState(null)
  const [showRaw, setShowRaw] = useState(false)
  const [copied, setCopied] = useState(false)
  const idRef = useRef('mermaid-' + Math.random().toString(36).substring(2, 9))

  useEffect(() => {
    let isMounted = true
    let timeoutId

    const renderDiagram = async () => {
      if (!chart || !chart.trim()) return
      setError(null)
      setSvgContent('')
      try {
        const isLight = document.documentElement.getAttribute('data-theme') === 'light'
        mermaid.initialize({
          startOnLoad: false,
          theme: isLight ? 'default' : 'dark',
          securityLevel: 'loose',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          fontSize: 13
        })
        const { svg } = await mermaid.render(idRef.current, chart.trim())
        if (isMounted) setSvgContent(svg)
      } catch (err) {
        console.warn('[MermaidDiagram] render error:', err)
        if (isMounted) setError(err?.message || 'Failed to render diagram')
      }
    }

    timeoutId = setTimeout(() => {
      renderDiagram()
    }, 40)

    return () => {
      isMounted = false
      clearTimeout(timeoutId)
    }
  }, [chart])

  const handleCopy = () => {
    navigator.clipboard.writeText(chart)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-3 rounded-[5px] overflow-hidden border border-[var(--border-main)] bg-[var(--bg-card)] max-w-full">
      {/* Header */}
      <div className="bg-[var(--bg-panel)] px-3.5 py-1.5 border-b border-[var(--border-subtle)] flex items-center justify-between select-none h-8">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-accent)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-accent)]">Mermaid</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-[10.5px] font-medium border border-[var(--border-subtle)] h-5"
            title={showRaw ? 'Show rendered diagram' : 'Show source code'}
          >
            {showRaw ? <Eye size={11} /> : <Code size={11} />}
            <span>{showRaw ? 'Diagram' : 'Source'}</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors text-[10.5px] font-medium border border-[var(--border-subtle)] h-5"
          >
            {copied ? (
              <>
                <Check size={11} className="text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Diagram / Raw area */}
      <div className="overflow-x-auto custom-scrollbar">
        {showRaw || error ? (
          <div className="p-5">
            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-mono leading-relaxed">
                ⚠ Render error — showing raw source
              </div>
            )}
            <pre className="text-[#c4b5fd] font-mono text-[12.5px] whitespace-pre-wrap break-words m-0 leading-relaxed">
              <code>{chart.trim()}</code>
            </pre>
          </div>
        ) : svgContent ? (
          <div
            className="p-5 flex justify-center items-start min-h-[120px] [&_svg]:max-w-full [&_svg]:h-auto [&_svg]:!bg-transparent [&_svg_rect]:!stroke-transparent [&>svg>rect]:!fill-transparent"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : (
          <div className="p-6 flex items-center justify-center min-h-[120px]">
            <div className="flex items-center gap-2 text-gray-500 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7c3aed] animate-pulse" />
              Rendering diagram...
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

MermaidDiagram.displayName = 'MermaidDiagram'
export default MermaidDiagram
