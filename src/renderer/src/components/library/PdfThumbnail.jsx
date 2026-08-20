import React, { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = ''

const PdfThumbnail = ({ filePath, fallbackSnippet }) => {
  const canvasRef = useRef(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true
    
    const renderPdf = async () => {
      try {
        if (!filePath) throw new Error('No path')
        if (!pdfjsLib) throw new Error('pdfjsLib not loaded')
        
        // Load the file binary from main process to avoid CORS/file schema issues
        const buffer = await window.api.system.readFileBinary(filePath)
        if (!buffer) throw new Error('File not found')
        
        const data = new Uint8Array(buffer)
        
        const loadingTask = pdfjsLib.getDocument({
          data,
          disableWorker: true,
          cMapUrl: undefined,
          cMapPacked: false,
        })
        
        const pdf = await loadingTask.promise
        const page = await pdf.getPage(1)
        
        if (!isMounted) return

        const viewport = page.getViewport({ scale: 1.0 })
        const canvas = canvasRef.current
        if (!canvas) return
        
        const context = canvas.getContext('2d')
        const scale = 200 / viewport.height
        const scaledViewport = page.getViewport({ scale })

        canvas.height = scaledViewport.height
        canvas.width = scaledViewport.width

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        }
        await page.render(renderContext).promise
      } catch (err) {
        console.warn('Failed to render PDF thumbnail for:', filePath, err)
        if (isMounted) setError(true)
      }
    }

    renderPdf()

    return () => { isMounted = false }
  }, [filePath])

  if (error || !filePath) {
    return (
      <div className="w-full h-full bg-red-500/[0.03] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="text-red-500/40 text-[14px] font-black tracking-widest uppercase mb-2 border border-red-500/20 px-3 py-1 rounded-[3px]">
          PDF
        </div>
        {fallbackSnippet && (
          <div className="text-[5.5px] text-red-500/40 font-mono leading-[1.4] text-center line-clamp-4 max-w-[80%] break-words">
            {fallbackSnippet}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white/5 flex items-center justify-center overflow-hidden relative">
      <canvas ref={canvasRef} className="w-full h-auto object-cover opacity-90 shadow-lg" />
      <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-500/80 backdrop-blur-md rounded-[3px] text-[8px] font-bold text-white shadow-sm border border-white/10 uppercase tracking-wider">
        PDF
      </div>
    </div>
  )
}

export default PdfThumbnail
