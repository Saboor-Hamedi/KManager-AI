import React, { useState, useEffect, memo, useRef, useCallback } from 'react'
import { Key, Cpu, ChevronDown, Check, ShieldCheck } from 'lucide-react'
import { getSetting, saveSetting } from '../../lib/settings'
import { cn } from '../../lib/utils'

const PROVIDERS = [
  { id: 'deepseek', name: 'DeepSeek', defaultKeyLabel: 'sk-...' },
  { id: 'chatgpt', name: 'ChatGPT (OpenAI)', defaultKeyLabel: 'sk-proj-...' },
  { id: 'gemini', name: 'Gemini (Google)', defaultKeyLabel: 'AIza...' },
  { id: 'claude', name: 'Claude (Anthropic)', defaultKeyLabel: 'sk-ant-...' },
  { id: 'grok', name: 'Grok (xAI)', defaultKeyLabel: 'xai-...' },
]

const SettingAIPanel = memo(() => {
  const [activeProvider, setActiveProvider] = useState('deepseek')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [apiKeys, setApiKeys] = useState({
    deepseek: '',
    chatgpt: '',
    gemini: '',
    claude: '',
    grok: ''
  })
  const [embeddingModel, setEmbeddingModel] = useState('Xenova/paraphrase-multilingual-MiniLM-L12-v2')
  const [enableRag, setEnableRag] = useState(true)
  const [saved, setSaved] = useState(false)
  const keyTimerRef = useRef(null)
  const providerRef = useRef(activeProvider)

  useEffect(() => { providerRef.current = activeProvider }, [activeProvider])

  useEffect(() => {
    const loadSettings = async () => {
      const [provider, deepseekKey, chatgptKey, geminiKey, claudeKey, grokKey, model, rag] = await Promise.all([
        getSetting('ACTIVE_LLM_PROVIDER', 'deepseek'),
        getSetting('DEEPSEEK_API_KEY', ''),
        getSetting('CHATGPT_API_KEY', ''),
        getSetting('GEMINI_API_KEY', ''),
        getSetting('CLAUDE_API_KEY', ''),
        getSetting('GROK_API_KEY', ''),
        getSetting('EMBEDDING_MODEL', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'),
        getSetting('ENABLE_RAG', true)
      ])
      setActiveProvider(provider)
      setApiKeys({ deepseek: deepseekKey, chatgpt: chatgptKey, gemini: geminiKey, claude: claudeKey, grok: grokKey })
      setEmbeddingModel(model)
      setEnableRag(rag !== false && rag !== 'false')
    }
    loadSettings()
  }, [])

  const flashSaved = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [])

  const persistAll = useCallback(async (overrides = {}) => {
    await saveSetting('ACTIVE_LLM_PROVIDER', overrides.provider ?? activeProvider)
    await saveSetting('DEEPSEEK_API_KEY', overrides.deepseek ?? apiKeys.deepseek)
    await saveSetting('CHATGPT_API_KEY', overrides.chatgpt ?? apiKeys.chatgpt)
    await saveSetting('GEMINI_API_KEY', overrides.gemini ?? apiKeys.gemini)
    await saveSetting('CLAUDE_API_KEY', overrides.claude ?? apiKeys.claude)
    await saveSetting('GROK_API_KEY', overrides.grok ?? apiKeys.grok)
    await saveSetting('EMBEDDING_MODEL', overrides.model ?? embeddingModel)
    await saveSetting('ENABLE_RAG', overrides.rag ?? enableRag)
    flashSaved()
  }, [activeProvider, apiKeys, embeddingModel, enableRag, flashSaved])

  const handleProviderChange = async (id) => {
    setActiveProvider(id)
    await persistAll({ provider: id })
  }

  const handleKeyChange = (e) => {
    const val = e.target.value
    const prov = providerRef.current
    setApiKeys(prev => ({ ...prev, [prov]: val }))
    if (keyTimerRef.current) clearTimeout(keyTimerRef.current)
    keyTimerRef.current = setTimeout(async () => {
      await saveSetting(`${prov.toUpperCase()}_API_KEY`, val)
      flashSaved()
    }, 400)
  }

  const handleModelChange = async (val) => {
    setEmbeddingModel(val)
    await saveSetting('EMBEDDING_MODEL', val)
    flashSaved()
  }

  const handleRagToggle = async (val) => {
    setEnableRag(val)
    await saveSetting('ENABLE_RAG', val)
    flashSaved()
  }

  const currentProviderObj = PROVIDERS.find(p => p.id === activeProvider) || PROVIDERS[0]

  return (
    <div className="space-y-6 pb-6">
      {/* Provider Selection */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">Active AI Provider</h3>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-bold mb-3">
          Select which cloud LLM will power the chat and RAG synthesis.
        </p>
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
            className="custom-dropdown-btn"
          >
            <span>{currentProviderObj.name}</span>
            <ChevronDown size={14} className={cn("text-[var(--text-muted)] transition-transform duration-200", dropdownOpen && "rotate-180")} />
          </button>
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-1.5 w-full bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-md shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="py-1">
                {PROVIDERS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); handleProviderChange(p.id) }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-left hover:bg-[var(--bg-active)] transition-colors"
                  >
                    <span className={cn("font-medium", activeProvider === p.id ? "text-[var(--text-main)]" : "text-[var(--text-muted)]")}>{p.name}</span>
                    {activeProvider === p.id && <Check size={14} className="text-[var(--text-accent)]" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic API Key Field */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Key size={16} className="text-[var(--text-accent)]" />
          <h3 className="text-xs font-bold text-[var(--text-main)] tracking-wider">{currentProviderObj.name} API Key</h3>
          {saved && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold animate-in fade-in duration-150">
              <ShieldCheck size={12} />
              Saved
            </span>
          )}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed font-bold mb-3">
          Your API key is stored locally and only sent directly to the provider's API.
        </p>
        <div className="relative w-full">
          <input
            type="password"
            value={apiKeys[activeProvider]}
            onChange={handleKeyChange}
            placeholder={currentProviderObj.defaultKeyLabel}
            className="custom-input font-mono"
          />
        </div>
      </div>

      {/* Embedding Model */}
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
            onChange={(e) => handleModelChange(e.target.value)}
            placeholder="Xenova/paraphrase-multilingual-MiniLM-L12-v2"
            className="custom-input font-mono"
          />
        </div>
      </div>

      {/* RAG Toggle */}
      <div className="flex items-center justify-between p-3.5 rounded-[6px] border border-[var(--border-subtle)] bg-white/[0.02]">
        <div>
          <h4 className="text-[11px] font-bold text-[var(--text-main)] tracking-tight">Enable RAG Answer Synthesis</h4>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 max-w-[80%] leading-relaxed">
            When enabled, KManager AI synthesizes a direct answer below retrieved search sources using the active LLM.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enableRag}
            onChange={(e) => handleRagToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-8 h-4 bg-[var(--border-dim)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[var(--text-accent)]" />
        </label>
      </div>

    </div>
  )
})

export default SettingAIPanel
