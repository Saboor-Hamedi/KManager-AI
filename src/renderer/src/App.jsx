import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ChatBot from './components/ChatBot'
import Setting from './components/settings/Setting'
import ThemeModal from './components/theme/ThemeModal'
import { useTheme } from './components/theme/useTheme'

import DashboardMetrics from './components/dashboard/DashboardMetrics'
import DashboardChart from './components/dashboard/DashboardChart'
import DashboardActivityFeed from './components/dashboard/DashboardActivityFeed'
import UsersView from './components/users/UsersView'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isThemeOpen, setIsThemeOpen] = useState(false)

  // Initialize theme
  useTheme()

  return (
    <div className="flex h-screen bg-[#06080a] text-white overflow-hidden font-sans transition-colors duration-300" style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}>
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenTheme={() => setIsThemeOpen(true)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="animate-in fade-in duration-500">
              <h1 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
                {activeTab === 'dashboard' ? 'Dashboard' : 'Users Management'}
              </h1>
              <p className="text-[10px] font-bold tracking-widest mt-2 uppercase" style={{ color: 'var(--text-muted)' }}>
                {activeTab === 'dashboard' ? 'System Overview & Metrics' : 'Manage your users & permissions'}
              </p>
            </div>
            
            {activeTab === 'dashboard' && (
              <div className="animate-in slide-in-from-bottom-4 duration-500 fade-in fill-mode-both" style={{ animationDelay: '100ms' }}>
                <DashboardMetrics />
                <div className="flex flex-col lg:flex-row gap-6">
                  <DashboardChart />
                  <DashboardActivityFeed />
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <UsersView />
            )}
          </div>
        </main>
      </div>
      <ChatBot />
      <Setting isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ThemeModal isOpen={isThemeOpen} onClose={() => setIsThemeOpen(false)} />
    </div>
  )
}

export default App
