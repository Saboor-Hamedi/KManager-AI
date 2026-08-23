import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Minus, Square, X, Database, WifiOff, CodeXml, Download, RefreshCcw, Package, MessageSquare } from 'lucide-react'
import UpdateDetails from './UpdateDetails'

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

  // Listen to electron-updater events forwarded from the main process
  useEffect(() => {
    const unsubAvailable = window.api.update?.onUpdateAvailable?.((info) => {
      setUpdateVersion(info.version)
      setUpdateState(prev => (prev === 'downloaded' || prev === 'downloading') ? prev : 'available')
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
      setUpdateState(prev => (prev === 'downloading' ? 'available' : prev))
      setDownloadProgress(0)
      // Notify the user via Toast
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: `Update error: ${errMsg}`, type: 'error' } }))
    })

    // Trigger an immediate check on mount
    window.api.update?.check?.()

    // Re-check when the machine comes back online (e.g. user was offline at launch)
    const handleOnline = () => {
      window.api.update?.check?.()
    }
    window.addEventListener('online', handleOnline)

    // Periodic re-check every 10 minutes as a safety net
    const periodicCheck = setInterval(() => {
      window.api.update?.check?.()
    }, 10 * 60 * 1000)

    return () => {
      unsubAvailable?.()
      unsubProgress?.()
      unsubDownloaded?.()
      unsubError?.()
      window.removeEventListener('online', handleOnline)
      clearInterval(periodicCheck)
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

  const handleDownload = useCallback(() => {
    setUpdateState('downloading')
    setDownloadProgress(0)
    window.api.update.download().catch((err) => {
      console.error('Failed to start download:', err)
      setUpdateState('available')
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: `Failed to start download: ${err.message}`, type: 'error' } }))
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
    <div className="h-[26px] w-full bg-[var(--bg-panel)] flex items-center justify-between shrink-0 z-[60] relative [-webkit-app-region:drag] select-none border-0">
      {/* Left: App Identity & Update Button */}
      <div className="flex items-center gap-2 px-2.5 min-w-0">
        <div className="flex items-center gap-1.5">
          <CodeXml className="text-[var(--text-accent)] shrink-0" size={13} />
          <span className="text-[12px] font-semibold text-[var(--text-main)] tracking-tight truncate">
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
                <Download size={14} strokeWidth={2.5} className="transition-transform" />
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

            <UpdateDetails 
              show={showDropdown} 
              currentVersion={currentVersion} 
              updateVersion={updateVersion} 
            />
          </div>
        )}
      </div>

      {/* Center Spacer */}
      <div className="flex-1 min-w-0"></div>

      {/* Right: Status & Window Controls */}
      <div className="flex items-center h-full [-webkit-app-region:no-drag] shrink-0">
        {!checking && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'database' } }))}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-[4px] text-[12px] font-medium mr-2 transition-colors cursor-pointer border-0 ${
              dbConnected
                ? 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                : 'text-amber-400 hover:bg-amber-400/10'
            }`}
          >
            {dbConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Library Connected</span>
              </>
            ) : (
              <>
                <WifiOff size={10} />
                <span>Library Disconnected</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={(e) => { 
            e.preventDefault(); 
            e.stopPropagation(); 
            setTimeout(() => window.dispatchEvent(new CustomEvent('toggle-chatbot')), 10);
          }}
          className="h-full px-3 flex items-center justify-center hover:bg-[var(--bg-active)] text-[var(--text-accent)] transition-colors border-0"
          title="Open Assistant (Ctrl + \)"
        >
          <MessageSquare size={13} />
        </button>
        <button
          type="button"
          onClick={handleMinimize}
          className="h-full px-3 flex items-center justify-center hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0"
          title="Minimize"
        >
          <Minus size={12} />
        </button>
        <button
          type="button"
          onClick={handleMaximize}
          className="h-full px-3 flex items-center justify-center hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0"
          title="Maximize"
        >
          <Square size={10} />
        </button>
        <button
          type="button"
          onClick={handleClose}
          className="h-full px-3 flex items-center justify-center hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors border-0"
          title="Close"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

export default GlobalTitleBar
