import React, { useState } from 'react'
import { Settings as SettingsIcon, X, Cpu, Database } from 'lucide-react'
import { cn } from '../../lib/utils'
import SettingAIPanel from './SettingAIPanel'
import SettingDBPanel from './SettingDBPanel'
import { useKeyboardShortcuts } from '../../../../utils/useKeyboardShortcuts'

const tabs = [
  { id: 'database', label: 'Database', icon: Database },
  { id: 'ai', label: 'AI', icon: Cpu },
]

const Setting = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('database')

  useKeyboardShortcuts({
    onEscape: () => {
      if (isOpen) {
        onClose()
        return true
      }
      return false
    }
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-[var(--bg-app)] border border-[var(--border-dim)] rounded-lg shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 flex flex-col h-[600px] transition-colors duration-300">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-dim)] shrink-0">
          <div className="flex items-center gap-2">
            <SettingsIcon size={18} className="text-[var(--text-muted)]" />
            <h2 className="text-xs font-black tracking-widest text-[var(--text-main)]">Settings</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors focus:outline-none">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-44 border-r border-[var(--border-dim)] p-3 space-y-1 shrink-0 overflow-y-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 rounded text-xs font-bold tracking-wider focus:outline-none",
                  activeTab === tab.id
                    ? "bg-[var(--bg-active)] text-[var(--text-accent)] border border-[var(--border-subtle)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'database' && <SettingDBPanel />}
            {activeTab === 'ai' && <SettingAIPanel />}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Setting
