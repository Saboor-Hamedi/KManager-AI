import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import * as htmlToImage from 'html-to-image'

const CopyFigureButton = ({ targetRef, filename = 'figure.png' }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!targetRef.current) return
    try {
      // Generate blob
      const blob = await htmlToImage.toBlob(targetRef.current, {
        backgroundColor: '#0a0a0a', // matching dark theme bg
        style: {
          margin: '0',
          transform: 'scale(1)'
        }
      })
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ])
      
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy image', err)
      // Fallback: download the image if clipboard fails
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
      className="absolute top-4 right-4 z-50 p-2 bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] border border-[var(--border-dim)] rounded-md transition-colors text-[var(--text-muted)] hover:text-white flex items-center gap-2 group shadow-sm"
      title="Copy Figure to Clipboard"
    >
      {copied ? <Check size={14} className="text-[#10b981]" /> : <Copy size={14} />}
      <span className="text-[9px] font-bold uppercase tracking-wider hidden group-hover:block transition-all">
        {copied ? 'Copied!' : 'Copy'}
      </span>
    </button>
  )
}

export default CopyFigureButton
