import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import GlobalTitleBar from './components/GlobalTitleBar'
import GlobalError from './components/GlobalError'
import Toast from './components/ui/Toast'
import DashboardSearch from './components/search/DashboardSearch'
import SpotLite from './components/spotlite/SpotLite'
import PulseLoader from './components/PulseLoader'
import { useTheme } from './components/theme/useTheme'
import { useKeyboardShortcuts } from '../../utils/useKeyboardShortcuts'

const ChatBot = lazy(() => import('./components/ChatBot'))
const Setting = lazy(() => import('./components/settings/Setting'))
const ThemeModal = lazy(() => import('./components/theme/ThemeModal'))
const Documentation = lazy(() => import('./components/Documentation'))
const AnalyticsModal = lazy(() => import('./components/analytics/AnalyticsModal'))
const MyLibrary = lazy(() => import('./components/library/MyLibrary'))

function App() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('activeTab') || 'search'
  })
  
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab)
  }, [activeTab])

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)
  const [isDocsOpen, setIsDocsOpen] = useState(false)
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false)
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
    }
    const handleFillSearch = () => {
      setActiveTab('search')
    }
    window.addEventListener('open-settings', handleOpenSettings)
    window.addEventListener('fill-search', handleFillSearch)
    return () => {
      window.removeEventListener('open-settings', handleOpenSettings)
      window.removeEventListener('fill-search', handleFillSearch)
    }
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
    onToggleLibrary: useCallback(() => setActiveTab('library'), []),
    onToggleSidebar: toggleSidebar,
    onToggleTheme: useCallback(() => setIsThemeOpen(prev => !prev), []),
    onToggleSettings: useCallback(() => setIsSettingsOpen(prev => !prev), []),
    onToggleDocs: useCallback(() => setIsDocsOpen(prev => !prev), []),
  })

  return (
    <div className="flex flex-col h-screen bg-[#06080a] text-white overflow-hidden font-sans transition-colors duration-300" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <GlobalError>
        <GlobalTitleBar />
        <Toast />
      </GlobalError>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        <GlobalError>
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            onOpenTheme={() => setIsThemeOpen(true)}
            onOpenDocs={() => setIsDocsOpen(true)}
            onOpenAnalytics={() => setIsAnalyticsOpen(true)}
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
                if (item.id === 'nav-1') setIsAnalyticsOpen(true)
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
        {activeTab === 'library' && (
          <GlobalError>
            <Suspense fallback={<div className="flex-1 flex items-center justify-center"><PulseLoader text="Loading Library..." /></div>}>
              <MyLibrary />
            </Suspense>
          </GlobalError>
        )}
        {activeTab !== 'search' && activeTab !== 'library' && (
          <main className="flex-1 min-h-0 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-6xl mx-auto space-y-6 flex flex-col h-full">
              {activeTab === 'analytics' && (
                <div className="animate-in fade-in duration-300 shrink-0">
                  <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                    Analytics
                  </h1>
                  <p className="text-[10px] font-bold tracking-widest mt-2 uppercase" style={{ color: 'var(--text-muted)' }}>
                    Performance Overview
                  </p>
                </div>
              )}
            </div>
          </main>
        )}
        </div>
      </div>
      <GlobalError>
        <Suspense fallback={null}>
          <ChatBot />
        </Suspense>
      </GlobalError>
      {isSettingsOpen && (
        <GlobalError>
          <Suspense fallback={null}>
            <Setting isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          </Suspense>
        </GlobalError>
      )}
      {isThemeOpen && (
        <GlobalError>
          <Suspense fallback={null}>
            <ThemeModal isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} />
          </Suspense>
        </GlobalError>
      )}
      {isDocsOpen && (
        <GlobalError>
          <Suspense fallback={null}>
            <Documentation isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
          </Suspense>
        </GlobalError>
      )}
      {isAnalyticsOpen && (
        <GlobalError>
          <Suspense fallback={null}>
            <AnalyticsModal isOpen={isAnalyticsOpen} onClose={() => setIsAnalyticsOpen(false)} />
          </Suspense>
        </GlobalError>
      )}
      <SpotLite />
    </div>
  )
}

export default App
