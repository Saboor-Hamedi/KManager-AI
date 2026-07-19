import React, { useState, useRef, useEffect } from 'react'

const Wrapper = ({ children, maxHeight = 300 }) => {
  const [expanded, setExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const contentRef = useRef(null)

  useEffect(() => {
    if (!contentRef.current) return
    const checkOverflow = () => {
      if (contentRef.current.scrollHeight > maxHeight + 20) {
        setIsOverflowing(true)
      } else {
        setIsOverflowing(false)
      }
    }
    checkOverflow()
    const timer = setTimeout(checkOverflow, 150)
    return () => clearTimeout(timer)
  }, [children, maxHeight])

  return (
    <div className="relative w-full">
      <div 
        ref={contentRef} 
        className="transition-all duration-300 ease-in-out overflow-hidden" 
        style={{ 
          maxHeight: expanded ? `${contentRef.current?.scrollHeight + 50}px` : (isOverflowing ? `${maxHeight}px` : 'none') 
        }}
      >
        {children}
      </div>
      {isOverflowing && !expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[var(--bg-app)] to-transparent pointer-events-none" />
      )}
      {isOverflowing && (
        <div className="mt-2 flex justify-start">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-[12px] font-semibold text-[var(--text-accent)] bg-[var(--bg-panel)] border border-[var(--border-subtle)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] transition-all cursor-pointer shadow-none"
          >
            <span>{expanded ? 'Show Less ↑' : 'See More ↓'}</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default Wrapper
