import React, { useState, useEffect, memo } from 'react'
import { ArrowRight } from 'lucide-react'
import { getLocalSuggestedPrompts } from '../../lib/suggestedPrompts'

const SuggestedPrompts = memo(({ msg, onSelectPrompt }) => {
  const [prompts, setPrompts] = useState([])

  useEffect(() => {
    if (!msg || msg.ragStatus !== 'done' || !msg.ragAnswer) {
      return
    }

    // Generate immediate local suggestions right away
    const local = getLocalSuggestedPrompts(msg.query, msg.results || [], msg.ragAnswer)
    setPrompts(local)
  }, [msg?.id, msg?.ragStatus, msg?.ragAnswer])

  if (!prompts || prompts.length === 0) {
    return null
  }

  return (
    <div className="select-none animate-in fade-in duration-300 w-full">
      <div className="flex flex-col gap-0.5 w-full items-start">
        {prompts.map((promptText, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(promptText)}
            className="group flex items-center gap-1.5 py-1 px-0 rounded-none bg-transparent hover:bg-transparent border-0 text-[12.5px] text-[var(--text-main)] hover:text-[var(--text-accent)] transition-all duration-150 text-left w-fit max-w-full break-words"
          >
            <span>{promptText}</span>
            <ArrowRight size={14} className="shrink-0 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-[var(--text-accent)]" />
          </button>
        ))}
      </div>
    </div>
  )
})

export default SuggestedPrompts
