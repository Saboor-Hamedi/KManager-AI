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
  const [autoLaunch, setAutoLaunch] = useState(false)
  const checkTimeoutRef = useRef(null)

  useEffect(() => {
    getSetting('SEARCH_RESULT_LIMIT', 3).then(limit => {
      setSearchLimit(parseInt(limit) || 3)
    })
    window.api.system.getAutoLaunch().then(enabled => {
      setAutoLaunch(enabled)
    }).catch(() => {})
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
      setStatus(prev => (prev === 'downloaded' || prev === 'downloading') ? prev : 'available')
      setError('')
    })

    const unsubNotAvailable = window.api.update.onUpdateNotAvailable(() => {
      clearTimeout(checkTimeoutRef.current)
      setStatus(prev => (prev === 'downloaded' || prev === 'downloading') ? prev : 'uptodate')
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
        <p className="text-[12px] text-[var(--text-muted)] leading-relaxed font-bold mb-3">
          Check for new versions, download updates, and restart to apply them.
        </p>
      </div>

      {/* Current Version */}
      <div className="bg-white/[0.01] rounded-[6px] px-4 py-3 flex items-center justify-between border border-white/[0.04]">
        <div>
          <p className="text-[12px] font-medium text-[var(--text-muted)]">Current Version</p>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm font-bold text-[var(--text-main)]">v{currentVersion || '—'}</p>
            {status === 'available' && <span className="text-[var(--text-accent)] text-xs font-semibold">→ v{version}</span>}
            {status === 'downloading' && (
              <div className="w-24 h-1.5 bg-[var(--bg-card)] rounded-full overflow-hidden ml-2">
                <div className="h-full bg-[var(--text-accent)] rounded-full transition-all duration-200" style={{ width: `${Math.max(progress, 4)}%` }} />
              </div>
            )}
            {status === 'error' && <span className="text-red-400 text-xs font-medium ml-2">{error || 'Failed'}</span>}
          </div>
        </div>
        <button
          onClick={() => {
            if (status === 'available' || status === 'error') handleDownload()
            else if (status === 'downloaded') handleInstall()
            else handleCheck()
          }}
          disabled={status === 'checking' || status === 'downloading'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[5px] text-[12px] transition-colors border-0 ${
            status === 'available' || status === 'error'
              ? 'bg-[var(--text-accent)] text-white hover:opacity-90 shadow-none'
              : status === 'downloaded'
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-none animate-pulse'
              : 'bg-[var(--bg-active)] hover:bg-white/[0.06] text-[var(--text-main)] disabled:opacity-50'
          }`}
        >
          {status === 'available' ? (
             <><Download size={13} /><span>Download</span></>
          ) : status === 'downloaded' ? (
             <><RefreshCcw size={13} /><span>Restart</span></>
          ) : status === 'error' ? (
             <><RotateCw size={13} /><span>Retry</span></>
          ) : status === 'downloading' ? (
             <><Download size={13} /><span>{Math.round(progress)}%</span></>
          ) : (
             <><RotateCw size={13} className={status === 'checking' ? 'animate-spin' : ''} /><span>{status === 'checking' ? 'Checking...' : status === 'uptodate' ? 'Up to date' : 'Check for Updates'}</span></>
          )}
        </button>
      </div>

      {/* System Constraints Config */}
      <div>
        <div className="flex items-center gap-2 mb-2 mt-4">
          <Settings2 size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">System Configuration</h3>
        </div>
        <p className="text-[12px] text-[var(--text-muted)] leading-relaxed font-bold mb-3">
          Core system limits and baseline parameters.
        </p>

        <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-white/[0.04] bg-white/[0.01]">
          <div>
            <h4 className="text-[12px] font-bold text-[var(--text-main)] tracking-tight">Context Responses Limit</h4>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5 max-w-[80%] leading-relaxed">
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

        <div className="flex items-center justify-between p-3.5 mt-2 rounded-[6px] border border-white/[0.04] bg-white/[0.01]">
          <div>
            <h4 className="text-[12px] font-bold text-[var(--text-main)] tracking-tight">Launch on Startup</h4>
            <p className="text-[12px] text-[var(--text-muted)] mt-0.5 max-w-[80%] leading-relaxed">
              Automatically launch KManager AI when you sign in to Windows.
            </p>
          </div>
          <button
            onClick={async () => {
              const current = await window.api.system.getAutoLaunch()
              const next = !current
              await window.api.system.toggleAutoLaunch(next)
              setAutoLaunch(next)
            }}
            className="relative flex items-center justify-center shrink-0 w-8 h-4 rounded-full transition-colors border-0 bg-transparent p-0"
            style={{ backgroundColor: autoLaunch ? 'var(--text-accent)' : 'rgba(255,255,255,0.1)' }}
          >
            <div 
              className="absolute w-3 h-3 bg-white rounded-full transition-transform"
              style={{ transform: `translateX(${autoLaunch ? '8px' : '-8px'})` }}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingUpdate
