import React, { useState, useRef, useEffect } from 'react'
import { ExternalLink, Image as ImageIcon, ZoomIn, ZoomOut, Maximize, Download, X, RotateCcw } from 'lucide-react'

const MarkdownImage = ({ src, alt, ...props }) => {
  const [hasError, setHasError] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const lastPan = useRef({ x: 0, y: 0 })
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
      if (e.deltaY < 0) setZoom(z => Math.min(z + 0.25, 6))
      else setZoom(z => Math.max(z - 0.25, 0.25))
    }
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, []) // We can attach it once

  const handleDownload = async () => {
    try {
      // Create an invisible link to download the image
      const a = document.createElement('a')
      a.href = src
      a.download = alt || `image-${Date.now()}.png`
      // For cross-origin images, standard download attribute might not work perfectly, 
      // but we do our best here. If it's a data URI or local, it works perfectly.
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      window.open(src, '_blank')
    }
  }

  if (hasError) {
    return (
      <div className="my-6 rounded-[5px] overflow-hidden bg-[#1e1e1e] shadow-sm max-w-full ring-1 ring-white/5 p-4 flex flex-col items-center justify-center gap-2">
        <ImageIcon size={20} className="text-white/20" />
        <span className="text-[12px] text-white/40">{alt || src || 'Failed to load image'}</span>
      </div>
    )
  }

  return (
    <>
      <div className="my-6 rounded-[5px] overflow-hidden bg-[#1e1e1e] shadow-sm max-w-full ring-1 ring-white/5">
        <div className="flex items-center justify-between px-1.5 py-0.5 bg-transparent select-none">
          <div className="text-[12px] font-semibold text-white/30 uppercase tracking-widest pl-1 truncate max-w-[50%] flex items-center gap-1.5">
            <ImageIcon size={9} className="opacity-70" />
            {alt || 'Image'}
          </div>
          <div className="flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity">
            <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="Reset view"><RotateCcw size={11} /></button>
            <button onClick={() => setZoom(z => Math.min(z + 0.25, 6))} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="Zoom In"><ZoomIn size={11} /></button>
            <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="Zoom Out"><ZoomOut size={11} /></button>
            <button onClick={() => { setIsModalOpen(true); setPan({x:0, y:0}); setZoom(1); }} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="Expand to fullscreen"><Maximize size={11} /></button>
            <button onClick={handleDownload} className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" title="Download Image"><Download size={11} /></button>
            <div className="w-px h-3 bg-white/10 mx-1" />
            <button 
              onClick={() => window.open(src, '_blank')} 
              className="p-1 text-white/40 hover:text-white hover:bg-white/10 rounded transition-colors" 
              title="Open original in browser"
            >
              <ExternalLink size={11} />
            </button>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="relative w-full flex items-center justify-center bg-transparent min-h-[100px] overflow-hidden cursor-move"
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
          <img 
            src={src} 
            alt={alt} 
            onError={() => setHasError(true)}
            className="max-w-full max-h-[350px] object-contain transition-none select-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
            loading="lazy"
            draggable="false"
            {...props} 
          />
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200">
          <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
            <div className="flex items-center gap-1 bg-[#1e1e1e]/90 backdrop-blur-md p-1.5 rounded-[8px] border border-white/10 shadow-2xl">
               <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors" title="Reset view"><RotateCcw size={16} /></button>
               <button onClick={() => setZoom(z => Math.min(z + 0.25, 6))} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors" title="Zoom In"><ZoomIn size={16} /></button>
               <button onClick={() => setZoom(z => Math.max(z - 0.25, 0.25))} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors" title="Zoom Out"><ZoomOut size={16} /></button>
               <div className="w-px h-5 bg-white/10 mx-1" />
               <button onClick={handleDownload} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors" title="Download Image"><Download size={16} /></button>
               <button onClick={() => window.open(src, '_blank')} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-[6px] transition-colors" title="Open original in browser"><ExternalLink size={16} /></button>
            </div>
            
            <button 
              onClick={() => { setIsModalOpen(false); setZoom(1); setPan({x:0, y:0}) }} 
              className="p-3 bg-[#1e1e1e]/90 backdrop-blur-md text-white/80 hover:text-white hover:bg-red-500/80 rounded-[8px] border border-white/10 transition-colors shadow-2xl flex items-center justify-center" 
              title="Close Fullscreen (Esc)"
            >
              <X size={20} strokeWidth={2.5} />
            </button>
          </div>
          
          <div 
            className="w-full h-full overflow-hidden flex items-center justify-center relative cursor-move" 
            onWheel={(e) => {
              if (e.deltaY < 0) setZoom(z => Math.min(z + 0.25, 6))
              else setZoom(z => Math.max(z - 0.25, 0.25))
            }}
            onMouseDown={(e) => {
              if (e.target.closest('button')) return
              // If clicked directly on the background (not the image), close modal
              if (e.target.tagName.toLowerCase() !== 'img') {
                 setIsModalOpen(false);
                 setZoom(1);
                 setPan({x:0, y:0});
                 return;
              }
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
             <img 
               src={src}
               alt={alt}
               className="max-w-none max-h-none object-contain shadow-2xl transition-none select-none"
               style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }}
               draggable="false"
             />
          </div>
        </div>
      )}
    </>
  )
}

export default MarkdownImage
