import React, { useState, useEffect } from 'react'
import { FileText, Home, SquarePen } from 'lucide-react'
import DocumentRenderer from '../search/document/DocumentRenderer'

import ScrollToTopButton from '../ScrollToTopButton'
import FilePathIndicator from '../FilePathIndicator'
import Highlight from './Highlight'

const SpotLitePreview = ({ selectedPdf, fullText, loadingText, fileExists, searchQuery, onClose, onDocumentUpdate }) => {
  const [isReady, setIsReady] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [localContent, setLocalContent] = useState(null)
  const [localTitle, setLocalTitle] = useState(null)
  const [localVaultPath, setLocalVaultPath] = useState(null)
  const [highlightsRemoved, setHighlightsRemoved] = useState(false)

  // Reset local content if a new file is opened
  useEffect(() => {
    setLocalContent(null)
    setLocalTitle(null)
    setLocalVaultPath(null)
    setHighlightsRemoved(false)
  }, [selectedPdf?.id, selectedPdf?.vault_path])

  // SpotLite already handles ESC globally for the modal, so we don't need a local ESC catcher.
  useEffect(() => {
    // Register global OS-level Escape catcher for PDF plugin
    if (window.api?.system?.registerEscape) {
      window.api.system.registerEscape()
    }

    return () => {
      if (window.api?.system?.unregisterEscape) {
        window.api.system.unregisterEscape()
      }
    }
  }, [])

  useEffect(() => {
    if (selectedPdf) {
      setIsReady(false)
      const t = setTimeout(() => setIsReady(true), 50)
      return () => clearTimeout(t)
    }
  }, [selectedPdf])

  if (!selectedPdf) return null

  let currentVaultPath = localVaultPath !== null ? localVaultPath : selectedPdf.vault_path

  const isPdf = selectedPdf.category === 'PDF' ||
    (currentVaultPath || '').toLowerCase().endsWith('.pdf')

  const isEditable = !isPdf && currentVaultPath

  const fileSrc = currentVaultPath
    ? `file:///${currentVaultPath.replace(/\\/g, '/')}`
    : null

  const handleEditToggle = () => {
    if (!isEditable) return
    if (isEditing) {
      setIsEditing(false)
    } else {
      setEditContent(localContent !== null ? localContent : (fullText || selectedPdf.content || ''))
      setEditTitle(localTitle !== null ? localTitle : selectedPdf.title)
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!isEditable) return
    setIsSaving(true)
    try {
      const displayTitle = localTitle !== null ? localTitle : selectedPdf.title
      const titleChanged = editTitle !== displayTitle
      
      const displayContent = localContent !== null ? localContent : (fullText || selectedPdf.content || '')
      const contentChanged = editContent !== displayContent

      if (!titleChanged && !contentChanged) {
        setIsEditing(false)
        setIsSaving(false)
        return
      }

      if (titleChanged) {
        const res = await window.api.db.updateDocumentTitle(currentVaultPath, editTitle)
        if (res?.success) {
          if (res.newVaultPath) {
            setLocalVaultPath(res.newVaultPath)
            currentVaultPath = res.newVaultPath
          }
          setLocalTitle(editTitle)
        } else {
          alert('Failed to rename file: ' + res?.error)
          setIsSaving(false)
          return
        }
      }

      if (contentChanged) {
        if (currentVaultPath.startsWith('ai-response-')) {
          // Direct database update for AI Responses
          const res = await window.api.db.updateAIResponse(currentVaultPath, editContent)
          if (!res?.success) throw new Error(res?.error || 'Failed to save AI response')
        } else {
          // Normal file save
          const res = await window.api.system.saveFileContent(currentVaultPath, editContent)
          if (res?.success) {
            await window.api.db.ingestFile(currentVaultPath)
          } else {
            throw new Error(res?.error || 'Failed to save file')
          }
        }
        setLocalContent(editContent)
      }
      
      setIsEditing(false)

      if (onDocumentUpdate) {
        onDocumentUpdate({
          ...selectedPdf,
          title: titleChanged ? editTitle : displayTitle,
          vault_path: currentVaultPath,
          content: contentChanged ? editContent : displayContent
        })
      }
    } catch (err) {
      alert('Error saving document: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div 
      className="w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-150 relative"
      onClick={() => {
        if (!highlightsRemoved) setHighlightsRemoved(true)
      }}
    >

        {/* Titlebar — matches GlobalTitleBar style (small, flat) */}
        <div
          className="flex items-center justify-between shrink-0 select-none bg-[var(--bg-panel)] border-b border-white/[0.04]"
          style={{ height: '32px' }}
        >
          <div className="flex items-center h-full flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-1.5 px-3 min-w-0 flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSaving) {
                        e.preventDefault()
                        handleSave()
                      }
                    }}
                    className="text-[11.5px] font-medium truncate shrink text-[var(--text-main)] bg-white/[0.05] border border-transparent rounded px-2 h-[22px] w-full max-w-[300px] focus:outline-none focus:bg-white/[0.08] transition-all flex items-center"
                  />
                ) : (
                  <span 
                    className={`text-[11.5px] font-medium truncate shrink text-[var(--text-main)] px-2 h-[22px] flex items-center ${isEditable ? 'cursor-text' : ''}`}
                    title={localTitle !== null ? localTitle : selectedPdf.title}
                    onDoubleClick={handleEditToggle}
                  >
                    <Highlight 
                      text={localTitle !== null ? localTitle : selectedPdf.title} 
                      query={searchQuery} 
                      disabled={highlightsRemoved} 
                    />
                  </span>
                )}
              
              <FilePathIndicator vaultPath={currentVaultPath} />
            </div>
          </div>

          <div className="flex items-center h-full shrink-0 pr-2">
            {isEditable && (
              isEditing ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleEditToggle}
                    disabled={isSaving}
                    className="h-[22px] px-2.5 rounded-[5px] text-[10.5px] font-semibold tracking-wide border-0 transition-colors bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.05] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-[22px] px-2.5 rounded-[5px] text-[10.5px] font-semibold tracking-wide border-0 transition-colors bg-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/[0.05] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Saving</span>
                      </>
                    ) : (
                      <span>Save</span>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleEditToggle}
                  className="flex items-center gap-1.5 h-[22px] px-2.5 rounded-[5px] text-[10.5px] font-semibold tracking-wide border-0 transition-colors bg-transparent text-[var(--text-muted)] hover:bg-white/[0.05] hover:text-[var(--text-main)]"
                >
                  <SquarePen size={12} />
                  Edit
                </button>
              )
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-hidden relative select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
          


          {/* ── PDF: render directly via file:// ── */}
          {isPdf && fileExists && fileSrc ? (
            <webview
              src={fileSrc}
              plugins="true"
              className="w-full h-full border-none bg-white relative z-0"
            />
          ) : isPdf && !fileExists ? (
            /* ── PDF but file missing: fallback to stored text ── */
            <div className="w-full h-full overflow-y-auto p-6 lg:p-10 custom-scrollbar bg-[var(--bg-app)] text-justify select-text" style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>
              <div className="max-w-3xl mx-auto pb-8">
                <div className="mb-4 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  Original file no longer on disk — showing archived text from database.
                </div>
                {fullText || selectedPdf.content ? (
                  <DocumentRenderer
                    className={`text-[var(--text-main)] text-[15px] leading-relaxed max-w-full overflow-visible text-justify select-text ${selectedPdf.category === 'TXT' ? 'whitespace-pre-wrap' : ''}`}
                    content={localContent !== null ? localContent : (fullText || selectedPdf.content)}
                    category={selectedPdf.category}
                    fileTitle={localTitle !== null ? localTitle : selectedPdf.title}
                    searchQuery={searchQuery}
                    highlightsRemoved={highlightsRemoved}
                  />
                ) : (
                  <div className="text-[var(--text-faint)] text-sm mt-10 text-center">No archived content available.</div>
                )}
              </div>
            </div>
          ) : (
            /* ── Non-PDF (MD, TXT, JSON, CSV, etc.) ── */
            <div
              className="w-full h-full overflow-y-auto p-6 lg:p-10 custom-scrollbar bg-[var(--bg-app)] text-justify select-text"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            >
              <div className={`max-w-3xl mx-auto ${isEditing ? 'h-full flex flex-col' : 'pb-6'}`}>
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    disabled={isSaving}
                    spellCheck={false}
                    className="w-full h-full flex-1 bg-transparent border-0 text-[14px] font-mono leading-relaxed text-[var(--text-main)] outline-none resize-none"
                  />
                ) : localContent !== null || fullText || selectedPdf.content ? (
                  <DocumentRenderer
                    className={`text-[var(--text-main)] text-[15px] leading-relaxed max-w-full overflow-visible text-justify select-text ${selectedPdf.category === 'TXT' ? 'whitespace-pre-wrap font-mono text-[13px]' : ''} ${selectedPdf.category === 'JSON' ? 'font-mono text-[13px]' : ''}`}
                    content={localContent !== null ? localContent : (fullText || selectedPdf.content)}
                    category={selectedPdf.category}
                    fileTitle={localTitle !== null ? localTitle : selectedPdf.title}
                    searchQuery={searchQuery}
                    highlightsRemoved={highlightsRemoved}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center mt-20 opacity-50">
                    <FileText size={48} className="text-[var(--text-muted)] mb-4" />
                    <div className="text-[var(--text-faint)] text-[13px] font-medium tracking-wide">No content available for this file.</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Scroll to Top Button */}
        <ScrollToTopButton className="absolute bottom-6 right-6" />
    </div>
  )
}

export default React.memo(SpotLitePreview)
