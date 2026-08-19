import React, { forwardRef } from 'react'

const AutoResizeTextarea = forwardRef(({ 
  value, 
  onChange, 
  disabled,
  readOnly,
  minHeight = '120px', 
  maxHeight = '400px', 
  padding = 'p-3.5',
  rounded = 'rounded-[6px]',
  ...props
}, ref) => {
  return (
    <div 
      className={`grid w-full relative overflow-y-auto custom-scrollbar bg-[var(--bg-input,var(--bg-active))] border border-[var(--border-subtle)] ${rounded} focus-within:border-[var(--text-accent)] focus-within:shadow-[0_0_0_2px_rgba(var(--text-accent-rgb,64,186,250),0.15)] transition-all`}
      style={{ minHeight, maxHeight }}
    >
      {/* Hidden mirror element to dictate height perfectly without JS */}
      <div 
        className={`col-start-1 row-start-1 ${padding} text-[13px] font-mono leading-relaxed whitespace-pre-wrap break-words invisible pointer-events-none`}
        aria-hidden="true"
      >
        {value + ' '}
      </div>
      {/* Actual textarea, exactly matching the mirror's sizing */}
      <textarea
        ref={ref}
        className={`col-start-1 row-start-1 w-full h-full ${padding} text-[13px] font-mono bg-transparent text-[var(--text-main)] focus:outline-none resize-none leading-relaxed overflow-hidden disabled:opacity-50`}
        value={value}
        onChange={onChange}
        disabled={disabled}
        readOnly={readOnly}
        {...props}
      />
    </div>
  )
})

AutoResizeTextarea.displayName = 'AutoResizeTextarea'
export default AutoResizeTextarea
