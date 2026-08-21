import React, { useState, useEffect, useRef } from 'react'
import { ChevronUp } from 'lucide-react'

const ScrollToTopButton = () => {
  const btnRef = useRef(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!btnRef.current) return
    const parent = btnRef.current.parentElement
    
    const checkScroll = (e) => {
      // e.target is the element that is actually scrolling
      if (e.target && e.target.scrollTop !== undefined) {
        setIsVisible(e.target.scrollTop > 100)
      }
    }

    // Use event capturing to catch scroll events from any child scroll container
    parent.addEventListener('scroll', checkScroll, true)

    return () => {
      parent.removeEventListener('scroll', checkScroll, true)
    }
  }, [])

  const handleScrollToTop = () => {
    if (!btnRef.current) return
    const scrollContainer = btnRef.current.parentElement.querySelector('.overflow-y-auto')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <button
      ref={btnRef}
      onClick={handleScrollToTop}
      className={`absolute bottom-6 right-6 z-50 flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.08] transition-all duration-300 border-0 shadow-md ${isVisible ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'}`}
      title="Scroll to Top"
    >
      <ChevronUp size={16} strokeWidth={2.5} />
    </button>
  )
}

export default ScrollToTopButton
