import React, { useState, useEffect, useRef } from 'react'
import { Plus, Copy, ThumbsUp, ThumbsDown, Check, Edit as EditIcon } from 'lucide-react'
import DocumentRenderer from './DocumentRenderer'
import SuggestedPrompts from './SuggestedPrompts'
import InlineChat from './InlineChat'
import AutoResizeTextarea from './AutoResizeTextarea'
import './horizontal.css'

const RagAnswer = ({ msg, handleSaveResponse, savedResponses, setQuery, textareaRef, activeReplyId, setActiveReplyId, collapsedReplies, setCollapsedReplies, submitFollowUp, onUpdateAnswer, onStopGeneration }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const editRef = useRef(null)

  useEffect(() => {
    if (!isEditing) {
      setEditValue(msg?.ragAnswer || '')
    }
  }, [msg?.ragAnswer, isEditing])

  if (!msg.ragStatus || msg.ragStatus === 'disabled') return null

  const handleCopy = async () => {
    if (msg?.ragAnswer) {
      await navigator.clipboard.writeText(msg.ragAnswer)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleFeedback = (type) => {
    if (feedback === type) return
    setFeedback(type)
    const score = type === 'helpful' ? 1 : -1
    if (window.api?.db?.submitFeedback) {
      window.api.db.submitFeedback(msg.query || 'AI synthesis', score, msg.id, null)
        .catch(err => console.error('Feedback error:', err))
    }
  }

  const handleSaveEdit = () => {
    const formatted = editValue.trim()
    if (onUpdateAnswer && formatted !== msg.ragAnswer) {
      onUpdateAnswer(msg.id, formatted)
    }
    setIsEditing(false)
  }

  return (
    <div 
      className="w-full relative"
      style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 300px' }}
    >
      {msg.ragStatus === 'generating' && !msg.ragAnswer && (
        <div className="flex items-center gap-2 py-2 text-xs text-[var(--text-muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-accent)] animate-pulse" />
          Synthesizing answer from {msg.results?.length || 0} sources...
        </div>
      )}

      {msg.ragAnswer && (
        <div className="w-full mt-2 animate-in fade-in duration-300">

          {isEditing ? (
            <div className="flex flex-col gap-3">
              <AutoResizeTextarea
                ref={editRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full p-4 rounded-xl bg-black/40 text-[14px] text-[var(--text-main)] leading-relaxed border border-white/10 focus:border-[var(--text-accent)] focus:ring-1 focus:ring-[var(--text-accent)] outline-none resize-none font-mono"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 text-[12px] font-medium bg-[var(--text-accent)] text-white rounded-[4px] hover:opacity-90 transition-opacity"
                >
                  Update Answer
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[14px] leading-relaxed text-[var(--text-main)] max-w-none text-left">
              <DocumentRenderer 
                content={msg.ragAnswer} 
                category="DOCUMENT" 
                results={msg.results} 
              />
              {msg.ragStatus === 'generating' && (
                <span className="inline-block w-2 h-4 ml-1 bg-[var(--text-accent)] animate-pulse align-middle" />
              )}
            </div>
          )}

          {msg.ragStatus === 'generating' && msg.ragAnswer && onStopGeneration && (
            <div className="mt-4 flex justify-start">
              <button 
                onClick={() => onStopGeneration(msg.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)] transition-colors"
              >
                <div className="w-2 h-2 bg-current rounded-sm"></div>
                Stop generating
              </button>
            </div>
          )}

          {msg.ragStatus === 'done' && (
            <>
              <div className="horizontal-divider my-5" />
              <div className="flex items-center justify-between flex-wrap gap-3 mt-1">
                {/* Action Bar (Like, Dislike, Copy, Edit) */}
                <div className="flex items-center gap-1 shrink-0 select-none">
                  <button 
                    onClick={() => handleFeedback('helpful')}
                    className={`p-1.5 rounded-[4px] transition-colors flex items-center justify-center border-0 ${
                      feedback === 'helpful' ? 'text-[#a855f7] bg-[var(--bg-active)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                    }`}
                    title="Helpful AI response"
                  >
                    <ThumbsUp size={13} />
                  </button>
                  <button 
                    onClick={() => handleFeedback('unhelpful')}
                    className={`p-1.5 rounded-[4px] transition-colors flex items-center justify-center border-0 ${
                      feedback === 'unhelpful' ? 'text-red-400 bg-[var(--bg-active)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                    }`}
                    title="Not helpful"
                  >
                    <ThumbsDown size={13} />
                  </button>
                  <button 
                    onClick={handleCopy}
                    className="p-1.5 rounded-[4px] hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors flex items-center justify-center border-0"
                    title="Copy AI answer"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                  </button>
                  <button
                    onClick={() => setIsEditing(prev => !prev)}
                    className={`p-1.5 rounded-[4px] hover:bg-[var(--bg-active)] transition-colors flex items-center justify-center border-0 ${
                      isEditing ? 'bg-[var(--bg-active)] text-[var(--text-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                    title="Edit answer text"
                  >
                    <EditIcon size={13} />
                  </button>
                </div>

                {/* Save Button */}
                <button
                  onClick={() => handleSaveResponse(msg.id, msg.query, msg.ragAnswer)}
                  disabled={savedResponses[msg.id] === 'saving' || savedResponses[msg.id] === 'saved'}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-all shadow-none border-0 ${
                    savedResponses[msg.id] === 'saved'
                      ? 'text-green-400 cursor-default bg-transparent'
                      : savedResponses[msg.id] === 'saving'
                        ? 'text-[var(--text-muted)] cursor-wait opacity-70 bg-transparent'
                        : 'bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-active)]'
                  }`}
                >
                  {savedResponses[msg.id] === 'saved' ? (
                    <>
                      <div className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-green-400">
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
