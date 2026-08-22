import React, { useEffect, useState, useRef, memo } from 'react'
import { createPortal } from 'react-dom'
import mermaid from 'mermaid'
import { Copy, Check, ZoomIn, ZoomOut, Maximize, Download, X } from 'lucide-react'

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
  const [zoom, setZoom] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
  const idRef = useRef('mermaid-' + Math.random().toString(36).substring(2, 9))
  const containerRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false)
        setZoom(1)
        setPan({ x: 0, y: 0 })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleWheel = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.deltaY < 0) setZoom(z => Math.min(z + 0.1, 6))
      else setZoom(z => Math.max(z - 0.1, 0.25))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [svgContent])

  useEffect(() => {
    let isMounted = true
    let timeoutId

    const renderDiagram = async () => {
      if (!chart || !chart.trim()) return
      setError(null)
      setSvgContent('')
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose',
          fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
          fontSize: 13,
          flowchart: {
            htmlLabels: true,
            useMaxWidth: true
          },
          sequence: {
            useMaxWidth: true,
            showSequenceNumbers: false
          }
        })
        // Generate a unique ID every render to prevent Mermaid v10/11 "Element with id already exists" crashes
        const renderId = `mermaid-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`
        const existingNode = document.getElementById(renderId)
        if (existingNode) existingNode.remove()

        // Fix common AI capitalization typos for the root diagram type and internal blocks
        let sanitizedChart = chart.trim()
        
        // Fix Root nodes
        sanitizedChart = sanitizedChart.replace(/^(\s*)(Graph|Flowchart|SequenceDiagram|ClassDiagram|StateDiagram|ErDiagram|Gantt|Pie|GitGraph)/i, (_, space, match) => {
          const m = match.toLowerCase()
          if (m === 'sequencediagram') return space + 'sequenceDiagram'
          if (m === 'classdiagram') return space + 'classDiagram'
          if (m === 'statediagram') return space + 'stateDiagram'
          if (m === 'erdiagram') return space + 'erDiagram'
          if (m === 'gitgraph') return space + 'gitGraph'
          return space + m // graph, flowchart, gantt, pie
        })

        // Fix internal block keywords that Mermaid expects to be mostly lowercase, allowing for leading whitespace/indentation
        sanitizedChart = sanitizedChart.replace(/^(\s*)(Participant|Activate|Deactivate|Opt|Alt|Else|End|Rect|Note over|Note left of|Note right of|Note|Autonumber|Class|Subgraph|Direction)\b/gmi, (_, space, match) => {
          const m = match.toLowerCase()
          if (m.startsWith('note')) {
            // Mermaid accepts 'note over', 'Note over', etc., but standardizing to Capital N is safe
            return space + match.charAt(0).toUpperCase() + match.slice(1).toLowerCase() 
          }
          return space + m
        })

        // Provide a hidden, fixed-width container to prevent Mermaid v11 from throwing NaN 
        // on text measurements for Gantt and Git graphs when rendered off-DOM
        const measureContainer = document.createElement('div')
        measureContainer.style.width = '1200px'
        measureContainer.style.height = '1200px'
        measureContainer.style.position = 'fixed'
        measureContainer.style.top = '0'
        measureContainer.style.left = '0'
        measureContainer.style.opacity = '0'
        measureContainer.style.pointerEvents = 'none'
        measureContainer.style.zIndex = '-9999'
        document.body.appendChild(measureContainer)

        let svg = ''
        try {
          const result = await mermaid.render(renderId, sanitizedChart, measureContainer)
          svg = result.svg
        } finally {
          document.body.removeChild(measureContainer)
        }
        
        if (isMounted) {
          setError(null)
          setSvgContent(svg)
        }
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

  const handleDownload = () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mermaid-diagram-${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="my-6 rounded-[8px] overflow-hidden bg-[var(--bg-panel)] shadow-sm max-w-full border border-[var(--border-dim)]">
        {/* Persistent Small Header - Ultra Subtle */}
        <div className="flex items-center justify-between px-3 py-1 bg-black/[0.08] select-none border-b border-[var(--border-subtle)] h-[24px]">
          <div className="text-[10px] font-bold text-[var(--text-muted)]/50 uppercase tracking-widest pl-1">
            Mermaid
          </div>
          <div className="flex items-center gap-1.5 transition-opacity h-full">
            {!showRaw && !error && (
              <>
                <button onClick={() => setZoom(z => Math.min(z + 0.25, 6))} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-[3px] transition-colors" title="Zoom In"><ZoomIn size={12} /></button>
                <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-[3px] transition-colors" title="Zoom Out"><ZoomOut size={12} /></button>
                <button onClick={() => { setIsModalOpen(true); setPan({x:0, y:0}); setZoom(1); }} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-[3px] transition-colors" title="Expand to fullscreen"><Maximize size={12} /></button>
                <button onClick={handleDownload} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-[3px] transition-colors" title="Download SVG"><Download size={12} /></button>
                <div className="w-px h-3 bg-white/10 mx-0.5" />
              </>
            )}
            <button onClick={handleCopy} className={`text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-[3px] transition-all duration-300 border-0 ${copied ? 'text-green-400 translate-x-1 bg-green-500/10' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'}`} title="Copy raw source">
              {copied ? 'COPIED' : 'COPY'}
            </button>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="px-2 py-0.5 ml-0.5 text-[10px] font-bold tracking-widest uppercase rounded text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors"
            >
              {showRaw ? 'VIEW' : 'CODE'}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative min-h-[160px] w-full overflow-hidden flex items-center justify-center bg-transparent">
          {showRaw || error ? (
            <div className="w-full p-4 overflow-auto max-h-[500px] bg-transparent [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {error && (
                <div className="mb-3 text-[10.5px] text-red-400/60 font-medium flex items-center gap-1.5 select-none">
                  <span className="w-1 h-1 rounded-full bg-red-400/50" />
                  Diagram syntax issue (falling back to raw view)
                </div>
              )}
              <pre className="text-[var(--text-main)] opacity-80 font-mono text-[12px] whitespace-pre-wrap break-words m-0 leading-relaxed">
                <code>{chart.trim()}</code>
              </pre>
            </div>
          ) : svgContent ? (
            <div 
              ref={containerRef}
              className="w-full h-full min-h-[200px] flex justify-center items-center relative cursor-move"
              onMouseDown={(e) => {
                if (e.target.closest('button')) return
                isDragging.current = true
                lastPan.current = { x: e.clientX, y: e.clientY }
              }}
              onMouseMove={(e) => {
                if (!isDragging.current) return
                const dx = e.clientX - lastPan.current.x
                const dy = e.clientY - lastPan.current.y
                setPan(p => ({ x: p.x + dx, y: p.y + dy }))
                lastPan.current = { x: e.clientX, y: e.clientY }
              }}
              onMouseUp={() => isDragging.current = false}
              onMouseLeave={() => isDragging.current = false}
            >
              <div
                className="transition-none [&_svg]:max-w-none [&_svg]:!bg-transparent [&_svg_rect]:!stroke-transparent [&>svg>rect]:!fill-transparent"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 text-[var(--text-muted)] text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-accent)] animate-pulse" />
              Rendering diagram...
            </div>
          )}
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl h-[85vh] mx-4 bg-[var(--bg-app)]/40 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-2xl flex flex-col">
            
            <div className="absolute top-4 right-4 flex items-center gap-0.5 bg-[var(--bg-panel)]/90 backdrop-blur-md p-1 rounded-[5px] border border-[var(--border-dim)] shadow-2xl z-50">
               <button onClick={() => setZoom(z => Math.min(z + 0.25, 6))} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-[3px] transition-colors"><ZoomIn size={14} /></button>
               <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-[3px] transition-colors"><ZoomOut size={14} /></button>
               <button onClick={handleDownload} className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/10 rounded-[3px] transition-colors"><Download size={14} /></button>
               <div className="w-px h-4 bg-[var(--border-subtle)] mx-0.5" />
               <button onClick={() => { setIsModalOpen(false); setZoom(1); setPan({x:0, y:0}) }} className="p-1.5 text-[var(--text-muted)] hover:text-white hover:bg-red-500/80 rounded-[3px] transition-colors"><X size={14} /></button>
            </div>
            
            <div 
              className="w-full h-full overflow-hidden flex items-center justify-center relative cursor-move" 
              onWheel={(e) => {
                if (e.deltaY < 0) setZoom(z => Math.min(z + 0.1, 6))
                else setZoom(z => Math.max(z - 0.1, 0.25))
              }}
              onMouseDown={(e) => {
                if (e.target.closest('button')) return
                isDragging.current = true
                lastPan.current = { x: e.clientX, y: e.clientY }
              }}
              onMouseMove={(e) => {
                if (!isDragging.current) return
                const dx = e.clientX - lastPan.current.x
                const dy = e.clientY - lastPan.current.y
                setPan(p => ({ x: p.x + dx, y: p.y + dy }))
                lastPan.current = { x: e.clientX, y: e.clientY }
              }}
              onMouseUp={() => isDragging.current = false}
              onMouseLeave={() => isDragging.current = false}
            >
               <div
                  className="bg-[var(--bg-card)] p-6 rounded-[5px] ring-1 ring-white/5 shadow-2xl transition-none [&_svg]:max-w-none [&_svg]:!bg-transparent [&_svg_rect]:!stroke-transparent [&>svg>rect]:!fill-transparent"
                  style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
                  dangerouslySetInnerHTML={{ __html: svgContent }}
                />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
})

MermaidDiagram.displayName = 'MermaidDiagram'
export default MermaidDiagram
