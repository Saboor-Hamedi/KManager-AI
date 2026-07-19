import { PanelLeft, PanelLeftClose } from 'lucide-react'

const Header = ({ toggleSidebar, collapsed }) => {
  return (
    <header className="h-[50px] min-h-[50px] border-b border-[var(--border-dim)] bg-[var(--bg-sidebar)] flex items-center justify-between px-4 shrink-0 z-10 shadow-[var(--shadow-sm)]">
      {/* Left: sidebar toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          title="Toggle sidebar (Ctrl+B)"
          className="p-1.5 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
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
