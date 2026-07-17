import React, { useState, useEffect, useRef } from 'react'
import { Download, RefreshCcw, X, Sparkles } from 'lucide-react'

const CHECK_TIMEOUT = 10000

const UpdateNotification = () => {
  const [state, setState] = useState('idle')
  const [version, setVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const checkTimeoutRef = useRef(null)

  useEffect(() => {
    if (!window.api?.update) return

    const unsubAvailable = window.api.update.onUpdateAvailable((info) => {
      clearTimeout(checkTimeoutRef.current)
      setVersion(info.version)
      setState('available')
    })

    const unsubNotAvailable = window.api.update.onUpdateNotAvailable(() => {
      clearTimeout(checkTimeoutRef.current)
      setState('uptodate')
    })

    const unsubProgress = window.api.update.onUpdateProgress((progressObj) => {
      setState('downloading')
      setProgress(progressObj.percent)
      if (progressObj.percent >= 100) {
        setTimeout(() => setState('downloaded'), 400)
      }
    })

    const unsubDownloaded = window.api.update.onUpdateDownloaded(() => {
      setState('downloaded')
    })

    return () => {
      clearTimeout(checkTimeoutRef.current)
      unsubAvailable()
      unsubNotAvailable()
      unsubProgress()
      unsubDownloaded()
    }
  }, [])

  const handleCheck = () => {
    setState('checking')
    setDismissed(false)
    window.api.update.check()
    checkTimeoutRef.current = setTimeout(() => {
      setState('idle')
    }, CHECK_TIMEOUT)
  }

  const handleDownload = () => {
    setState('downloading')
    window.api.update.download()
  }

  const handleInstall = () => {
    window.api.update.install()
  }

  if (dismissed) return null
  if (state === 'idle') return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg overflow-hidden min-w-[220px] max-w-[300px]">

        {/* Checking */}
        {state === 'checking' && (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--text-accent)] border-t-transparent animate-spin shrink-0" />
            <p className="text-xs font-medium text-[var(--text-muted)]">Checking for updates...</p>
          </div>
        )}

        {/* Up to date */}
        {state === 'uptodate' && (
          <div className="flex items-center gap-3 px-3 py-2.5">
            {/* <Sparkles size={14} className="text-emerald-400 shrink-0" /> */}
            <p className="text-xs font-medium text-[var(--text-main)] flex-1">KManager AI is up to date</p>
            <button onClick={() => setDismissed(true)} className="p-0.5 rounded hover:bg-[var(--bg-panel)] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors shrink-0">
              <X size={13} />
            </button>
          </div>
        )}

        {/* Available */}
        {state === 'available' && (
          <div className="flex flex-col">
            <div className="flex items-center gap-3 px-3 pt-2.5 pb-2">
              <p className="text-xs font-semibold text-[var(--text-main)] flex-1 truncate">Update v{version} available</p>
              <button onClick={() => setDismissed(true)} className="p-0.5 rounded hover:bg-[var(--bg-panel)] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors shrink-0">
                <X size={13} />
              </button>
            </div>
            <div className="px-3 pb-2.5">
              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--text-accent)] hover:bg-[var(--text-accent)]/80 text-white text-xs font-semibold transition-all animate-pulse"
              >
                <Download size={13} />
                <span>Download Update</span>
              </button>
            </div>
          </div>
        )}

        {/* Downloading */}
        {state === 'downloading' && (
          <div className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-medium text-[var(--text-main)]">Downloading...</p>
              <span className="text-xs font-mono text-[var(--text-accent)] font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-[var(--bg-panel)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--text-accent)] rounded-full transition-all duration-200" style={{ width: `${Math.max(progress, 4)}%` }} />
            </div>
          </div>
        )}

        {/* Downloaded - Ready to Restart */}
        {state === 'downloaded' && (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <p className="text-xs font-semibold text-emerald-400 flex-1">Update ready</p>
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all animate-pulse shadow-lg shadow-emerald-500/20"
            >
              <RefreshCcw size={13} />
              <span>Restart</span>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

export default UpdateNotification
