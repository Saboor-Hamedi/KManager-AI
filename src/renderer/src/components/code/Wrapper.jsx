import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

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
    <div className="relative w-full group -mx-4 px-4">
      <div 
        ref={contentRef} 
        className={`transition-all duration-300 ease-in-out overflow-hidden`}
        style={{ 
          maxHeight: expanded ? 'none' : (isOverflowing ? `${maxHeight}px` : 'none') 
        }}
      >
        {children}
      </div>
      
      {/* Gradient Fade (Only when overflowing and collapsed) */}
      {isOverflowing && !expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[var(--bg-app)] to-transparent pointer-events-none" />
      )}

      {/* Expand / Collapse Button */}
      {isOverflowing && (
        <div className={`flex justify-center mt-2 ${!expanded && 'absolute bottom-2 left-0 right-0 z-10'}`}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold text-[var(--text-main)] bg-[var(--bg-panel)]/80 hover:bg-[var(--bg-active)] border border-white/[0.05] hover:border-white/[0.1] backdrop-blur-md shadow-sm transition-all cursor-pointer opacity-90 hover:opacity-100"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUp size={12} />
              </>
            ) : (
              <>
                <span>See more</span>
                <ChevronDown size={12} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default Wrapper
