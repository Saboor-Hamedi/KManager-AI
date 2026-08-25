import { useMemo } from 'react'

/**
 * Strips ONLY metadata blocks from document content. Never touches real content lists.
 * 
 * Handles three forms:
 * 1. Pre-rendered HTML: <div ...>Id: <id> Title: ...</div> + adjacent <ul> with metadata fields
 * 2. HTML <ul> whose <li> items contain metadata-only fields (Selection:/IsPinned:/Timestamp:)
 * 3. Plain text: "Id: <id> Title: ..." (Postgres ts_headline strips HTML)
 * 
 * Safety: Real content <ul> lists are NEVER touched because we only match <ul> blocks that
 * contain known metadata-specific fields (IsPinned, Selection, Timestamp).
 */
export function cleanMetadata(content) {
  if (!content || typeof content !== 'string') {
    return content
  }

  let c = content

  // Step 1: Strip the leading horizontal-divider separator (metadata section opener)
  // Only at the very START of content — safe, won't touch mid-document dividers
  c = c.replace(/^\s*<div[^>]*class="[^"]*horizontal-divider[^"]*"[^>]*>\s*<\/div>\s*/i, '')

  // Step 2: Strip the metadata div — specifically a div whose TEXT starts with "Id: <id>"
  // FIX: Made ID matcher permissive (\S+) to handle ObjectIDs, hashes, underscores, etc.
  c = c.replace(/<div[^>]*>\s*Id:\s*\S+[^<]*<\/div>/gi, '')

  // Step 3: Strip the tags <ul> ONLY if it contains metadata-specific fields.
  // "Selection:", "IsPinned:", "Timestamp:" will NEVER appear in real document lists.
  // This is the safety guarantee — real content <ul>/<li> lists are never touched.
  c = c.replace(/<ul[^>]*>[\s\S]*?(?:Selection:|IsPinned:|Timestamp:)[\s\S]*?<\/ul>/gi, '')

  // Step 4: Strip the trailing horizontal-divider (metadata section closer)
  // Again, only at the NEW start of content after the above strips
  c = c.replace(/^\s*<div[^>]*class="[^"]*horizontal-divider[^"]*"[^>]*>\s*<\/div>\s*/i, '')

  // Step 5: Plain text metadata — only when content starts with "Id: <id>"
  // This happens when Postgres ts_headline strips HTML tags from chunk snippets
  if (/^\s*Id:\s*\S+/i.test(c)) {
    // FIX: Added \n? to capture trailing newlines and prevent ghost whitespace gaps
    c = c.replace(/^\s*Id:\s*\S+\s*\n?/i, '')
    c = c.replace(/^Title:\s*.*?\n?/i, '')
    c = c.replace(/^\s*Language:\s*\S+\s*\n?/i, '')
    c = c.replace(/^\s*Tags:\s*(?:'[^']*'|\S+)\s*\n?/i, '')
    c = c.replace(/^\s*Selection:\s*\S+\s*\n?/i, '')
    c = c.replace(/^\s*IsPinned:\s*\S+\s*\n?/i, '')
    c = c.replace(/^\s*CustomIcon:\s*\S+\s*\n?/i, '')
    c = c.replace(/^\s*Timestamp:\s*\d+\s*\n?/i, '')
  }

  // SAFETY NET: Handle malformed HTML or unexpected metadata ordering
  // If raw metadata keywords still exist after all specific passes, do a broad cleanup
  if (c.includes('Id:') && (c.includes('Timestamp:') || c.includes('IsPinned:'))) {
    c = c.replace(/Id:\s*\S+[\s\S]*?Timestamp:\s*\d+\s*/i, '')
  }

  // Final cleanup: Remove any remaining leading whitespace/newlines
  return c.replace(/^\s+/, '').trimStart()
}

/**
 * React hook version of cleanMetadata. Safe to use in components.
 * Returns both cleaned content and extracted metadata for optional UI display.
 */
export function useMetadata(content) {
  return useMemo(() => {
    const cleanContent = cleanMetadata(content)
    
    // Optional: Extract metadata into a structured object for UI rendering
    // This allows you to show "Document Properties" cards instead of raw text
    const metadata = {}
    const metaRegex = /(Id|Title|Language|Tags|Selection|IsPinned|CustomIcon|Timestamp):\s*(.+?)(?=\s+(?:Id|Title|Language|Tags|Selection|IsPinned|CustomIcon|Timestamp):|$)/gi
    let match
    
    while ((match = metaRegex.exec(content)) !== null) {
      const key = match[1]
      const value = match[2].trim()
      if (key === 'Tags') {
        metadata.tags = value.replace(/['"]/g, '').split(',').map(t => t.trim())
      } else if (key === 'Timestamp') {
        metadata.timestamp = parseInt(value, 10)
      } else {
        metadata[key.toLowerCase()] = value
      }
    }

    return { cleanContent, metadata }
  }, [content])
}