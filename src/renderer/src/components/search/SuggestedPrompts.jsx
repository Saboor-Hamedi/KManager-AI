import React, { useState, useEffect, memo } from 'react'
import { ArrowRight } from 'lucide-react'
import { getLocalSuggestedPrompts, fetchDynamicPrompts } from '../../lib/suggestedPrompts'
import { getSetting } from '../../lib/settings'

const SuggestedPrompts = memo(({ msg, onSelectPrompt }) => {
  const [prompts, setPrompts] = useState([])
  const [isLoadingDynamic, setIsLoadingDynamic] = useState(false)

  useEffect(() => {
    if (!msg || msg.ragStatus !== 'done' || !msg.ragAnswer) {
      return
    }

    // 1. Generate immediate local suggestions right away
    const local = getLocalSuggestedPrompts(msg.query, msg.results || [], msg.ragAnswer)
    setPrompts(local)

    // 2. Fetch dynamic tailored suggestions in the background if API key is present
    let isMounted = true
    getSetting('DEEPSEEK_API_KEY', '').then(apiKey => {
      if (!apiKey || apiKey === 'your_deepseek_api_key_here') return
      setIsLoadingDynamic(true)
      fetchDynamicPrompts(msg.query, msg.ragAnswer, apiKey).then(dynamic => {
        if (isMounted && dynamic && dynamic.length > 0) {
          setPrompts(dynamic)
        }
      }).finally(() => {
        if (isMounted) setIsLoadingDynamic(false)
      })
    })

    return () => {
      isMounted = false
    }
  }, [msg?.id, msg?.ragStatus, msg?.ragAnswer])

  if (!prompts || prompts.length === 0) {
    return null
  }

  return (
    <div className="select-none animate-in fade-in duration-300">
      <div className="flex flex-wrap gap-2">
        {prompts.map((promptText, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(promptText)}
            className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-panel)]/90 hover:bg-[var(--bg-active)] border-0 text-[12.5px] text-[var(--text-main)] hover:text-[var(--text-accent)] transition-all duration-150 shadow-sm text-left max-w-full break-words"
          >
            <span className="shrink-0 text-[11px] opacity-70 group-hover:opacity-100 transition-opacity">💡</span>
            <span className="truncate">{promptText}</span>
            <ArrowRight size={11} className="shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--text-accent)]" />
          </button>
        ))}
      </div>
    </div>
  )
})

export default SuggestedPrompts
