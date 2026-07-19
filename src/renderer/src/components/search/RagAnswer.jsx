import React from 'react'
import { Plus } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'
import SuggestedPrompts from './SuggestedPrompts'
import InlineChat from './InlineChat'
import './horizontal.css'

const RagAnswer = ({ msg, handleSaveResponse, savedResponses, setQuery, textareaRef, activeReplyId, setActiveReplyId, collapsedReplies, setCollapsedReplies, submitFollowUp }) => {
  if (!msg.ragStatus || msg.ragStatus === 'disabled') return null

  return (
    <div className="w-full">
      {msg.ragStatus === 'generating' && !msg.ragAnswer && (
        <div className="flex items-center gap-2 py-2 text-xs text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-accent)] animate-pulse" />
          Synthesizing answer from {msg.results?.length || 0} sources...
        </div>
      )}

      {msg.ragAnswer && (
        <div className="flex flex-col">
          <div className="text-[14px] leading-relaxed text-[var(--text-main)] max-w-none text-justify">
            <DocumentRenderer content={msg.ragAnswer} category="DOCUMENT" />
            {msg.ragStatus === 'generating' && (
              <span className="inline-block w-2 h-4 ml-1 bg-[var(--text-accent)] animate-pulse align-middle" />
            )}
          </div>

          {msg.ragStatus === 'done' && (
            <>
              <div className="horizontal-divider my-5" />
              <div className="flex justify-start mt-1 items-center">
                <button
                  onClick={() => handleSaveResponse(msg.id, msg.query, msg.ragAnswer)}
                  disabled={savedResponses[msg.id] === 'saving' || savedResponses[msg.id] === 'saved'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] ${
                    savedResponses[msg.id] === 'saved'
                      ? 'bg-green-500/10 text-green-400 cursor-default'
                      : savedResponses[msg.id] === 'saving'
                        ? 'bg-[var(--bg-panel)]/50 text-[var(--text-muted)] cursor-wait opacity-70'
                        : 'bg-[var(--bg-panel)]/40 hover:bg-[#394b5e]/40 text-[var(--text-muted)] hover:text-gray-300 shadow-sm'
                  }`}
                >
                  {savedResponses[msg.id] === 'saved' ? (
                    <>
                      <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full bg-green-500/20 text-green-400">
                        <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="2.5 6 5 8.5 9.5 3.5"></polyline>
                        </svg>
                      </div>
                      Saved to Knowledge Base
                    </>
                  ) : savedResponses[msg.id] === 'saving' ? (
                    <>
                      <span className="w-3 h-3 border-2 border-[var(--text-muted)] border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      Save
                    </>
                  )}
                </button>
              </div>
              <div className="mt-3">
                <SuggestedPrompts msg={msg} onSelectPrompt={(p) => {
                  setQuery(p)
                  if (textareaRef.current) {
                    textareaRef.current.focus()
                    textareaRef.current.style.height = 'auto'
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`
                  }
                }} />
                <InlineChat 
                  resultId={null}
                  msg={msg}
                  activeReplyId={activeReplyId}
                  compositeId={`${msg.id}-global`}
                  collapsedReplies={collapsedReplies}
                  setCollapsedReplies={setCollapsedReplies}
                  submitFollowUp={(val) => submitFollowUp(val, msg, null)}
                  showForm={false}
                />
              </div>
            </>
          )}
        </div>
      )}

      {msg.ragStatus === 'error' && (
        <div className="py-2 px-3 rounded-[6px] bg-red-500/10 border border-red-500/20 flex items-start gap-2 mt-1">
          <span className="text-red-400 mt-0.5 shrink-0">⚠</span>
          <div className="text-xs text-red-400 leading-relaxed">
            <span className="font-semibold">AI synthesis failed: </span>
            {msg.ragError || 'Unknown error'}.
            {(msg.ragError || '').toLowerCase().includes('timeout') || (msg.ragError || '').toLowerCase().includes('network') || (msg.ragError || '').toLowerCase().includes('unreachable') ? (
              <span className="text-red-300"> Try using a VPN or switch providers in <strong>AI Settings</strong>.</span>
            ) : (
              <span className="text-red-300"> Check your API key in <strong>AI Settings</strong>.</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RagAnswer
