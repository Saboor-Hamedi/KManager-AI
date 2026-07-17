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
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-app)] to-transparent pointer-events-none" />
      )}
      {isOverflowing && (
        <div className="mt-1 flex justify-center">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="text-[11px] font-medium text-[var(--text-accent)] hover:text-[var(--text-main)] hover:underline transition-colors border-0 bg-transparent cursor-pointer p-1"
          >
            {expanded ? 'Show Less' : 'See More'}
          </button>
        </div>
      )}
    </div>
  )
}

export default Wrapper
