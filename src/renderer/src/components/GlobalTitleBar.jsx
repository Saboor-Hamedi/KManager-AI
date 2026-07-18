import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Minus, Square, X, Database, WifiOff, CodeXml, Download, RefreshCcw, Package } from 'lucide-react'

const GlobalTitleBar = () => {
  const [dbConnected, setDbConnected] = useState(false)
  const [checking, setChecking] = useState(true)
  const [updateState, setUpdateState] = useState('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [currentVersion, setCurrentVersion] = useState('')
  const dropdownRef = useRef(null)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await window.api.db.status()
        setDbConnected(res?.connected || false)
      } catch {
        setDbConnected(false)
      }
      setChecking(false)
    }
    check()
    const interval = setInterval(check, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    window.api.app.version().then(v => setCurrentVersion(v)).catch(() => {})
  }, [])

  // Check for updates directly from GitHub releases (works in dev mode)
  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const [current, latest] = await Promise.all([
          window.api.app.version().catch(() => '1.0.3'),
          window.api.app.checkLatestVersion().catch(() => null)
        ])
        if (!latest) return
        const curParts = current.split('.').map(Number)
        const latParts = latest.split('.').map(Number)
        for (let i = 0; i < 3; i++) {
          const cp = curParts[i] || 0
          const lp = latParts[i] || 0
          if (lp > cp) {
            if (!cancelled) {
              setUpdateVersion(latest)
              setUpdateState('available')
            }
            return
          }
          if (lp < cp) return
        }
      } catch {
        // silent
      }
    }

    // Also listen to electron-updater events (works in production)
    const unsubAvailable = window.api.update?.onUpdateAvailable?.((info) => {
      setUpdateVersion(info.version)
      setUpdateState('available')
    })

    const unsubProgress = window.api.update?.onUpdateProgress?.((progressObj) => {
      setUpdateState('downloading')
      setDownloadProgress(progressObj.percent)
      if (progressObj.percent >= 100) {
        setTimeout(() => setUpdateState('downloaded'), 400)
      }
    })

    const unsubDownloaded = window.api.update?.onUpdateDownloaded?.(() => {
      setUpdateState('downloaded')
    })

    window.api.update?.check()
    check()

    return () => {
      cancelled = true
      unsubAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
    }
  }, [])

  useEffect(() => {
    if (!showDropdown) return
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  const handleUpdateClick = useCallback(() => {
    setShowDropdown(prev => !prev)
  }, [])

  const handleDownload = useCallback(() => {
    window.api.update.download()
  }, [])

  const handleInstall = useCallback(() => {
    window.api.update.install()
  }, [])

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

  const showUpdate = updateState === 'available' || updateState === 'downloading' || updateState === 'downloaded'

  return (
    <div className="h-8 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center shrink-0 z-50 [-webkit-app-region:drag]">
      {/* Left: App Identity */}
      <div className="flex items-center gap-2 px-3 min-w-0">
        <CodeXml className="text-[var(--text-accent)] shrink-0" size={16} />
        <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight truncate">
          KManager AI
        </span>
      </div>

      {/* Center: Update Button */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        {showUpdate && (
          <div className="relative [-webkit-app-region:no-drag]" ref={dropdownRef}>
            {updateState === 'available' && (
              <button
                onClick={handleUpdateClick}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[var(--text-accent)]/10 hover:bg-[var(--text-accent)]/20 text-[11px] font-semibold text-[var(--text-accent)] transition-colors"
              >
                <Download size={11} />
                <span>Update</span>
              </button>
            )}
            {updateState === 'downloading' && (
              <button
                onClick={() => setShowDropdown(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-[var(--bg-active)] text-[11px] font-medium text-[var(--text-muted)] transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full border-2 border-[var(--text-accent)] border-t-transparent animate-spin" />
                <span>{Math.round(downloadProgress)}%</span>
              </button>
            )}
            {updateState === 'downloaded' && (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-semibold text-emerald-400 transition-colors border border-emerald-500/20 animate-pulse"
              >
                <RefreshCcw size={11} />
                <span>Restart</span>
              </button>
            )}

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg min-w-[200px] z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                {updateState === 'available' && (
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={14} className="text-[var(--text-accent)] shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-main)]">Update Available</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">v{currentVersion} → <span className="text-[var(--text-accent)] font-medium">v{updateVersion}</span></p>
                      </div>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed mb-3">
                      A new version of KManager AI is ready. Please download the latest installer to get new features, improvements, and bug fixes.
                    </p>
                    <button
                      onClick={handleDownload}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--text-accent)] hover:bg-[var(--text-accent)]/80 text-white text-xs font-semibold transition-all"
                    >
                      <Download size={12} />
                      <span>Download Update</span>
                    </button>
                  </div>
                )}
                {updateState === 'downloading' && (
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-[var(--text-muted)]">Downloading...</p>
                      <span className="text-xs font-mono text-[var(--text-accent)] font-semibold">{Math.round(downloadProgress)}%</span>
                    </div>
                    <div className="h-1 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--text-accent)] rounded-full transition-all duration-200"
                        style={{ width: `${Math.max(downloadProgress, 4)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Status & Window Controls */}
      <div className="flex items-center h-full [-webkit-app-region:no-drag] shrink-0">
        {!checking && (
          <div className={`flex items-center gap-1.5 px-1.5 text-[10px] font-medium mr-2 ${
            dbConnected
              ? 'text-[var(--text-muted)]'
              : 'text-amber-400'
          }`}>
          {dbConnected ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Postgres Connected</span>
            </>
          ) : (
            <>
              <WifiOff size={10} />
              <span>DB Disconnected</span>
            </>
          )}
        </div>
        )}

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
