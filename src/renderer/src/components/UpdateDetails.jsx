// Dropdown GlobalTitlebar: Update Details Component
import React from 'react'
import { Package, ArrowRight, CheckCircle2 } from 'lucide-react'

const UpdateDetails = ({ show, currentVersion, updateVersion }) => {
  if (!show) return null

  return (
    <div className="absolute top-full left-0 pt-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-[var(--bg-card)]/95 backdrop-blur-xl border border-white/[0.08] rounded-[6px] shadow-2xl w-[280px] overflow-hidden select-text cursor-default ring-1 ring-black/20">
        
        {/* Header Section */}
        <div className="p-4 pb-3 relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--text-accent)]/15 blur-3xl rounded-full pointer-events-none" />
          
          <div className="flex items-start gap-3.5 relative z-10">
            {/* Icon Box */}
            <div className="w-9 h-9 rounded-[5px] bg-[var(--text-accent)]/10 flex items-center justify-center shrink-0 border border-[var(--text-accent)]/20 shadow-inner mt-0.5">
              <Package size={18} className="text-[var(--text-accent)]" strokeWidth={2} />
            </div>
            
            {/* Version Info */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-bold text-[var(--text-main)] tracking-tight">New Update Available</p>
              </div>
              
              {/* Version Transition Pill */}
              <div className="inline-flex items-center gap-2 bg-black/20 px-2 py-1 rounded-[4px] border border-white/[0.04]">
                <span className="text-[11px] font-medium text-[var(--text-muted)] line-through decoration-[var(--text-muted)]/50">v{currentVersion}</span>
                <ArrowRight size={10} className="text-[var(--text-muted)] opacity-70" />
                <span className="text-[12px] font-bold text-[var(--text-accent)] tracking-wide">v{updateVersion}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content / Changelog Preview */}
        <div className="px-4 pb-3 relative z-10">
          <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mb-3">
            KManager AI has been upgraded with performance improvements and new RAG capabilities.
          </p>
          
          {/* Mini Feature List */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-main)]/80">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span>Enhanced vector search accuracy</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[var(--text-main)]/80">
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span>Reduced memory footprint</span>
            </div>
          </div>
        </div>

        {/* Footer Status Bar */}
        <div className="px-4 py-2.5 bg-black/30 border-t border-white/[0.06] flex items-center justify-between backdrop-blur-sm">
          <span className="text-[10px] font-bold tracking-wider text-[var(--text-muted)] uppercase opacity-80">Download Status</span>
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-bold text-emerald-400 tracking-wide">Ready to install</span>
          </div>
        </div>

      </div>
    </div>
  )
}

export default UpdateDetails