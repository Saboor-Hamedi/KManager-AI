import React from 'react'
import { ChevronDown, ChevronUp, Bot, ArrowUp } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'
import SuggestedPrompts from './SuggestedPrompts'

const InlineChat = ({ 
  resultId,
  msg,
  activeReplyId, 
  compositeId,
  collapsedReplies, 
  setCollapsedReplies, 
  submitFollowUp,
  showForm = true
}) => {
  // Filter replies that belong to this specific item (or null for global replies)
  const replies = (msg.replies || []).filter(r => r.resultId === resultId)

  return (
    <>
      {/* Threaded Replies */}
      {replies.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                onClick={() => setCollapsedReplies(prev => ({ ...prev, [compositeId]: !prev[compositeId] }))}
          >
            {collapsedReplies[compositeId] ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            <span>{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</span>
          </div>
          
          {!collapsedReplies[compositeId] && (
            <div className="flex flex-col gap-4 pl-4 border-l-2 border-[var(--text-accent)]/30 ml-1.5 relative mt-1">
              {replies.map((reply) => (
                <div key={reply.id} className="flex flex-col gap-2 animate-in fade-in duration-300 relative">
                  <div className="flex justify-start items-center gap-2 mb-1">
                      <div className="absolute -left-[23px] top-3 w-4 h-[2px] bg-[var(--text-accent)]/30" />
                      <span className="bg-transparent text-[var(--text-main)] text-[12px] border-0 shadow-none text-justify">
                        {reply.query}
                      </span>
                  </div>
                  
                  <div className="text-[12px] leading-relaxed text-[var(--text-main)] pl-1">
                    {reply.ragStatus === 'generating' && !reply.ragAnswer && (
                      <div className="flex items-center gap-2 py-1 text-xs text-[var(--text-muted)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-accent)] animate-pulse" />
                        Replying...
                      </div>
                    )}
                    
                    {reply.ragAnswer && (
                      <div className="text-[12px]">
                        <DocumentRenderer content={reply.ragAnswer} category="DOCUMENT" />
                        {reply.ragStatus === 'generating' && (
                          <span className="inline-block w-2 h-4 ml-1 bg-[var(--text-accent)] animate-pulse align-middle" />
                        )}
                      </div>
                    )}

                    {reply.ragStatus === 'error' && (
                      <div className="text-red-400 text-[12px]">Error: {reply.ragError}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Follow-Up Section (Hidden by default, toggled by Reply button) */}
      {showForm && activeReplyId === compositeId && (
        <div className="mt-1 flex flex-col gap-3">
          
          {/* Conversational Follow-Up Input */}
          <form onSubmit={(e) => {
            e.preventDefault()
            const val = e.target.elements.followup.value
            if (val.trim()) {
              submitFollowUp(val)
              e.target.reset()
            }
          }} className="relative flex items-center bg-black/10 dark:bg-white/5 focus-within:bg-black/15 dark:focus-within:bg-white/10 rounded-[14px] overflow-hidden transition-colors duration-200">
            <div className="pl-3.5 text-[var(--text-muted)] opacity-70">
              <Bot size={15} />
            </div>
            <input 
              name="followup"
              type="text" 
              placeholder="Ask a question about this..." 
              className="flex-1 bg-transparent border-none outline-none py-2.5 px-3 text-[13px] font-normal text-[var(--text-main)] placeholder-[var(--text-muted)]/60"
              autoComplete="off"
              spellCheck="false"
            />
            <button 
              type="submit" 
              className="mr-2 w-7 h-7 rounded-full bg-[var(--text-accent)]/10 hover:bg-[var(--text-accent)]/20 text-[var(--text-accent)] transition-colors duration-150 flex items-center justify-center"
              title="Send follow-up"
            >
              <ArrowUp size={15} strokeWidth={2.5} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default InlineChat
