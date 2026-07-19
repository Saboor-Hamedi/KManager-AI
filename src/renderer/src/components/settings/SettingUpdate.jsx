import React, { useState, useEffect, useRef } from 'react'
import { Download, RefreshCcw, RotateCw, Package, Settings2 } from 'lucide-react'
import { getSetting, saveSetting } from '../../lib/settings'

const CHECK_TIMEOUT = 15000

const SettingUpdate = () => {
  const [status, setStatus] = useState('idle')
  const [version, setVersion] = useState('')
  const [currentVersion, setCurrentVersion] = useState('')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [searchLimit, setSearchLimit] = useState(3)
  const checkTimeoutRef = useRef(null)

  useEffect(() => {
    getSetting('SEARCH_RESULT_LIMIT', 3).then(limit => {
      setSearchLimit(parseInt(limit) || 3)
    })
  }, [])

  // Load current app version once
  useEffect(() => {
    window.api.app.version().then(setCurrentVersion).catch(() => setCurrentVersion('—'))
  }, [])

  // Wire up electron-updater IPC listeners (same pattern as GlobalTitleBar)
  useEffect(() => {
    if (!window.api?.update) return

    const unsubAvailable = window.api.update.onUpdateAvailable((info) => {
      clearTimeout(checkTimeoutRef.current)
      setVersion(info.version)
      setStatus('available')
      setError('')
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
      clearTimeout(checkTimeoutRef.current)
      setStatus('downloaded')
    })

    const unsubError = window.api.update.onUpdateError((errMsg) => {
      clearTimeout(checkTimeoutRef.current)
      setError(errMsg)
      setStatus('error')
    })

    // Periodic re-check every 10 minutes
    const periodicCheck = setInterval(() => {
      window.api.update.check().catch(() => {})
    }, 10 * 60 * 1000)

    // Re-check when the machine comes back online
    const handleOnline = () => {
      window.api.update.check().catch(() => {})
    }
    window.addEventListener('online', handleOnline)

    return () => {
      clearTimeout(checkTimeoutRef.current)
      clearInterval(periodicCheck)
      window.removeEventListener('online', handleOnline)
      unsubAvailable()
      unsubNotAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  const handleCheck = () => {
    setStatus('checking')
    setError('')
    window.api.update.check().catch(() => {})
    // Fallback: if no response in 15 s, assume up-to-date
    checkTimeoutRef.current = setTimeout(() => {
      setStatus((prev) => (prev === 'checking' ? 'uptodate' : prev))
    }, CHECK_TIMEOUT)
  }

  const handleDownload = () => {
    setStatus('downloading')
    setProgress(0)
    window.api.update.download().catch((err) => {
      setError(err?.message || 'Download failed')
      setStatus('error')
    })
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
      <div className="bg-white/[0.01] rounded-[6px] px-4 py-3 flex items-center justify-between border border-white/[0.04]">
        <div>
          <p className="text-[11px] font-medium text-[var(--text-muted)]">Current Version</p>
          <p className="text-sm font-bold text-[var(--text-main)] mt-0.5">v{currentVersion || '—'}</p>
        </div>
        <button
          onClick={handleCheck}
          disabled={status === 'checking' || status === 'downloading'}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-[var(--bg-active)] hover:bg-white/[0.06] text-[11px] text-[var(--text-main)] transition-colors disabled:opacity-50 border-0"
        >
          <RotateCw size={13} className={status === 'checking' ? 'animate-spin' : ''} />
          <span>{status === 'checking' ? 'Checking...' : 'Check for Updates'}</span>
        </button>
      </div>

      {/* Checking */}
      {status === 'checking' && (
        <div className="bg-white/[0.01] rounded-[6px] px-4 py-3 border border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full border-2 border-[var(--text-accent)] border-t-transparent animate-spin" />
            <p className="text-xs font-medium text-[var(--text-muted)]">Checking for updates...</p>
          </div>
        </div>
      )}

      {/* Up to date */}
      {status === 'uptodate' && (
        <div className="bg-emerald-500/5 rounded-[6px] px-4 py-3 border border-emerald-500/10">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium text-emerald-300">KManager AI is up to date</p>
          </div>
        </div>
      )}

      {/* Available */}
      {status === 'available' && (
        <div className="bg-white/[0.01] rounded-[6px] px-4 py-3 border border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--text-accent)]">Update v{version} available</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                {currentVersion && version ? `v${currentVersion} → v${version}` : 'A new version is ready to download.'}
              </p>
            </div>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-[var(--text-accent)] hover:opacity-90 text-white text-[11px] transition-all animate-pulse border-0 shadow-none"
            >
              <Download size={13} />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}

      {/* Downloading */}
      {status === 'downloading' && (
        <div className="bg-white/[0.01] rounded-[6px] px-4 py-3 border border-white/[0.04]">
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
        <div className="bg-emerald-500/5 rounded-[6px] px-4 py-3 border border-emerald-500/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-emerald-400">Update ready to install</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Restart the application to apply the update.</p>
            </div>
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] transition-all animate-pulse shadow-none border-0"
            >
              <RefreshCcw size={13} />
              <span>Restart</span>
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-red-500/10 rounded-[6px] px-4 py-3 border border-red-500/10">
          <p className="text-xs font-semibold text-red-400">Update check failed</p>
          <p className="text-[10px] text-red-400/80 mt-0.5">
            {error || 'Could not reach update server. Check your internet connection.'}
          </p>
          <button
            onClick={handleCheck}
            className="mt-2 flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors border-0 bg-transparent"
          >
            <RotateCw size={10} />
            <span>Try again</span>
          </button>
        </div>
      )}

      {/* System Constraints Config */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <Settings2 size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">System Configuration</h3>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-bold mb-3">
          Core system limits and baseline parameters.
        </p>

        <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-white/[0.04] bg-white/[0.01]">
          <div>
            <h4 className="text-[11px] font-bold text-[var(--text-main)] tracking-tight">Context Responses Limit</h4>
            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 max-w-[80%] leading-relaxed">
              The exact number of source documents synthesized for AI responses (1-10 max).
            </p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={searchLimit}
            onPaste={(e) => e.preventDefault()}
            onChange={(e) => {
              let val = e.target.value.replace(/\D/g, '')
              if (val.length > 0) {
                if (parseInt(val, 10) > 10) val = '10'
              }
              setSearchLimit(val)
            }}
            onBlur={async (e) => {
              let num = parseInt(e.target.value, 10)
              if (isNaN(num) || num < 1) num = 1
              if (num > 10) num = 10
              setSearchLimit(num)
              await saveSetting('SEARCH_RESULT_LIMIT', num)
            }}
            className="w-12 text-center custom-input font-mono !py-1 !px-2 bg-[var(--bg-active)] border border-white/[0.05] rounded-[4px] text-[12px] text-[var(--text-main)] shadow-none outline-none ring-0 appearance-none m-0 focus:ring-1 focus:ring-[var(--text-accent)]/50 focus:bg-white/[0.04] transition-all"
          />
        </div>
      </div>
    </div>
  )
}

export default SettingUpdate
