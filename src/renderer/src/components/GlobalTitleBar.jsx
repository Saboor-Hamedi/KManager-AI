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

    const unsubError = window.api.update?.onUpdateError?.((errMsg) => {
      console.error('Update error:', errMsg)
      setUpdateState('available')
      setDownloadProgress(0)
    })

    window.api.update?.check()
    check()

    return () => {
      cancelled = true
      unsubAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
      unsubError?.()
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

  // Removed handleUpdateClick since we'll use hover for dropdown and click for download

  const handleDownload = useCallback(() => {
    setUpdateState('downloading')
    setDownloadProgress(0)
    window.api.update.download().catch((err) => {
      console.error('Failed to start download:', err)
      setUpdateState('available')
    })
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
      {/* Left: App Identity & Update Button */}
      <div className="flex items-center gap-3 px-3 min-w-0">
        <div className="flex items-center gap-2">
          <CodeXml className="text-[var(--text-accent)] shrink-0" size={16} />
          <span className="text-xs font-semibold text-[var(--text-main)] tracking-tight truncate">
            KManager AI
          </span>
        </div>

        {showUpdate && (
          <div 
            className="relative [-webkit-app-region:no-drag]" 
            ref={dropdownRef}
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            {updateState === 'available' && (
              <button
                onClick={handleDownload}
                className="group flex items-center justify-center w-7 h-7 text-[var(--text-accent)] hover:bg-[var(--bg-active)] rounded-md transition-all active:scale-[0.95]"
                aria-label="Update Available"
              >
                <Download size={14} strokeWidth={2.5} className="group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
            {updateState === 'downloading' && (
              <div
                className="flex items-center justify-center w-7 h-7 cursor-default"
                aria-label={`Downloading ${Math.round(downloadProgress)}%`}
              >
                <div className="relative flex items-center justify-center">
                  <svg width="18" height="18" className="transform -rotate-90">
                    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-[var(--text-muted)] opacity-20" />
                    <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="2" fill="transparent" strokeDasharray={50.3} strokeDashoffset={50.3 - (downloadProgress / 100) * 50.3} className="text-[var(--text-accent)] transition-all duration-200" strokeLinecap="round" />
                  </svg>
                  <Download size={9} strokeWidth={2.5} className="absolute text-[var(--text-accent)]" />
                </div>
              </div>
            )}
            {updateState === 'downloaded' && (
              <button
                onClick={handleInstall}
                className="group flex items-center justify-center w-7 h-7 text-emerald-500 hover:bg-[var(--bg-active)] rounded-md transition-all active:scale-[0.95] animate-pulse"
                aria-label="Restart to Install"
              >
                <RefreshCcw size={14} strokeWidth={2.5} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            )}

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 pt-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-xl w-[230px]">
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={14} className="text-[var(--text-accent)] shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-main)]">Update Available</p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">v{currentVersion} → <span className="text-[var(--text-accent)] font-medium">v{updateVersion}</span></p>
                      </div>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                      A new version of KManager AI is ready. Click the update button to get new features, improvements, and bug fixes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center Spacer */}
      <div className="flex-1 min-w-0"></div>

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
