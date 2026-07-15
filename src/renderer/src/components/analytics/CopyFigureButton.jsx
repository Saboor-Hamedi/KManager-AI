import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import * as htmlToImage from 'html-to-image'

const CopyFigureButton = ({ targetRef, filename = 'figure.png' }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!targetRef?.current) return
    try {
      const blob = await htmlToImage.toBlob(targetRef.current, {
        backgroundColor: '#0a0a0a',
        style: {
          margin: '0',
          transform: 'scale(1)'
        }
      })
      
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy image to clipboard, attempting download...', err)
      try {
        const dataUrl = await htmlToImage.toPng(targetRef.current, { backgroundColor: '#0a0a0a' })
        const link = document.createElement('a')
        link.download = filename
        link.href = dataUrl
        link.click()
        
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (e) {
        console.error('Fallback download failed', e)
      }
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 z-40 p-1.5 bg-[var(--bg-panel)]/80 hover:bg-[var(--border-dim)] border border-[var(--border-dim)] rounded-lg transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1.5 group shadow-sm backdrop-blur-sm"
      title="Copy Figure"
    >
      {copied ? <Check size={12} className="text-[#10b981]" /> : <Copy size={12} />}
      <span className="text-[10px] font-medium hidden group-hover:inline transition-opacity">
        {copied ? 'Copied' : 'Copy'}
      </span>
    </button>
  )
}

export default CopyFigureButton
