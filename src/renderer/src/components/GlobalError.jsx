import React from 'react'
import { X, AlertTriangle, RefreshCcw } from 'lucide-react'

class GlobalError extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Caught by GlobalError:', error, errorInfo)
    this.setState({ errorInfo })
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[var(--bg-app)] animate-in fade-in duration-300">
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[5px] w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
            {/* Title Bar matching ThemeModal */}
            <div className="h-8 border-b border-[var(--border-subtle)] bg-[var(--bg-panel)] flex items-center shrink-0 select-none">
              <div className="flex items-center gap-2 px-3">
                <AlertTriangle size={15} className="text-red-500" />
                <h2 className="text-xs font-semibold text-[var(--text-main)]">System Error</h2>
              </div>
              <div className="flex-1" />
              {/* Optional close button that acts as reset */}
              <button onClick={this.resetError} className="h-full px-3 hover:bg-[#e81123] hover:text-white text-[var(--text-muted)] transition-colors flex items-center justify-center">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 flex flex-col gap-4 bg-[var(--bg-app)]">
              <div className="text-sm text-[var(--text-main)]">
                The application encountered an unexpected error in this section. Other sections are unaffected.
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Error Details</label>
                <textarea
                  readOnly
                  className="w-full h-48 bg-[#0d1117] text-red-400 text-xs p-3 rounded-md font-mono border border-[var(--border-subtle)] focus:outline-none focus:border-[var(--border-main)] resize-none custom-scrollbar cursor-text"
                  style={{ caretColor: 'transparent' }}
                  value={`${this.state.error?.toString()}\n\n${this.state.errorInfo?.componentStack || ''}`}
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={this.resetError}
                  className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--bg-panel)] hover:bg-[var(--border-main)] border border-[var(--border-subtle)] text-[var(--text-main)] text-xs font-medium transition-colors"
                >
                  <RefreshCcw size={14} />
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default GlobalError
