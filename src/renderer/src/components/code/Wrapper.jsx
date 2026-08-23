import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

const Wrapper = ({ children, maxHeight = 300 }) => {
  const [expanded, setExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const [contentHeight, setContentHeight] = useState(0)
  const contentRef = useRef(null)

  useEffect(() => {
    if (!contentRef.current) return
    
    const checkOverflow = () => {
      if (!contentRef.current) return
      const sh = contentRef.current.scrollHeight
      setContentHeight(prev => prev !== sh ? sh : prev)
      setIsOverflowing(sh > maxHeight + 20)
    }
    
    checkOverflow()
    
    // Observe for any dynamic height changes (e.g. lazy-loaded images, diagrams, markdown settling)
    const ro = new ResizeObserver(() => {
      checkOverflow()
    })
    
    if (contentRef.current) {
      ro.observe(contentRef.current)
      // Also observe the first child which contains the actual flowing content
      if (contentRef.current.firstElementChild) {
        ro.observe(contentRef.current.firstElementChild)
      }
    }
    
    return () => ro.disconnect()
  }, [children, maxHeight])

  return (
    <div className="relative w-full group">
      <div 
        ref={contentRef} 
        className="transition-[max-height] duration-500 ease-in-out overflow-hidden"
        style={{ 
          maxHeight: expanded ? `${Math.max(contentHeight, maxHeight + 20)}px` : (isOverflowing ? `${maxHeight}px` : 'none') 
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
