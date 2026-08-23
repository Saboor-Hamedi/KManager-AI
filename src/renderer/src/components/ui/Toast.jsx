import React, { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react'
import './Toast.css'

const Toast = () => {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handleToast = (e) => {
      const { message, type = 'info', duration = 3000 } = e.detail
      const id = Date.now() + Math.random()
      setToasts(prev => [...prev, { id, message, type }])
      
      if (duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id))
        }, duration)
      }
    }

    window.addEventListener('toast', handleToast)
    return () => window.removeEventListener('toast', handleToast)
  }, [])

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  if (toasts.length === 0) return null

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className="toast-item">
          {toast.type === 'error' && <AlertCircle size={14} className="toast-icon-error" />}
          {toast.type === 'success' && <CheckCircle size={14} className="toast-icon-success" />}
          {toast.type === 'info' && <Info size={14} className="toast-icon-info" />}
          
          <span className="toast-message">{toast.message}</span>
          
          <button onClick={() => removeToast(toast.id)} className="toast-close-btn">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )
}

export const toast = {
  success: (message, duration) => window.dispatchEvent(new CustomEvent('toast', { detail: { message, type: 'success', duration } })),
  error: (message, duration) => window.dispatchEvent(new CustomEvent('toast', { detail: { message, type: 'error', duration } })),
  info: (message, duration) => window.dispatchEvent(new CustomEvent('toast', { detail: { message, type: 'info', duration } }))
}

export default Toast
