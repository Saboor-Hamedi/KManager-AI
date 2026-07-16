import React from 'react'
import { Minus, Square, X } from 'lucide-react'

const GlobalTitleBar = () => {
  const handleMinimize = () => {
    if (window.api && window.api.windowControls) {
      window.api.windowControls.minimize()
    }
  }

  const handleMaximize = () => {
    if (window.api && window.api.windowControls) {
      window.api.windowControls.maximize()
    }
  }

  const handleClose = () => {
    if (window.api && window.api.windowControls) {
      window.api.windowControls.close()
    }
  }

  return (
    <div className="h-8 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center shrink-0 select-none z-50 [-webkit-app-region:drag]">
      {/* Left: App Identity */}
      <div className="flex items-center gap-2 px-3">
        <span className="w-2 h-2 rounded-full bg-[var(--text-accent)]" />
        <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight">
          KManager AI
        </span>
        <span className="text-[10px] text-[var(--text-faint)] font-mono uppercase tracking-widest hidden sm:inline-block">
          Knowledge Management Studio
        </span>
      </div>

      <div className="flex-1" />

      {/* Right: Status & Window Controls */}
      <div className="flex items-center h-full [-webkit-app-region:no-drag]">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[10px] font-medium text-[var(--text-muted)] mr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Postgres Connected</span>
        </div>

        <button
          type="button"
          onClick={handleMinimize}
          className="h-full px-4 flex items-center justify-center hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          title="Minimize"
        >
          <Minus size={13} />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="h-full px-4 flex items-center justify-center hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          title="Maximize"
        >
          <Square size={11} />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="h-full px-4 flex items-center justify-center hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

export default GlobalTitleBar
