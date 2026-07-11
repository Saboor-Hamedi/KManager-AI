import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ChatBot from './components/ChatBot'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')

  return (
    <div className="flex h-screen bg-[#06080a] text-white overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            <div className="animate-in fade-in duration-500">
              <h1 className="text-lg font-black tracking-tight">Dashboard</h1>
              <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-2">Welcome to the dashboard.</p>
            </div>
          </div>
        </main>
      </div>
      <ChatBot />
    </div>
  )
}

export default App
