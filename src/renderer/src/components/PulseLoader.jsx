import React from 'react'

const PulseLoader = ({ text, size = 'md', className = '' }) => {
  // size can be 'sm' (1.5 / 6px) or 'md' (2 / 8px)
  const dotClass = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <div className={`flex flex-col items-center justify-center gap-4 opacity-70 animate-pulse ${className}`}>
      <div className="flex gap-2">
        {[0, 1, 2].map(i => (
          <div 
            key={i} 
            className={`${dotClass} rounded-full bg-[var(--text-accent)]`} 
            style={{ animationDelay: `${i * 150}ms` }} 
          />
        ))}
      </div>
      {text && (
        <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest text-center">
          {text}
        </span>
      )}
    </div>
  )
}

export default PulseLoader
