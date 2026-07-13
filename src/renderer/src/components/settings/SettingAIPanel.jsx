import React, { useState, useEffect, memo } from 'react'
import { Key, ShieldCheck, Save } from 'lucide-react'
import { getSetting, saveSetting } from '../../lib/settings'
import { cn } from '../../lib/utils'

const SettingAIPanel = memo(() => {
  const [apiKey, setApiKey] = useState('')
  const [embeddingModel, setEmbeddingModel] = useState('Xenova/paraphrase-multilingual-MiniLM-L12-v2')
  const [enableRag, setEnableRag] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      const [key, model, rag] = await Promise.all([
        getSetting('DEEPSEEK_API_KEY', ''),
        getSetting('EMBEDDING_MODEL', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'),
        getSetting('ENABLE_RAG', true)
      ])
      setApiKey(key)
      setEmbeddingModel(model)
      setEnableRag(rag !== false && rag !== 'false')
    }
    loadSettings()
    setSaved(false)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    await saveSetting('DEEPSEEK_API_KEY', apiKey)
    await saveSetting('EMBEDDING_MODEL', embeddingModel)
    await saveSetting('ENABLE_RAG', enableRag)
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
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded text-xs text-[var(--text-main)] px-3 py-2.5 focus:outline-none transition-colors placeholder:text-[var(--text-faint)] font-mono"
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
            className="w-full bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded text-xs text-[var(--text-main)] px-3 py-2.5 focus:outline-none transition-colors placeholder:text-[var(--text-faint)] font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]/50">
        <div>
          <h4 className="text-xs font-bold text-[var(--text-main)]">Enable RAG Answer Synthesis</h4>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            When enabled, KManager AI synthesizes a direct answer below retrieved search sources using DeepSeek.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enableRag}
            onChange={(e) => setEnableRag(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-[var(--border-dim)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[var(--text-accent)]" />
        </label>
      </div>

      <div className="pt-2">
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all",
            saved
              ? "bg-[var(--icon-secondary)]/10 text-[var(--icon-secondary)]"
              : "bg-white/5 hover:bg-white/10 text-[var(--text-muted)] hover:text-[var(--text-main)]"
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
