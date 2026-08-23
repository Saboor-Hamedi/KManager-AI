import { PanelLeft, PanelLeftClose, Search } from 'lucide-react'
import PDFUploadZone from './search/PDFUploadZone'

const Header = ({ toggleSidebar, collapsed }) => {
  return (
    <header className="h-[36px] min-h-[36px] border-b border-white/[0.04] bg-[var(--bg-sidebar)] flex items-stretch shrink-0 z-50 relative select-none">
      {/* Left: sidebar toggle */}
      <div className="flex items-center px-4 shrink-0">
        <button
          onClick={toggleSidebar}
          title="Toggle sidebar (Ctrl+B)"
          className="p-1 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0"
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </div>

      {/* Center Absolute: SpotLite Search Input */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[280px] z-40 px-4">
        <div className="relative w-full group cursor-pointer" onClick={() => window.dispatchEvent(new CustomEvent('open-spotlite'))}>
          <input 
            type="text" 
            placeholder="Ask anything..." 
            readOnly
            className="w-full bg-black/20 border border-white/[0.03] group-hover:bg-black/40 group-hover:border-white/[0.08] rounded-[6px] py-1 pl-8 pr-3 text-[11.5px] text-[var(--text-main)] outline-none cursor-pointer transition-colors shadow-inner pointer-events-none"
          />
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center opacity-60 group-hover:opacity-100 transition-opacity">
            <kbd className="text-[9.5px] font-mono px-1.5 py-[2px] rounded-[3px] bg-white/[0.04] text-white/40 tracking-wider outline-none border-none shadow-none uppercase">
              Ctrl+K
            </kbd>
          </div>
        </div>
      </div>

      {/* Right/Fill: Library Drop Zone (restoring flex-1) */}
      <div className="flex-1 flex flex-col justify-center min-w-0 pr-2 z-0">
        <PDFUploadZone isHeader={true} />
      </div>
    </header>
  )
}

export default Header
