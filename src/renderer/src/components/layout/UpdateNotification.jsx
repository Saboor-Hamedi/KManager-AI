import React, { useState, useEffect } from 'react'
import { DownloadCloud, RefreshCcw, X, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-6 right-6 w-80 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl shadow-xl overflow-hidden z-50 font-sans"
      >
        <div className="flex items-start p-4">
          <div className="mt-0.5 mr-3 text-blue-500">
            <Info size={20} />
          </div>
          
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-[var(--text-main)] mb-1">
              {downloaded ? 'Update Ready to Install' : 'Update Available'}
            </h3>
            
            <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
              {downloaded 
                ? 'A new version of KManager AI is ready. Restart to apply the update.'
                : `Version ${version} is available. Would you like to download it now?`}
            </p>

            {downloading && (
              <div className="mb-3">
                <div className="h-1.5 w-full bg-[var(--bg-highlight)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1.5 text-right">
                  {Math.round(progress)}%
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              {!downloading && !downloaded && (
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-xs font-medium transition-colors"
                >
                  <DownloadCloud size={14} />
                  Download Update
                </button>
              )}
              
              {downloaded && (
                <button 
                  onClick={handleInstall}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md text-xs font-medium transition-colors"
                >
                  <RefreshCcw size={14} />
                  Restart to Update
                </button>
              )}
            </div>
          </div>

          {!downloading && !downloaded && (
            <button 
              onClick={() => setDismissed(true)}
              className="p-1 text-[var(--text-muted)] hover:bg-[var(--bg-highlight)] rounded-md transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

export default UpdateNotification
