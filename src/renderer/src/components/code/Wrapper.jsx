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
        className={`transition-[max-height] duration-500 ease-in-out overflow-hidden`}
        style={{ 
          maxHeight: expanded && contentRef.current ? `${contentRef.current.scrollHeight}px` : (isOverflowing ? `${maxHeight}px` : 'none') 
        }}
      >
        {children}
      </div>
      
      {/* Gradient Fade (Only when overflowing and collapsed) */}
      {isOverflowing && !expanded && (
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)]/80 to-transparent pointer-events-none" />
      )}

      {/* Expand / Collapse Button */}
      {isOverflowing && (
        <div className={`flex justify-center mt-1 ${!expanded && 'absolute bottom-2 left-0 right-0 z-10'}`}>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-[12px] font-medium text-[var(--text-accent)] opacity-80 hover:opacity-100 hover:text-[var(--text-main)] transition-all cursor-pointer bg-transparent border-0 select-none"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>See more</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

export default Wrapper
