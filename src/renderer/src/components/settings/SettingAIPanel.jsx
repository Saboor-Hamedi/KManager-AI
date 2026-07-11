import React, { useState, useEffect, memo } from 'react'
import { Key, ShieldCheck, Save } from 'lucide-react'
import { getSetting, saveSetting } from '../../lib/settings'
import { cn } from '../../lib/utils'

const SettingAIPanel = memo(() => {
  const [apiKey, setApiKey] = useState('')
  const [embeddingModel, setEmbeddingModel] = useState('Xenova/paraphrase-multilingual-MiniLM-L12-v2')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const [key, model] = await Promise.all([
        getSetting('DEEPSEEK_API_KEY', ''),
        getSetting('EMBEDDING_MODEL', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2')
      ])
      setApiKey(key)
      setEmbeddingModel(model)
    }
    loadSettings()
    setSaved(false)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    await saveSetting('DEEPSEEK_API_KEY', apiKey)
    await saveSetting('EMBEDDING_MODEL', embeddingModel)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Key size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">DeepSeek API Key</h3>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-bold mb-3">
          Your API key is stored locally and never sent anywhere except to DeepSeek's API.
        </p>
        <div className="relative w-full">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded text-xs text-[var(--text-main)] px-3 py-2.5 focus:outline-none focus:border-[var(--text-accent)] transition-colors placeholder:text-[var(--text-faint)] font-mono"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Key size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">Embedding Model</h3>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-bold mb-3">
          The Transformers.js model used for generating vector embeddings locally.
        </p>
        <div className="relative w-full">
          <input
            type="text"
            value={embeddingModel}
            onChange={(e) => setEmbeddingModel(e.target.value)}
            placeholder="Xenova/paraphrase-multilingual-MiniLM-L12-v2"
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded text-xs text-[var(--text-main)] px-3 py-2.5 focus:outline-none focus:border-[var(--text-accent)] transition-colors placeholder:text-[var(--text-faint)] font-mono"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 rounded text-[10px] font-black tracking-widest transition-all w-full sm:w-auto",
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
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  )
})

export default SettingAIPanel
