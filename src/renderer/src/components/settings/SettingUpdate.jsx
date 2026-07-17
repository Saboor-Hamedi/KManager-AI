import React, { useState, useEffect, useRef } from 'react'
import { Download, RefreshCcw, RotateCw, Package, Sparkles } from 'lucide-react'

const CHECK_TIMEOUT = 10000

const SettingUpdate = () => {
  const [status, setStatus] = useState('idle')
  const [version, setVersion] = useState('')
  const [currentVersion, setCurrentVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const checkTimeoutRef = useRef(null)

  useEffect(() => {
    const loadVersion = async () => {
      try {
        const v = await window.api.app.version()
        setCurrentVersion(v)
      } catch {
        setCurrentVersion('1.0.3')
      }
    }
    loadVersion()
  }, [])

  useEffect(() => {
    if (!window.api?.update) return

    const unsubAvailable = window.api.update.onUpdateAvailable((info) => {
      clearTimeout(checkTimeoutRef.current)
      setVersion(info.version)
      setStatus('available')
    })

    const unsubNotAvailable = window.api.update.onUpdateNotAvailable(() => {
      clearTimeout(checkTimeoutRef.current)
      setStatus('uptodate')
    })

    const unsubProgress = window.api.update.onUpdateProgress((progressObj) => {
      setStatus('downloading')
      setProgress(progressObj.percent)
      if (progressObj.percent >= 100) {
        setTimeout(() => setStatus('downloaded'), 500)
      }
    })

    const unsubDownloaded = window.api.update.onUpdateDownloaded(() => {
      setStatus('downloaded')
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
    setStatus('checking')
    setError('')
    window.api.update.check()
    checkTimeoutRef.current = setTimeout(() => {
      setStatus('uptodate')
    }, CHECK_TIMEOUT)
  }

  const handleDownload = () => {
    setStatus('downloading')
    setProgress(0)
    window.api.update.download()
  }

  const handleInstall = () => {
    window.api.update.install()
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Package size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">Application Update</h3>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-bold mb-3">
          Check for new versions, download updates, and restart to apply them.
        </p>
      </div>

      {/* Current Version */}
      <div className="bg-[var(--bg-panel)] rounded-lg px-4 py-3 flex items-center justify-between border border-[var(--border-subtle)]">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-muted)]">Current Version</p>
          <p className="text-sm font-bold text-[var(--text-main)] mt-0.5">{currentVersion || '1.0.3'}</p>
        </div>
        <button
          onClick={handleCheck}
          disabled={status === 'checking' || status === 'downloading'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--bg-active)] hover:bg-[var(--border-main)] text-[var(--text-main)] text-xs font-medium transition-colors disabled:opacity-50"
        >
          <RotateCw size={13} className={status === 'checking' ? 'animate-spin' : ''} />
          <span>{status === 'checking' ? 'Checking...' : 'Check for Updates'}</span>
        </button>
      </div>

      {/* Checking */}
      {status === 'checking' && (
        <div className="bg-[var(--bg-panel)] rounded-lg px-4 py-3 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--text-accent)] border-t-transparent animate-spin" />
            <p className="text-xs font-medium text-[var(--text-muted)]">Checking for updates...</p>
          </div>
        </div>
      )}

      {/* Up to date */}
      {status === 'uptodate' && (
        <div className="bg-emerald-500/5 rounded-lg px-4 py-3 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            {/* <Sparkles size={14} className="text-emerald-400" /> */}
            <p className="text-xs font-medium text-emerald-300">KManager AI is up to date</p>
          </div>
        </div>
      )}

      {/* Available */}
      {status === 'available' && (
        <div className="bg-[var(--bg-panel)] rounded-lg px-4 py-3 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-accent)]">Update v{version} available</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Click Download to get the latest version.</p>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[var(--text-accent)] hover:bg-[var(--text-accent)]/80 text-white text-xs font-semibold transition-all animate-pulse"
            >
              <Download size={13} />
              <span>Download Update</span>
            </button>
          </div>
        </div>
      )}

      {/* Downloading */}
      {status === 'downloading' && (
        <div className="bg-[var(--bg-panel)] rounded-lg px-4 py-3 border border-[var(--border-subtle)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-[var(--text-main)]">Downloading update...</p>
            <span className="text-xs font-mono text-[var(--text-accent)] font-semibold">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--text-accent)] rounded-full transition-all duration-200"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </div>
      )}

      {/* Downloaded */}
      {status === 'downloaded' && (
        <div className="bg-[var(--bg-panel)] rounded-lg px-4 py-3 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-400">Update ready to install</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Restart the application to apply the update.</p>
            </div>
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-all animate-pulse shadow-lg shadow-emerald-500/20"
            >
              <RefreshCcw size={13} />
              <span>Restart</span>
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
          <p className="text-xs font-semibold text-red-400">Update check failed</p>
          <p className="text-[10px] text-red-400/80 mt-0.5">{error || 'Could not reach update server. Make sure you have an internet connection.'}</p>
        </div>
      )}
    </div>
  )
}

export default SettingUpdate
