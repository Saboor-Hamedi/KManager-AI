import { User, PanelLeft } from 'lucide-react'

const Header = ({ toggleSidebar }) => {
  return (
    <header className="h-[50px] min-h-[50px] border-b border-[var(--border-dim)] bg-[var(--bg-activitybar)] flex items-center justify-between px-4 shrink-0 z-10">
      {/* Left: sidebar toggle + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          title="Toggle sidebar (Ctrl+B)"
          className="p-1.5 rounded hover:bg-[var(--bg-active)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
        >
          <PanelLeft size={16} />
        </button>
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] font-medium select-none">
          <span>Knowledge Base</span>
          <span className="opacity-40">/</span>
          <span className="text-[var(--text-main)]">Search & Explore</span>
        </div>
      </div>

      {/* Right: user identity — no glow */}
      <div className="flex items-center gap-2 cursor-pointer hover:bg-[var(--bg-active)] px-2.5 py-1.5 rounded-lg transition-colors">
        <div className="flex flex-col items-end leading-none">
          <span className="text-[10px] text-[var(--text-main)] font-semibold tracking-tight">Admin</span>
          <span className="text-[8px] text-[var(--text-faint)] font-medium tracking-widest mt-0.5">OPERATOR</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-[var(--icon-primary)] flex items-center justify-center">
          <User size={13} className="text-black" />
        </div>
      </div>
    </header>
  )
}

export default Header
