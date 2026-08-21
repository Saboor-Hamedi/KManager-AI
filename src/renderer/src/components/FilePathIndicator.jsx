import React from 'react'
import { Home } from 'lucide-react'

const FilePathIndicator = ({ vaultPath, className = '' }) => {
  if (!vaultPath || vaultPath.startsWith('ai-response-')) return null

  return (
    <div className={"flex items-center gap-1.5 ml-1.5 border-l border-white/[0.08] pl-2.5 shrink-0 min-w-0 " + className}>
      <button
        onClick={() => window.api.system.showInFolder(vaultPath)}
        className="flex items-center justify-center p-1 rounded hover:bg-white/[0.1] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0 shrink-0 outline-none"
        title="Show in File Explorer"
      >
        <Home size={11} />
      </button>
      <span className="text-[10px] font-mono text-[var(--text-faint)] truncate max-w-[150px] hidden sm:block" title={vaultPath}>
        {vaultPath.split(/[\\/]/).slice(0, -1).join('\\')}
      </span>
    </div>
  )
}

export default FilePathIndicator
