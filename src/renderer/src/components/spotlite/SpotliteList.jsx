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
  switch (category) {
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
    case 'AI_RESPONSE': return MessageSquare
    default: return File
  }
}

const SpotliteList = ({ results, selectedIndex, setSelectedIndex, setHoveredDoc }) => {
  return (
    <div className="p-2 flex flex-col gap-1">
      {results.map((doc, idx) => {
        const Icon = getFileIcon(doc.category)
        
        let displayPath = ''
        if (doc.category === 'AI_RESPONSE') {
          displayPath = 'Saved AI Response'
        } else {
          displayPath = doc.vault_path.split(/[\\/]/).slice(0, -1).join('\\')
        }

        return (
          <div
            key={idx}
            onClick={() => {
              setSelectedIndex(idx)
              setHoveredDoc(doc)
            }}
            className={`px-3 py-2.5 rounded-md cursor-pointer transition-colors flex flex-col gap-1 ${selectedIndex === idx ? 'bg-[var(--text-accent)]/10 shadow-sm' : 'hover:bg-white/[0.03]'}`}
          >
             <div className="flex items-center gap-2">
               <Icon size={14} strokeWidth={2.5} className={`shrink-0 ${selectedIndex === idx ? 'text-[var(--text-accent)]' : 'text-[var(--text-accent)]/60'}`} />
               <span className={`text-[12px] font-semibold truncate leading-none ${selectedIndex === idx ? 'text-[var(--text-accent)]' : 'text-[var(--text-main)]'}`}>{doc.title}</span>
             </div>
             <div className="flex items-center justify-between mt-1">
               <span className={`text-[10px] truncate pl-5 font-mono leading-none flex-1 ${selectedIndex === idx ? 'text-[var(--text-accent)]/70' : 'text-[var(--text-faint)]'}`}>
                 {displayPath}
               </span>
               {doc.file_size != null && (
                 <span className={`text-[10px] font-mono whitespace-nowrap ml-2 shrink-0 ${selectedIndex === idx ? 'text-[var(--text-accent)]/70' : 'text-[var(--text-muted)]'}`}>
                   {formatBytes(doc.file_size)}
                 </span>
               )}
             </div>
          </div>
        )
      })}

    </div>
  )
}

export default React.memo(SpotliteList)
