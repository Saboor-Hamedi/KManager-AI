import { PanelLeft, PanelLeftClose } from 'lucide-react'

const Header = ({ toggleSidebar, collapsed }) => {
  return (
    <header className="h-[36px] min-h-[36px] border-b border-white/[0.04] bg-[var(--bg-sidebar)] flex items-center justify-between px-4 shrink-0 z-10 select-none">
      {/* Left: sidebar toggle + breadcrumb */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={toggleSidebar}
          title="Toggle sidebar (Ctrl+B)"
          className="p-1 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors border-0"
        >
          {collapsed ? <PanelLeft size={14} /> : <PanelLeftClose size={14} />}
        </button>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-medium select-none">
          <span className="text-[var(--text-faint)]">Knowledge Base</span>
          <span className="opacity-40">/</span>
          <span className="text-[var(--text-main)] font-semibold">Search &amp; Explore</span>
        </div>
      </div>
    </header>
  )
}

export default Header
