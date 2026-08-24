import React from 'react'
import { FileText, FileJson, FileSpreadsheet, Code, Database, File, Image as ImageIcon, MessageSquare } from 'lucide-react'

export const formatBytes = (bytes, decimals = 1) => {
  if (!+bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export const getFileIcon = (category) => {
  switch (category?.toUpperCase()) {
    case 'PDF': return FileText
    case 'JSON': return FileJson
    case 'CSV': 
    case 'XLSX': return FileSpreadsheet
    case 'MD':
    case 'TXT': return FileText
    case 'JS':
    case 'TS':
    case 'PY': return Code
    case 'DB':
    case 'SQL': return Database
    case 'PNG':
    case 'JPG':
    case 'JPEG':
    case 'SVG': return ImageIcon
    case 'AI_RESPONSE': 
    case 'AI': return MessageSquare
    default: return FileText
  }
}

import Highlight from './Highlight'

const SpotliteList = ({ results, query, selectedIndex, setSelectedIndex, setHoveredDoc }) => {
  return (
    <div className="p-2 flex flex-col gap-1">
      {results.map((doc, idx) => {
        const Icon = getFileIcon(doc.category)
        
        return (
          <div
            key={idx}
            onClick={() => {
              setSelectedIndex(idx)
              setHoveredDoc(doc)
            }}
            className={`group px-3 py-2.5 rounded-md cursor-pointer transition-colors flex flex-col gap-1.5 border border-transparent ${selectedIndex === idx ? 'bg-[var(--bg-active)] shadow-sm' : 'hover:bg-white/[0.03]'}`}
          >
             <div className="flex items-center gap-2 overflow-hidden w-full">
               <Icon size={14} className={`shrink-0 ${selectedIndex === idx ? 'text-[var(--text-accent)]' : 'text-[var(--text-muted)]'}`} />
               <div className="flex-1 min-w-0 pr-2">
                   <div className="text-[12px] font-semibold text-[var(--text-main)] truncate">
                     <Highlight text={doc.title} query={query} />
                   </div>
                   {doc.content && (
                     <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                       <Highlight text={doc.content.replace(/\s+/g, ' ')} query={query} />
                     </div>
                   )}
               </div>
               
               {/* Mini File Type Badge */}
               {(doc.file_type || doc.category) && (
                 <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider border ${
                   (doc.file_type?.toLowerCase() === 'ai_response' || doc.file_type?.toLowerCase() === 'ai' || doc.category?.toLowerCase() === 'ai' || doc.category?.toLowerCase() === 'ai_response')
                     ? 'bg-[#a855f7]/20 text-[#c084fc] border-[#a855f7]/30'
                     : 'bg-black/30 text-[var(--text-muted)] border-white/5'
                 }`}>
                   {doc.file_type || doc.category}
                 </span>
               )}
             </div>
             <div className="flex flex-col pl-6 relative">
               {/* Hover Actions (Copy) */}
               <div className={`absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 bg-[var(--bg-panel)] shadow-sm rounded flex items-center p-0.5 border border-white/5`}>
                 <button
                   onClick={(e) => {
                     e.stopPropagation()
                     navigator.clipboard.writeText(doc.vault_path)
                     const btn = e.currentTarget
                     const icon = btn.querySelector('svg')
                     btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-400"><polyline points="20 6 9 17 4 12"></polyline></svg>`
                     setTimeout(() => {
                       btn.innerHTML = icon.outerHTML
                     }, 2000)
                   }}
                   className="p-1 text-[var(--text-muted)] hover:text-white transition-colors"
                   title="Copy File Path"
                 >
                   <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                 </button>
               </div>

               {/* Breadcrumbs Context */}
               <span className="text-[9px] opacity-40 truncate font-mono mb-1.5 pr-6" title={doc.vault_path}>
                 {doc.vault_path ? doc.vault_path.split(/[\\/]/).slice(-3, -1).join(' > ') : ''}
               </span>
               
               {/* Metadata */}
               <span className="text-[9.5px] text-[var(--text-faint)]/60 leading-none flex items-center gap-1.5">
                 {doc.file_size ? <span className="font-mono">{formatBytes(doc.file_size)}</span> : null}
                 {doc.file_size && doc.created_at ? <span>•</span> : null}
                 {doc.created_at ? <span className="tracking-wider">{new Date(doc.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span> : null}
               </span>
             </div>
          </div>
        )
      })}
    </div>
  )
}

export default React.memo(SpotliteList)
