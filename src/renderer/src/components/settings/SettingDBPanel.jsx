import React, { useState, useEffect, memo } from 'react'
import { Database, Server, FileKey, Key, User, Wifi, WifiOff, Loader2 } from 'lucide-react'
import { getSetting, saveSetting } from '../../lib/settings'
import { cn } from '../../lib/utils'

const SettingDBPanel = memo(() => {
  const [config, setConfig] = useState({
    host: 'localhost',
    port: '5432',
    database: '',
    user: '',
    password: ''
  })
  const [status, setStatus] = useState(null)
  const [testing, setTesting] = useState(false)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      const [host, port, database, user, password] = await Promise.all([
        getSetting('DB_HOST', 'localhost'),
        getSetting('DB_PORT', '5432'),
        getSetting('DB_DATABASE', ''),
        getSetting('DB_USER', ''),
        getSetting('DB_PASSWORD', '')
      ])
      setConfig({ host, port, database, user, password })
      checkStatus()
    }
    loadConfig()

    // Poll status to catch background auto-connect
    const intervalId = setInterval(checkStatus, 2000)
    return () => clearInterval(intervalId)
  }, [])

  const checkStatus = async () => {
    try {
      const res = await window.electron.ipcRenderer.invoke('db:status')
      setConnected(res.connected)
    } catch {
      setConnected(false)
    }
  }

  const update = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleTest = async () => {
    setTesting(true)
    setStatus(null)
    await saveSetting('DB_HOST', config.host)
    await saveSetting('DB_PORT', config.port)
    await saveSetting('DB_DATABASE', config.database)
    await saveSetting('DB_USER', config.user)
    await saveSetting('DB_PASSWORD', config.password)
    try {
      const res = await window.electron.ipcRenderer.invoke('db:test-connection', {
        ...config,
        port: parseInt(config.port, 10) || 5432
      })
      setStatus(res)
    } catch (err) {
      setStatus({ success: false, message: err.message })
    } finally {
      setTesting(false)
    }
  }

  const handleConnect = async () => {
    setStatus(null)
    await saveSetting('DB_HOST', config.host)
    await saveSetting('DB_PORT', config.port)
    await saveSetting('DB_DATABASE', config.database)
    await saveSetting('DB_USER', config.user)
    await saveSetting('DB_PASSWORD', config.password)
    try {
      const res = await window.electron.ipcRenderer.invoke('db:connect', {
        ...config,
        port: parseInt(config.port, 10) || 5432
      })
      setStatus(res)
      setConnected(res.success)
    } catch (err) {
      setStatus({ success: false, message: err.message })
    }
  }

  const handleDisconnect = async () => {
    await window.electron.ipcRenderer.invoke('db:disconnect')
    setConnected(false)
    setStatus(null)
  }

  const handleInitSchema = async () => {
    setTesting(true)
    setStatus(null)
    
    // Auto-connect to the newly typed database first so schema runs on the correct one
    await handleConnect()

    try {
      const res = await window.electron.ipcRenderer.invoke('db:init-schema')
      setStatus(res)
    } catch (err) {
      setStatus({ success: false, message: err.message })
    } finally {
      setTesting(false)
    }
  }

  const fields = [
    { key: 'host', label: 'Host', icon: Server, placeholder: 'localhost' },
    { key: 'port', label: 'Port', icon: Server, placeholder: '5432' },
    { key: 'database', label: 'Database', icon: Database, placeholder: 'mydb' },
    { key: 'user', label: 'Username', icon: User, placeholder: 'postgres' },
    { key: 'password', label: 'Password', icon: Key, placeholder: '••••••••', type: 'password' }
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">PostgreSQL Connection</h3>
        </div>
        <span className={cn(
          "flex items-center gap-1.5 text-[9px] font-bold tracking-wider px-2 py-1 rounded border",
          connected
            ? "text-[var(--icon-secondary)] border-[var(--icon-secondary)] bg-[var(--icon-secondary)]/10"
            : "text-[var(--text-muted)] border-[var(--border-dim)] bg-[var(--bg-active)]"
        )}>
          {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      <div className="space-y-3">
        {fields.map(({ key, label, icon: Icon, placeholder, type }) => (
          <div key={key}>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] tracking-wider mb-1.5">
              {label}
            </label>
            <div className="relative">
              <Icon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]" />
              <input
                type={type || 'text'}
                value={config[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded text-xs text-[var(--text-main)] pl-8 pr-3 py-2 focus:outline-none transition-colors placeholder:text-[var(--text-faint)] font-mono"
              />
            </div>
          </div>
        ))}
      </div>

      {status && (
        <div className={cn(
          "text-[10px] font-bold px-3 py-2 rounded border",
          status.success
            ? "text-[var(--icon-secondary)] border-[var(--icon-secondary)] bg-[var(--icon-secondary)]/10"
            : "text-[var(--icon-danger)] border-[var(--icon-danger)] bg-[var(--icon-danger)]/10"
        )}>
          {status.message}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all disabled:opacity-50"
        >
          {testing ? <Loader2 size={11} className="animate-spin" /> : <FileKey size={11} />}
          Test
        </button>

        {connected ? (
          <div className="flex-1 flex gap-2">
            <button
              onClick={handleInitSchema}
              disabled={testing}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-[var(--icon-secondary)]/10 text-[var(--icon-secondary)] hover:bg-[var(--icon-secondary)]/20 transition-all disabled:opacity-50"
            >
              {testing ? <Loader2 size={11} className="animate-spin" /> : <Database size={11} />}
              Init Schema
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
            >
              <WifiOff size={11} />
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold bg-[var(--text-accent)] text-white hover:opacity-90 shadow-lg shadow-[var(--text-accent)]/20 transition-all"
          >
            <Wifi size={11} />
            Connect
          </button>
        )}
      </div>
    </div>
  )
})

export default SettingDBPanel
