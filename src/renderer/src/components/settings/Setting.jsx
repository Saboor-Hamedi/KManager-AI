import React, { useState } from 'react'
import { Settings as SettingsIcon, X, Cpu, Database, Server, BarChart3, UploadCloud, Package } from 'lucide-react'
import { cn } from '../../lib/utils'
import SettingAIPanel from './SettingAIPanel'
import SettingDBPanel from './SettingDBPanel'
import SettingDataPanel from './SettingDataPanel'
import SettingDBPropertiesPanel from './SettingDBPropertiesPanel'
import SettingUpdate from './SettingUpdate'
import { useKeyboardShortcuts } from '../../../../utils/useKeyboardShortcuts'

const tabs = [
  { id: 'system', label: 'System', icon: Package },
  { id: 'database', label: 'Connection', icon: Server },
  { id: 'db_properties', label: 'DB Properties', icon: BarChart3 },
  { id: 'data', label: 'Data Ingestion', icon: UploadCloud },
  { id: 'ai', label: 'AI', icon: Cpu },
]

const Setting = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('system')

  React.useEffect(() => {
    const handleOpenSettings = (e) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab)
      }
    }
    window.addEventListener('open-settings', handleOpenSettings)
    return () => window.removeEventListener('open-settings', handleOpenSettings)
  }, [])

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

  const renderTab = (id, Component) => (
    <div key={id} className="h-full w-full" style={{ display: activeTab === id ? 'block' : 'none' }}>
      <Component />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-app)] border border-[var(--border-dim)] rounded-[5px] shadow-2xl w-full max-w-4xl h-[600px] max-h-[85vh] animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden transition-all duration-300">
        <div className="h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center shrink-0 select-none">
          <div className="flex items-center gap-2 px-3">
            <SettingsIcon size={14} className="text-[var(--text-accent)]" />
            <span className="text-xs font-semibold text-[var(--text-main)]">Settings & Knowledge Hub</span>
          </div>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="h-full px-4 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center text-sm shrink-0"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-44 border-r border-[var(--border-dim)] p-2 space-y-1 shrink-0 overflow-y-auto bg-[#131313]/50">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 rounded-md text-xs font-bold tracking-wide focus:outline-none outline-none border-0 transition-all duration-150",
                  activeTab === tab.id
                    ? "bg-[var(--bg-active)] text-[var(--text-accent)] shadow-none"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]/60"
                )}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 p-7 overflow-y-auto custom-scrollbar bg-[var(--bg-app)]">
            {renderTab('system', SettingUpdate)}
            {renderTab('database', SettingDBPanel)}
            {renderTab('db_properties', SettingDBPropertiesPanel)}
            {renderTab('data', SettingDataPanel)}
            {renderTab('ai', SettingAIPanel)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Setting
