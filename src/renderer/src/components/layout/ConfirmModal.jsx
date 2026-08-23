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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[8px]">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative w-full max-w-[300px] bg-[var(--bg-card)]/90 backdrop-blur-2xl border border-[var(--border-subtle)] rounded-xl shadow-[var(--shadow-modal)] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Subtle top highlight */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />



        <div className="p-4 flex flex-col items-center justify-center text-center">
          {title && <h3 className="text-[13px] font-semibold text-white/90 tracking-wide mb-2">{title}</h3>}
          <p className="text-[12px] text-[var(--text-main)] leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 px-4 pb-4 pt-0 justify-center">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 rounded-md text-[11px] font-semibold transition-colors ${
              isDestructive 
                ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                : 'bg-white/10 text-white hover:bg-white/20'
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
