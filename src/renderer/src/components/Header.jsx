import { User } from 'lucide-react'

const Header = () => {
  return (
    <header className="h-[50px] min-h-[50px] border-b border-[var(--border-dim)] bg-[var(--bg-activitybar)] flex items-center justify-end px-6 sticky top-0 z-10 transition-colors duration-300">
      <div className="flex items-center gap-3 group cursor-pointer hover:bg-[var(--bg-active)] p-1.5 rounded transition-all">
        <div className="flex flex-col items-end">
          <span className="text-[8px] text-[var(--text-faint)] font-bold tracking-widest">Operator</span>
          <span className="text-[10px] text-[var(--text-main)] font-black tracking-tight">ADMIN_CORE</span>
        </div>
        <div className="w-7 h-7 rounded-full bg-[var(--icon-primary)] flex items-center justify-center text-[10px] font-bold text-[var(--bg-app)] border border-[var(--border-subtle)] shadow-[0_0_10px_var(--bg-active)]">
          <User size={14} />
        </div>
      </div>
    </header>
  )
}

export default Header
