import React, { useEffect, useState } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

const ConfirmModal = React.memo(({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = 'Okay', 
  cancelText = 'Cancel', 
  isDestructive = true 
}) => {
  const [render, setRender] = useState(false)

  // Handle subtle mount animation
  useEffect(() => {
    if (isOpen) setRender(true)
  }, [isOpen])

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false)
  }

  if (!render) return null

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isOpen ? 'bg-black/40 backdrop-blur-[8px] opacity-100' : 'bg-transparent backdrop-blur-none opacity-0'
      }`}
      onAnimationEnd={handleAnimationEnd}
    >
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onCancel} />

      <div 
        className={`relative w-full max-w-[300px] bg-[#1a1a1a]/80 backdrop-blur-2xl border border-white/5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}
      >
        {/* Subtle top highlight */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        <button 
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X size={14} />
        </button>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${isDestructive ? 'bg-red-500/10' : 'bg-white/5'}`}>
              {isDestructive ? <Trash2 size={15} className="text-red-400" /> : <AlertTriangle size={15} className="text-white/60" />}
            </div>
            <div className="flex-1 pt-0.5">
              <h3 className="text-[13px] font-semibold text-white/90 tracking-wide mb-1">{title}</h3>
              <p className="text-[11px] text-white/50 leading-relaxed font-medium">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 px-4 pb-4 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold tracking-wide text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold tracking-wide transition-all duration-300 shadow-lg ${
              isDestructive
                ? 'bg-red-500/90 text-white hover:bg-red-500 hover:shadow-red-500/25 hover:-translate-y-[1px]'
                : 'bg-white text-black hover:bg-gray-100 hover:shadow-white/20 hover:-translate-y-[1px]'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
})

export default ConfirmModal
