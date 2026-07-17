import { useState, useCallback, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import GlobalTitleBar from './components/GlobalTitleBar'
import ChatBot from './components/ChatBot'
import Setting from './components/settings/Setting'
import ThemeModal from './components/theme/ThemeModal'
import { useTheme } from './components/theme/useTheme'
import { useKeyboardShortcuts } from '../../utils/useKeyboardShortcuts'

import DashboardSearch from './components/search/DashboardSearch'
import AnalyticsView from './components/analytics/AnalyticsView'
import UsersView from './components/users/UsersView'
import Documentation from './components/Documentation'
import GlobalError from './components/GlobalError'

function App() {
  const [activeTab, setActiveTab] = useState('search')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [isDocsOpen, setIsDocsOpen] = useState(false)
  const [searchFocusTrigger, setSearchFocusTrigger] = useState(0)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    return saved ? JSON.parse(saved) : false
  })

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebarCollapsed', JSON.stringify(next))
      return next
    })
  }, [])

  // Initialize theme
  useTheme()

  useEffect(() => {
    const handleOpenSettings = (e) => {
      setIsSettingsOpen(true)
      // Custom tab handling could go here if needed
      // e.g. e.detail.tab === 'database' -> pass to Setting.jsx
    }
    window.addEventListener('open-settings', handleOpenSettings)
    return () => window.removeEventListener('open-settings', handleOpenSettings)
  }, [])

  // Auto-connect database
  useEffect(() => {
    const connectDB = async () => {
      const host = await window.api.config.get('DB_HOST', 'localhost')
      const port = await window.api.config.get('DB_PORT', '5432')
      const database = await window.api.config.get('DB_DATABASE', '')
      const user = await window.api.config.get('DB_USER', '')
      const password = await window.api.config.get('DB_PASSWORD', '')

      if (database && user) {
        await window.api.db.connect({
          host,
          port: parseInt(port, 10) || 5432,
          database,
          user,
          password
        })
      }
    }
    connectDB()
  }, [])

  // Global Keyboard Shortcuts
  useKeyboardShortcuts({
    onTogglePalette: useCallback(() => {
      setActiveTab('search')
      setSearchFocusTrigger(prev => prev + 1)
    }, []),
    onToggleSidebar: toggleSidebar,
    onToggleTheme: useCallback(() => setIsThemeOpen(prev => !prev), []),
    onToggleSettings: useCallback(() => setIsSettingsOpen(prev => !prev), []),
    onToggleDocs: useCallback(() => setIsDocsOpen(prev => !prev), []),
  })

  return (
    <div className="flex flex-col h-screen bg-[#06080a] text-white overflow-hidden font-sans transition-colors duration-300" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <GlobalError>
        <GlobalTitleBar />
      </GlobalError>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <GlobalError>
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            onOpenTheme={() => setIsThemeOpen(true)}
            onOpenDocs={() => setIsDocsOpen(true)}
            collapsed={sidebarCollapsed}
            toggleCollapsed={toggleSidebar}
          />
        </GlobalError>
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <GlobalError>
            <Header toggleSidebar={toggleSidebar} collapsed={sidebarCollapsed} />
          </GlobalError>

        {/* ── Search view — always mounted so state (history, query) survives tab switches ── */}
        <div className={`flex-1 min-h-0 overflow-hidden ${activeTab === 'search' ? 'flex' : 'hidden'}`}>
          <GlobalError>
            <DashboardSearch
              focusTrigger={searchFocusTrigger}
              onResultSelect={async (item) => {
                if (item.id === 'nav-1') setActiveTab('analytics')
                else if (item.id === 'nav-2') setActiveTab('users')
                else if (item.id === 'nav-3') setIsSettingsOpen(true)
                else if (item.id === 'action-2') setIsThemeOpen(true)
                else if (item.vault_path) {
                  await window.api.system.openFile(item.vault_path)
                }
              }}
            />
          </GlobalError>
        </div>

        {/* ── Other views — lazy-conditional, padding/scroll handled here ── */}
        {activeTab !== 'search' && (
          <main className="flex-1 min-h-0 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-6 flex flex-col h-full">
              <div className="animate-in fade-in duration-300 shrink-0">
                <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                  {activeTab === 'analytics' ? 'Analytics' : 'Users Management'}
                </h1>
                <p className="text-[10px] font-bold tracking-widest mt-2 uppercase" style={{ color: 'var(--text-muted)' }}>
                  {activeTab === 'analytics' ? 'System Overview & Metrics' : 'Manage your users & permissions'}
                </p>
              </div>

              <GlobalError>
                {activeTab === 'analytics' && <AnalyticsView />}
              </GlobalError>
              
              <GlobalError>
                {activeTab === 'users' && <UsersView />}
              </GlobalError>
            </div>
          </main>
        )}
        </div>
      </div>
      <GlobalError><ChatBot /></GlobalError>
      <GlobalError><Setting isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} /></GlobalError>
      <GlobalError><ThemeModal isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} /></GlobalError>
      <GlobalError><Documentation isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} /></GlobalError>
    </div>
  )
}

export default App
