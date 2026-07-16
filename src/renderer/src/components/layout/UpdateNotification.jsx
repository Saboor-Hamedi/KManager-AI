import React, { useState, useEffect } from 'react'
import { Download, RefreshCcw, X } from 'lucide-react'

const UpdateNotification = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [progress, setProgress] = useState(0)
  const [version, setVersion] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!window.api?.update) return

    const unsubAvailable = window.api.update.onUpdateAvailable((info) => {
      setVersion(info.version)
      setUpdateAvailable(true)
      setDismissed(false)
    })

    const unsubProgress = window.api.update.onUpdateProgress((progressObj) => {
      setDownloading(true)
      setProgress(progressObj.percent)
      if (progressObj.percent >= 100) {
        setTimeout(() => {
          setDownloading(false)
          setDownloaded(true)
        }, 400)
      }
    })

    const unsubDownloaded = window.api.update.onUpdateDownloaded(() => {
      setDownloading(false)
      setDownloaded(true)
    })

    return () => {
      if (unsubAvailable) unsubAvailable()
      if (unsubProgress) unsubProgress()
      if (unsubDownloaded) unsubDownloaded()
    }
  }, [])

  const handleDownload = () => {
    setDownloading(true)
    window.api.update.download()
  }

  const handleInstall = () => {
    window.api.update.install()
  }

  if (dismissed && !downloaded) return null
  if (!updateAvailable) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-lg shadow-lg overflow-hidden min-w-[200px]">
        {/* Available / Downloading state */}
        {!downloaded && (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-main)] truncate">
                {downloading
                  ? `Downloading ${Math.round(progress)}%`
                  : `Update v${version} available`
                }
              </p>
              {downloading && (
                <div className="mt-1.5 h-1 bg-[var(--bg-panel)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--text-accent)] rounded-full transition-all duration-200"
                    style={{ width: `${Math.max(progress, 4)}%` }}
                  />
                </div>
              )}
            </div>

            {!downloading && (
              <>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--text-accent)]/10 hover:bg-[var(--text-accent)]/20 text-[var(--text-accent)] text-xs font-semibold transition-colors animate-pulse shrink-0"
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="p-1 rounded hover:bg-[var(--bg-panel)] text-[var(--text-faint)] hover:text-[var(--text-muted)] transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </>
            )}

            {downloading && (
              <span className="text-xs font-mono text-[var(--text-accent)] font-semibold shrink-0 tabular-nums">
                {Math.round(progress)}%
              </span>
            )}
          </div>
        )}

        {/* Downloaded / Ready to restart state */}
        {downloaded && (
          <div className="flex items-center gap-3 px-3 py-2.5">
            <p className="text-xs font-semibold text-[var(--text-main)] flex-1">
              Update ready to install
            </p>
            <button
              onClick={handleInstall}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors animate-pulse shrink-0"
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
