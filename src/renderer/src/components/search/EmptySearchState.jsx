import React from 'react'

const EmptySearchState = ({ query, onConnect }) => (
  <div className="flex flex-col items-center justify-center py-8 px-4 text-center gap-3 my-2 animate-in fade-in duration-200">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-faint)] opacity-40">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
    <div className="flex flex-col gap-1 max-w-sm">
      <h4 className="text-[13px] font-medium text-[var(--text-muted)]">
        No matching documents found
      </h4>
      <p className="text-[12px] text-[var(--text-faint)] leading-relaxed">
        We couldn't find documents matching <span className="font-mono text-[var(--text-muted)] not-italic">"{query}"</span>. Try adjusting your keywords.
      </p>
    </div>
  </div>
)

export default EmptySearchState