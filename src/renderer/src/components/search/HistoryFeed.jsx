import React, { useMemo } from 'react'
import SearchResultCard from './SearchResultCard'
import EmptySearchState from './EmptySearchState'
import InlineChat from './InlineChat'
import RagAnswer from './RagAnswer'
import './horizontal.css'

const SearchLoadingSkeleton = () => (
  <div className="flex flex-col gap-6 py-3 animate-in fade-in duration-200">
    <div className="flex items-center gap-2.5 text-[var(--text-muted)] text-[13px] font-medium">
      <span className="w-2 h-2 rounded-full bg-[var(--text-accent)] animate-ping" />
      <span>Searching knowledge base...</span>
    </div>

    {[1, 2].map((idx) => (
      <div
        key={idx}
        className="flex flex-col gap-3 pb-4 animate-pulse"
      >
        <div className="flex items-center justify-between">
          <div className="h-3.5 w-40 rounded bg-[var(--border-subtle)]/40" />
          <div className="h-5 w-48 rounded bg-[var(--border-subtle)]/30" />
        </div>
        <div className="flex flex-col gap-2 pt-1">
          <div className="h-3 w-11/12 rounded bg-[var(--border-subtle)]/30" />
          <div className="h-3 w-4/5 rounded bg-[var(--border-subtle)]/25" />
          <div className="h-3 w-2/3 rounded bg-[var(--border-subtle)]/20" />
        </div>
      </div>
    ))}
  </div>
)

const HistoryFeed = ({
  history,
  handleSelect,
  activeReplyId,
  setActiveReplyId,
  collapsedReplies,
  setCollapsedReplies,
  submitFollowUp,
  enableRag,
  handleSaveResponse,
  savedResponses,
  setQuery,
  textareaRef
}) => {
  const memoizedHistoryFeed = useMemo(() => {
    if (history.length === 0) {
      return (
          <div className="h-full flex flex-col items-center justify-center gap-5 select-none px-6">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-accent)] shadow-sm">
                <span className="text-sm font-black tracking-tighter">KM</span>
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-[var(--text-main)] tracking-tight">
                  Knowledge Management
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] mt-0.5 font-normal">
                  Ask anything across your entire knowledge base
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-1.5 max-w-md">
              {[
                'Summarize recent notes',
                'Find concepts in my vault',
                'Compare two topics'
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                  className="px-2.5 py-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-panel)]/50 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--border-main)] hover:bg-[var(--bg-active)] transition-colors font-normal"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )
    }

    return history.map(msg => (
      <div key={msg.id} className="w-full max-w-2xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300">
              
              {/* User Prompt Text without background, aligned flush with response boundary */}
              <div className="flex justify-end w-full py-1">
                <div className="bg-transparent max-w-[85%] border-0 shadow-none text-justify">
                  <p className="text-[14px] leading-relaxed font-normal text-[var(--text-main)] whitespace-pre-wrap break-words text-justify">{msg.query}</p>
                </div>
              </div>

              {/* AI Response Area centered with same width */}
              <div className="w-full flex flex-col">
                {msg.isLoading ? (
                  <SearchLoadingSkeleton />
                ) : msg.error ? (
                  <div className="flex items-center justify-between p-5 rounded-xl bg-[#873636]/10 shadow-sm animate-in fade-in duration-200">
                    <div className="flex flex-col gap-1.5">
                      <strong className="text-[13px] font-semibold text-red-400">Search Failed</strong>
                      <p className="text-[12px] text-red-400/80">{msg.error}</p>
                    </div>
                    {msg.error.toLowerCase().includes('database') || msg.error.toLowerCase().includes('connect') ? (
                      <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'database' } }))}
                        className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-[#394b5e] hover:bg-[#4a5d72] border border-[#4e6074] text-gray-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] transition-all flex-shrink-0 ml-4"
                      >
                        Connect Database
                      </button>
                    ) : null}
                  </div>
                ) : msg.results.length === 0 ? (
                  <EmptySearchState query={msg.query} />
                ) : (
                  <div className="flex flex-col w-full">
                    {msg.isFallback && (
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <span className="text-[10px] font-medium text-[var(--text-muted)] italic">
                          No exact match for <span className="text-[var(--text-main)] font-mono not-italic">"{msg.query}"</span> — showing closest semantic results
                        </span>
                      </div>
                    )}
                    {msg.queryRefined && msg.refinedQuery && (
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <span className="text-[10px] font-medium text-[var(--text-muted)] italic">
                          Searched with refined terms: <span className="text-[var(--text-main)] font-mono not-italic">"{msg.refinedQuery}"</span>
                        </span>
                      </div>
                    )}
                    {msg.lowInfoQuery && (
                      <div className="flex items-center gap-2 mb-3 px-2 py-1.5 rounded-md bg-amber-500/5 border border-amber-500/20">
                        <span className="text-[10px] font-medium text-amber-300">
                          Try using more specific keywords for better results
                        </span>
                      </div>
                    )}
                    {!msg.isFollowUp && msg.results.map((item, idx) => (
                      <div key={`${item.id || 'res'}-${idx}`} className="flex flex-col gap-2">
                        <SearchResultCard
                          item={item}
                          query={msg.query}
                          handleSelect={handleSelect}
                          onReply={() => {
                            if (activeReplyId === `${msg.id}-${idx}`) {
                              setActiveReplyId(null);
                            } else {
                              setActiveReplyId(`${msg.id}-${idx}`);
                            }
                          }}
                          isActiveReply={activeReplyId === `${msg.id}-${idx}`}
                          isLast={idx === msg.results.length - 1}
                        />
                        <div className="mt-2 mb-4">
                          <InlineChat 
                            resultId={`${item.id || 'res'}-${idx}`}
                            msg={msg}
                            activeReplyId={activeReplyId}
                            compositeId={`${msg.id}-${idx}`}
                            collapsedReplies={collapsedReplies}
                            setCollapsedReplies={setCollapsedReplies}
                            submitFollowUp={(val) => submitFollowUp(val, msg, { ...item, uniqueResultId: `${item.id || 'res'}-${idx}` })}
                          />
                        </div>
                      </div>
                    ))}

                    {/* RAG Synthesized Answer */}
                    <RagAnswer 
                      msg={msg}
                      handleSaveResponse={handleSaveResponse}
                      savedResponses={savedResponses}
                      setQuery={setQuery}
                      textareaRef={textareaRef}
                      activeReplyId={activeReplyId}
                      setActiveReplyId={setActiveReplyId}
                      collapsedReplies={collapsedReplies}
                      setCollapsedReplies={setCollapsedReplies}
                      submitFollowUp={submitFollowUp}
                    />
                  </div>
                )}
              </div>
            </div>
          ))
  }, [history, savedResponses, handleSelect, enableRag, activeReplyId, collapsedReplies, setQuery, textareaRef, setActiveReplyId, setCollapsedReplies, submitFollowUp, handleSaveResponse])

  return <>{memoizedHistoryFeed}</>
}

export default HistoryFeed
