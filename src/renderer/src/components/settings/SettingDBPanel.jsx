import React, { useState, useEffect, useRef, memo } from 'react'
import { Database, Server, FileKey, Key, User, Wifi, WifiOff, Loader2, Eye, EyeOff } from 'lucide-react'
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
  const [errors, setErrors] = useState({})
  const [showPassword, setShowPassword] = useState(false)
  const [status, setStatus] = useState(null)
  const [loadingAction, setLoadingAction] = useState(null)
  const [connected, setConnected] = useState(false)
  
  const hostInputRef = useRef(null)

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

    const intervalId = setInterval(checkStatus, 2000)
    
    // Auto-focus first input after animation
    const focusTimer = setTimeout(() => {
      if (hostInputRef.current) hostInputRef.current.focus()
    }, 250)

    return () => {
      clearInterval(intervalId)
      clearTimeout(focusTimer)
    }
  }, [])

  // Auto-clear success status after 3 seconds
  useEffect(() => {
    if (status && status.success) {
      const timer = setTimeout(() => setStatus(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [status])

  const checkStatus = async () => {
    try {
      const res = await window.electron.ipcRenderer.invoke('db:status')
      setConnected(res.connected)
    } catch {
      setConnected(false)
    }
  }

  const validateField = (key, value) => {
    if (!value) return 'Required field'
    if (key === 'port') {
      if (!/^\d+$/.test(value)) return 'Port must be a number'
      const p = parseInt(value, 10)
      if (p < 1 || p > 65535) return 'Invalid port range'
    }
    return null
  }

  const update = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: validateField(key, value) }))
  }

  const validateAll = () => {
    const newErrors = {}
    let isValid = true
    Object.keys(config).forEach(key => {
      const err = validateField(key, config[key])
      if (err) {
        newErrors[key] = err
        isValid = false
      }
    })
    setErrors(newErrors)
    return isValid
  }

  const handleTest = async () => {
    if (!validateAll()) return
    setLoadingAction('test')
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
      setLoadingAction(null)
    }
  }

  const handleConnect = async () => {
    if (!validateAll()) return
    setLoadingAction('connect')
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
    } finally {
      setLoadingAction(null)
    }
  }

  const handleDisconnect = async () => {
    await window.electron.ipcRenderer.invoke('db:disconnect')
    setConnected(false)
    setStatus({ success: true, message: 'Disconnected by User' })
  }

  const handleInitSchema = async () => {
    if (!validateAll()) return
    setLoadingAction('init')
    setStatus(null)
    
    // Auto-connect to the newly typed database first so schema runs on the correct one
    await handleConnect()
    setLoadingAction('init') // re-assert after handleConnect clears it

    try {
      const res = await window.electron.ipcRenderer.invoke('db:init-schema')
      setStatus(res)
    } catch (err) {
      setStatus({ success: false, message: err.message })
    } finally {
      setLoadingAction(null)
    }
  }

  const fields = [
    { key: 'host', label: 'Host', icon: Server, placeholder: 'localhost', help: 'Usually localhost if running on this computer' },
    { key: 'port', label: 'Port', icon: Server, placeholder: '5432', help: 'Default PostgreSQL port is 5432' },
    { key: 'database', label: 'Database', icon: Database, placeholder: 'mydb', help: 'The name of the database you created' },
    { key: 'user', label: 'Username', icon: User, placeholder: 'postgres', help: 'Your PostgreSQL username' },
    { key: 'password', label: 'Password', icon: Key, placeholder: '••••••••', type: 'password', help: 'Your PostgreSQL password' }
  ]

  const getFriendlyError = (msg) => {
    if (!msg) return ''
    if (msg.includes('Disconnected by User')) return 'Disconnected by User'
    if (msg.includes('ECONNREFUSED')) return 'Database is not running on this host/port. Please ensure your database server is started.'
    if (msg.includes('password authentication failed')) return 'Incorrect username or password. Please check your credentials.'
    if (msg.includes('does not exist') && msg.includes('database')) return 'Database not found. Please ensure the database exists.'
    return msg
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Database size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-[13px] font-bold text-[var(--text-main)] tracking-wider">PostgreSQL Connection</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className={cn(
            "flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest px-2.5 py-1.5 rounded-md transition-all duration-300",
            loadingAction 
              ? "text-[var(--text-main)] bg-[var(--bg-active)] animate-pulse shadow-sm"
              : connected
                ? "text-[var(--icon-secondary)] bg-[var(--icon-secondary)]/10 shadow-[0_0_8px_rgba(46,160,67,0.1)]"
                : "text-[var(--text-muted)] bg-[var(--bg-active)]"
          )}>
            {loadingAction ? <Loader2 size={10} className="animate-spin" /> : connected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {loadingAction ? 'Testing...' : connected ? 'Connected' : 'Disconnected'}
          </span>
          {!connected && status && !status.success && (
            <span className="text-[9.5px] text-[var(--icon-danger)] mt-1.5 max-w-[180px] truncate font-medium" title={getFriendlyError(status.message)}>
              {getFriendlyError(status.message)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {fields.map(({ key, label, icon: Icon, placeholder, type, help }) => (
          <div key={key}>
            <div className="mb-1.5">
              <label className="text-[11.5px] font-bold text-[var(--text-muted)] tracking-wider uppercase">
                {label}
              </label>
            </div>
            <div className="relative">
              <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] opacity-80" />
              <input
                ref={key === 'host' ? hostInputRef : null}
                type={type === 'password' ? (showPassword ? 'text' : 'password') : (type || 'text')}
                value={config[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                tabIndex={0}
                className={cn(
                  "custom-input pl-9 pr-10 py-2.5 font-mono text-[13px] transition-all",
                  errors[key] ? "border-[var(--icon-danger)] focus:border-[var(--icon-danger)] bg-[var(--icon-danger)]/5" : ""
                )}
              />
              {type === 'password' && (
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)] hover:text-[var(--text-main)] transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              )}
            </div>
            <div className="flex items-start justify-between mt-1.5 min-h-[14px]">
              <p className="text-[10px] text-[var(--text-faint)] leading-tight">{help}</p>
              {errors[key] && (
                <span className="text-[10px] font-medium text-[var(--icon-danger)] animate-in fade-in slide-in-from-top-1">
                  {errors[key]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2.5 pt-2">
        <button
          onClick={handleTest}
          disabled={loadingAction !== null}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[12px] font-semibold bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] border border-white/10 text-[var(--text-main)] transition-all disabled:opacity-50"
        >
          {loadingAction === 'test' ? <Loader2 size={13} className="animate-spin text-[var(--text-accent)]" /> : <FileKey size={13} className="text-[var(--text-muted)]" />}
          {loadingAction === 'test' ? 'Testing...' : 'Test Connection'}
        </button>

        {connected ? (
          <>
            <button
              onClick={handleInitSchema}
              disabled={loadingAction !== null}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[12px] font-semibold bg-[#2ea043]/20 hover:bg-[#2ea043]/30 border border-[#2ea043]/40 text-[#3fb950] transition-all disabled:opacity-50"
            >
              {loadingAction === 'init' ? <Loader2 size={13} className="animate-spin" /> : <Database size={13} />}
              {loadingAction === 'init' ? 'Initializing...' : 'Re-init Schema'}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={loadingAction !== null}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[12px] font-semibold bg-[#f85149]/10 hover:bg-[#f85149]/20 border border-[#f85149]/30 text-[#f85149] transition-all disabled:opacity-50"
            >
              <WifiOff size={13} />
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={loadingAction !== null}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-[12px] font-semibold bg-[var(--bg-panel)] hover:bg-[var(--bg-active)] border border-white/10 text-[var(--text-main)] transition-all disabled:opacity-50"
          >
            {loadingAction === 'connect' ? <Loader2 size={13} className="animate-spin text-[var(--text-accent)]" /> : <Wifi size={13} className="text-[var(--text-muted)]" />}
            {loadingAction === 'connect' ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>

      {status && status.message !== 'Disconnected by User' && (
        <div className={cn(
          "text-[11.5px] font-medium px-3.5 py-2.5 rounded-md flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200",
          status.success
            ? "text-[var(--icon-secondary)] bg-[var(--icon-secondary)]/10 border border-[var(--icon-secondary)]/20"
            : "text-[var(--icon-danger)] bg-[var(--icon-danger)]/10 border border-[var(--icon-danger)]/20"
        )}>
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            status.success ? "bg-[var(--icon-secondary)]" : "bg-[var(--icon-danger)]"
          )} />
          {getFriendlyError(status.message)}
        </div>
      )}
    </div>
  )
})

export default SettingDBPanel
