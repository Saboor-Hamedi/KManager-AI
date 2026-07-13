import React from 'react'
import { AlertTriangle } from 'lucide-react'

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', isDestructive = false }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-dim)] rounded-xl shadow-2xl w-full max-w-[320px] p-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-full ${isDestructive ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
            <AlertTriangle size={18} />
          </div>
          <h3 className="text-sm font-bold text-[var(--text-main)] tracking-tight">{title}</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-[11px] font-bold text-[var(--text-muted)] hover:bg-[var(--bg-active)] hover:text-[var(--text-main)] transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 rounded text-[11px] font-bold tracking-wider transition-all shadow-sm ${
              isDestructive
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20'
                : 'bg-[var(--text-accent)] text-[var(--bg-app)] hover:opacity-90 shadow-[var(--text-accent)]/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
