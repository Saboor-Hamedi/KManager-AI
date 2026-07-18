import React, { useState, useEffect, memo } from 'react'
import { Key, ShieldCheck, Save, Cpu, ChevronDown, Check } from 'lucide-react'
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

  useEffect(() => {
    const loadSettings = async () => {
      const [
        provider,
        deepseekKey, chatgptKey, geminiKey, claudeKey, grokKey,
        model, rag
      ] = await Promise.all([
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
      setApiKeys({
        deepseek: deepseekKey,
        chatgpt: chatgptKey,
        gemini: geminiKey,
        claude: claudeKey,
        grok: grokKey
      })
      setEmbeddingModel(model)
      setEnableRag(rag !== false && rag !== 'false')
    }
    loadSettings()
    setSaved(false)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    await saveSetting('ACTIVE_LLM_PROVIDER', activeProvider)
    await saveSetting('DEEPSEEK_API_KEY', apiKeys.deepseek)
    await saveSetting('CHATGPT_API_KEY', apiKeys.chatgpt)
    await saveSetting('GEMINI_API_KEY', apiKeys.gemini)
    await saveSetting('CLAUDE_API_KEY', apiKeys.claude)
    await saveSetting('GROK_API_KEY', apiKeys.grok)
    
    await saveSetting('EMBEDDING_MODEL', embeddingModel)
    await saveSetting('ENABLE_RAG', enableRag)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleKeyChange = (e) => {
    setApiKeys(prev => ({
      ...prev,
      [activeProvider]: e.target.value
    }))
  }

  const currentProviderObj = PROVIDERS.find(p => p.id === activeProvider) || PROVIDERS[0]

  return (
    <div className="space-y-6">
      
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
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setActiveProvider(p.id)
                      setDropdownOpen(false)
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-left hover:bg-[var(--bg-active)] transition-colors"
                  >
                    <span className={cn(
                      "font-medium",
                      activeProvider === p.id ? "text-[var(--text-main)]" : "text-[var(--text-muted)]"
                    )}>
                      {p.name}
                    </span>
                    {activeProvider === p.id && (
                      <Check size={14} className="text-[var(--text-accent)]" />
                    )}
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
            className="custom-input font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-3.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)]/50">
        <div>
          <h4 className="text-xs font-bold text-[var(--text-main)]">Enable RAG Answer Synthesis</h4>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            When enabled, KManager AI synthesizes a direct answer below retrieved search sources using the active LLM.
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
            "flex items-center justify-center gap-1.5 px-4 py-2 rounded-md text-[11px] font-bold shadow-sm transition-all",
            saved
              ? "bg-[var(--text-accent)] text-white"
              : "bg-[var(--bg-active)] hover:bg-[var(--border-subtle)] text-[var(--text-main)] border border-transparent"
          )}
        >
          {saved ? (
            <>
              <ShieldCheck size={14} />
              Saved
            </>
          ) : (
            <>
              <Save size={14} />
              Save
            </>
          )}
        </button>
      </div>
    </div>
  )
})

export default SettingAIPanel
