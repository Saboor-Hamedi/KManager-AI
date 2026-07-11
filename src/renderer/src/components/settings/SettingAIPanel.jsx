import React, { useState, useEffect, memo } from 'react'
import { Key, ShieldCheck, Save } from 'lucide-react'
import { getSetting, saveSetting } from '../../lib/settings'
import { cn } from '../../lib/utils'

const SettingAIPanel = memo(() => {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const key = await getSetting('DEEPSEEK_API_KEY', '')
      setApiKey(key)
    }
    loadSettings()
    setSaved(false)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    await saveSetting('DEEPSEEK_API_KEY', apiKey)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Key size={16} className="text-[var(--text-accent)]" />
        <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">DeepSeek API Key</h3>
      </div>

      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-bold">
        Your API key is stored locally and never sent anywhere except to DeepSeek's API.
      </p>

      <form onSubmit={handleSave} className="space-y-2">
        <label className="block text-[10px] font-bold text-[var(--text-muted)] tracking-wider">
          Access Token
        </label>
        <div className="relative w-full">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded text-xs text-[var(--text-main)] pl-3 pr-20 py-2.5 focus:outline-none focus:border-[var(--text-accent)] transition-colors placeholder:text-[var(--text-faint)] font-mono"
          />

          <button
            type="submit"
            className={cn(
              "absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-black tracking-widest whitespace-nowrap transition-all",
              saved
                ? "bg-[var(--icon-secondary)] text-[var(--bg-app)] shadow-[0_0_10px_var(--bg-active)]"
                : "bg-[var(--text-accent)] hover:opacity-90 text-[var(--bg-app)] shadow-[0_0_10px_var(--bg-active)]"
            )}
          >
            {saved ? (
              <>
                <ShieldCheck size={12} />
                Saved
              </>
            ) : (
              <>
                <Save size={12} />
                Save
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
})

export default SettingAIPanel
