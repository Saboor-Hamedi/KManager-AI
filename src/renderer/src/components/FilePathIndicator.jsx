import React from 'react'
import { Home } from 'lucide-react'

const FilePathIndicator = ({ vaultPath, className = '' }) => {
  if (!vaultPath || vaultPath.startsWith('ai-response-')) return null

  return (
    <div className={"flex items-center shrink-0 " + className}>
      <button
        onClick={() => window.api.system.showInFolder(vaultPath)}
        className="flex items-center justify-center p-1 rounded-[4px] bg-transparent hover:bg-white/[0.04] text-white/30 hover:text-[var(--text-main)] transition-all duration-200 border-0 shrink-0 outline-none"
        title="Show in File Explorer"
      >
        <Home size={12} strokeWidth={2} />
      </button>
    </div>
  )
}

export default FilePathIndicator
