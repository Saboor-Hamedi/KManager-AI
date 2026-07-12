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
    <div className="h-9 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 pl-3.5 pr-1 select-none z-50 [-webkit-app-region:drag]">
      {/* Left: App Identity */}
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-[var(--text-accent)]" />
        <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight">
          KManager AI
        </span>
        <span className="text-[10px] text-[var(--text-faint)] font-mono uppercase tracking-widest">
          Knowledge Management Studio
        </span>
      </div>

      {/* Right: Environment & Window Controls */}
      <div className="flex items-center gap-2 [-webkit-app-region:no-drag]">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-app)] border border-[var(--border-subtle)] text-[10.5px] font-medium text-[var(--text-muted)] mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Postgres Connected</span>
        </div>

        {/* Native Window Controls */}
        <div className="flex items-center h-7">
          <button
            type="button"
            onClick={handleMinimize}
            className="w-9 h-full flex items-center justify-center rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="Minimize"
          >
            <Minus size={13} />
          </button>
          <button
            type="button"
            onClick={handleMaximize}
            className="w-9 h-full flex items-center justify-center rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            title="Maximize"
          >
            <Square size={11} />
          </button>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-full flex items-center justify-center rounded hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default GlobalTitleBar
