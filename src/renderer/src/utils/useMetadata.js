import { useMemo } from 'react'

/**
 * Strips ONLY metadata blocks from document content. Never touches real content lists.
 *
 * The metadata in uploaded MD files looks exactly like this (on line 1):
 * <ul class="list-disc pl-5 ..."><li ...><strong ...>Id:</strong> 0b21a886-...</li>
 *   <li ...><strong>Title:</strong> ...</li> ... <li ...><strong>IsPinned:</strong> false</li></ul>
 *
 * Safety: Real content <ul> lists never contain "Id:" followed by a UUID.
 */
export function cleanMetadata(content) {
  if (!content || typeof content !== 'string') {
    return content
  }

  let c = content

  // PRIMARY: Strip the metadata <ul> block.
  // Identified by containing an <li> whose text is "Id: <uuid-like-string>".
  // The UUID pattern [\w-]{10,} is permissive enough to handle any ID format.
  // Using a global replace so it handles multiple chunks if needed.
  c = c.replace(/<ul[^>]*>[\s\S]*?>\s*Id:\s*[\w-]{10,}[\s\S]*?<\/ul>\s*/gi, '')

  // SECONDARY: Strip metadata if it was rendered as a plain <div> paragraph.
  // (happens when content is pre-rendered HTML stored in DB)
  c = c.replace(/<div[^>]*>\s*Id:\s*[\w-]{4,}[^<]*<\/div>\s*/gi, '')

  // CLEANUP: Strip leading/trailing horizontal-dividers that wrapped the metadata block.
  // Only run twice at the START of remaining content (won't touch mid-document dividers).
  const dividerRe = /^\s*<div[^>]*class="[^"]*horizontal-divider[^"]*"[^>]*>\s*<\/div>\s*/i
  c = c.replace(dividerRe, '')
  c = c.replace(dividerRe, '')

  // PLAIN TEXT: Strip metadata when Postgres ts_headline strips HTML tags from snippet.
  // Content would start with: "Id: 386574a1-... Title: ... Language: ..."
  if (/^\s*Id:\s*[\w-]{4,}/i.test(c)) {
    c = c.replace(/^\s*Id:\s*[\w-]+\s*/i, '')
    c = c.replace(/^Title:\s*.*?(?=\s+(?:Language|Tags|Selection|IsPinned|CustomIcon|Timestamp):|$)/i, '')
    c = c.replace(/^\s*Language:\s*\S+\s*/i, '')
    c = c.replace(/^\s*Tags:\s*(?:'[^']*'|\S+)\s*/i, '')
    c = c.replace(/^\s*Selection:\s*\S+\s*/i, '')
    c = c.replace(/^\s*IsPinned:\s*\S+\s*/i, '')
    c = c.replace(/^\s*CustomIcon:\s*\S+\s*/i, '')
    c = c.replace(/^\s*Timestamp:\s*\d+\s*/i, '')
  }

  return c.replace(/^\s+/, '')
}

/**
 * Strips markdown and HTML syntax to produce clean plain text for previews.
 * Safe to call on both raw markdown and pre-rendered HTML content.
 */
export function stripMarkdown(content) {
  if (!content || typeof content !== 'string') return ''

  let t = content

  // Strip HTML tags first (handles pre-rendered content)
  t = t.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  t = t.replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#039;/g, "'")
       .replace(/&nbsp;/g, ' ')

  // Strip markdown headings (#, ##, ###, ...)
  t = t.replace(/^#{1,6}\s+/gm, '')

  // Strip bold/italic (**text**, *text*, __text__, _text_)
  t = t.replace(/(\*{1,3}|_{1,3})(.*?)\1/g, '$2')

  // Strip inline code (`code`)
  t = t.replace(/`[^`]*`/g, '')

  // Strip blockquotes (> text)
  t = t.replace(/^>\s+/gm, '')

  // Strip horizontal rules (---, ***, ___)
  t = t.replace(/^[-*_]{3,}\s*$/gm, '')

  // Strip list markers (- item, * item, 1. item)
  t = t.replace(/^[\s]*[-*+]\s+/gm, '')
  t = t.replace(/^[\s]*\d+\.\s+/gm, '')

  // Strip links [text](url) → text
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')

  // Strip images ![alt](url)
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, '')

  // Strip wikilinks [[Page|alias]] or [[Page]]
  t = t.replace(/\[\[([^\]|]*)\|?[^\]]*\]\]/g, '$1')

  // Strip code block fences (```language)
  t = t.replace(/^```[a-z]*\s*$/gm, '')

  // Strip Markdown table separator rows (e.g. |---|---|)
  t = t.replace(/^[\s|]*[-:]+[\s|:-]*\|.*$/gm, '')

  // Strip Markdown table pipes (replace with space to keep words separate)
  t = t.replace(/\|/g, ' ')

  // Collapse whitespace
  t = t.replace(/\s+/g, ' ').trim()

  return t
}

export function useMetadata(content) {
  return useMemo(() => ({
    cleanContent: cleanMetadata(content),
    metadata: null
  }), [content])
}
