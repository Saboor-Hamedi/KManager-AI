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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-[10000] animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-[var(--bg-app)] rounded-[5px] shadow-[var(--shadow-modal)] flex flex-col overflow-hidden w-[90vw] h-[85vh] max-w-[1200px] animate-in zoom-in-95 duration-200" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-[26px] bg-[var(--bg-panel)] flex items-center justify-between shrink-0 select-none border-b border-white/[0.04]">
          <div className="flex items-center gap-1.5 px-2.5 h-full">
            <SettingsIcon size={13} className="text-[var(--text-accent)] shrink-0" />
            <h2 className="text-[11px] font-semibold text-[var(--text-main)] tracking-tight">Settings & Knowledge Hub</h2>
          </div>
          <div className="flex-1" />
          <button onClick={onClose} className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center border-0" title="Close (Esc)">
            <X size={13} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-56 bg-[var(--bg-panel)]/30 border-r border-[var(--border-dim)] flex flex-col transition-all duration-300 ease-in-out overflow-hidden shrink-0">
            <div className="w-56 py-4 space-y-5">
              <div className="space-y-1.5">
                <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest px-5 pb-1.5">Configuration</h3>
                <div className="flex flex-col">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-5 py-2 transition-all duration-200 group relative outline-none",
                        activeTab === tab.id
                          ? "bg-white/[0.03] text-[var(--text-main)] border-l-2 border-[var(--text-accent)]"
                          : "text-[var(--text-muted)] hover:bg-white/[0.03] hover:text-[var(--text-main)] border-l-2 border-transparent"
                      )}
                    >
                      <tab.icon size={15} className={cn("shrink-0", activeTab === tab.id ? "text-[var(--text-accent)]" : "group-hover:text-[var(--text-main)]")} />
                      <span className="text-[12px] font-medium tracking-tight truncate">{tab.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
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
