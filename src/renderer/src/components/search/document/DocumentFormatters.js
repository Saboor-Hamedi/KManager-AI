export const resolveRelativeMedia = (src, vaultPath) => {
  if (!src || src.startsWith('http') || src.startsWith('data:') || src.startsWith('file://') || src.startsWith('blob:')) return src
  if (!vaultPath) return src
  
  // Normalize slashes and remove the file name to get the directory
  const normalizedVault = vaultPath.replace(/\\/g, '/')
  const vaultDir = normalizedVault.includes('/') ? normalizedVault.substring(0, normalizedVault.lastIndexOf('/')) : ''
  
  // Clean the relative path
  let cleanSrc = src
  if (cleanSrc.startsWith('./')) cleanSrc = cleanSrc.substring(2)
  
  return `file:///${vaultDir}/${cleanSrc}`
}

export const formatMarkdownText = (text) => {
  if (!text || typeof text !== 'string') return ''

  // Normalize LaTeX math expressions before markdown parsing:
  // 1. Convert block \[ ... \] to $$ ... $$
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`)
  // 2. Convert inline \( ... \) to $ ... $
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`)
  // 3. Convert square-bracketed equations right on a line (e.g. [ f_{\text{Hybrid}}(q, d) = \alpha ... ]) into $$ ... $$
  text = text.replace(
    /^\s*\[\s*([^\]\n]*?(?:\\(?:text|alpha|beta|gamma|delta|frac|sum|cdot|int|prod|sigma|theta|omega|partial|mu|pi|lambda|epsilon|_|\^)|[_^]\{|[_^][A-Za-z0-9]|=|\+)[^\]\n]*?)\s*\]\s*$/gm,
    (_, m) => `\n$$\n${m.trim()}\n$$\n`
  )
  // 4. Convert inline `[ f_{\text{...}} = ... ]` inside paragraphs when it contains distinct LaTeX math keywords
  text = text.replace(
    /\[\s*([^\]\n]*?(?:\\(?:text|alpha|beta|gamma|delta|frac|sum|cdot|int|prod|sigma|theta|omega|partial|mu|pi|lambda|epsilon)|[_^]\{)[^\]\n]*?)\s*\]/g,
    (_, m) => `$$ ${m.trim()} $$`
  )

  // Restore newlines between collapsed markdown table rows (| foo || bar | -> | foo |\n| bar |)
  let result = text
    .replace(/(\|\s*[-:]+[-| :]*\|)\s*\|/g, '$1\n|')
    .replace(/\|\s*\|\s*(?=[A-Za-z0-9*_`\[|])/g, '|\n| ')
    .replace(/\|\s+\|/g, '|\n|')

  // 0. Remove completely hallucinated ```markdown fences around the whole document
  result = result.replace(/^```(markdown|md|text)?\n([\s\S]*?)\n```\s*$/g, '$2')
  
  // 0.5 Remove 4-space indentations that cause accidental code blocks (except for lists)
  result = result.replace(/^( {4}|\t)(?!\s*[-*+]\s|\s*\d+\.\s)/gm, '')

  // 0.55 Remove wrapping parentheses around code blocks that the AI sometimes generates (e.g. `( ```mermaid ... ``` )`)
  result = result.replace(/\(\s*(```[a-z]*[\s\S]*?```)\s*\)/gi, '\n\n$1\n\n')

  // 0.6 Ensure ``` code blocks are isolated on their own lines to prevent being trapped in headings or lists
  // 1. Move any text immediately preceding backticks to its own line
  result = result.replace(/([^\n])\s*(```)/g, '$1\n\n$2')
  // 2. Move any text immediately following backticks (after the language tag) to its own line
  result = result.replace(/(```[a-zA-Z0-9-]*)\s+([^\n])/g, '$1\n\n$2')

  // Decode literal hex escape sequences (e.g. \xf4, $'\xf4') into actual characters
  result = result.replace(/(?:\$')?\\x([0-9a-fA-F]{2})'?/g, (match, hex) => {
    try {
      // First try URI decode (handles some utf-8 bytes)
      return decodeURIComponent('%' + hex)
    } catch {
      // Fallback to basic char code
      return String.fromCharCode(parseInt(hex, 16))
    }
  })

  // Auto-convert raw online image URLs into markdown image syntax
  // Looks for http/https URLs ending in common image extensions that aren't already wrapped in markdown links/images or HTML tags
  result = result.replace(/(?<!\]\()(?<!src=["'])(https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?[^\s"'<>]*)?)/gi, (match) => {
    return `![Image](${match})`
  })

  // Detect lines that are a pipe or comma-separated list of [[wikilinks]], possibly with a prefix like "**Links**: "
  // Convert them into a vertical stack with controlled tight gaps.
  result = result.replace(
    /^(?:(\*\*?[^*:]+\*\*?:\s*)|([A-Za-z0-9_-]+:\s*))?(\[\[[^\]]+\]\]\s*(?:(?:\||,)\s*\[\[[^\]]+\]\]\s*)+)$/gm,
    (line, boldPrefix, plainPrefix, tagsPart) => {
      const prefix = boldPrefix || plainPrefix || ''
      const tags = [...tagsPart.matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1])
      
      let out = `<span class="flex flex-col items-start gap-2.5 mt-2 mb-4 w-full">`
      if (prefix) out += `<span class="mb-1 leading-relaxed">${prefix.trim()}</span>`
      out += tags.map(t => `<span class="leading-relaxed">\`wikilink:${t}\`</span>`).join('')
      out += `</span>`
      return out
    }
  )

  // Convert remaining standalone [[wikilinks]] to inline wikilink tokens
  result = result.replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, (_, page) => `\`wikilink:${page.trim()}\``)

  // Convert [Source X] / [Source X: Title] / [Doc X] / standalone [1] into `sourcecite:` tokens
  // Display numbers are ALWAYS sequential 1, 2, 3... in order of first appearance
  let citeCounter = 1
  const citeMap = new Map() // key → sequential display number

  const assignCite = (idx, title) => {
    const key = String(idx).trim()
    if (!citeMap.has(key)) {
      citeMap.set(key, citeCounter++)
    }
    const displayNum = citeMap.get(key)
    return `\`sourcecite:${key}${title ? `|${title}` : ''}|${displayNum}\``
  }

  result = result.replace(/\[(?:Source|Doc)\s*#?\s*([0-9a-zA-Z-]+)(?:\s*:\s*([^\]]+))?\]/gi, (match, idx, title) => {
    return assignCite(idx, title)
  })

  result = result.replace(/(?<!\])\[([0-9]+)\](?!\]|\()/g, (match, idx) => {
    return assignCite(idx)
  })
  
  // RAG references: convert bold/italic RAG "References" footers into nice tags
  result = result.replace(/^\s*\*?\s*(?:References|Vault|Sources)(?:\s*:)?\s*(?:Vault\s*:)?\s*(.*?)\*?\s*$/gim, (match, content) => {
    if (!content.trim()) return '\n### References\n'
    
    // Split by | if there are multiple items on one line
    const items = content.split(/(?:\|)\s*/).filter(Boolean)
    if (items.length > 1) {
      // Put them separated by spaces so they render as a beautiful wrap-around tag cloud!
      return '\n### References\n\n' + items.map(item => item.trim()).join(' ') + '\n'
    }
    
    return `\n### References\n\n${content.trim()}\n`
  })

  // Clean up and normalize Markdown tables across chunks so they always render properly inside unified wrappers
  const lines = result.split('\n')
  const formattedLines = []
  let inTable = false
  let tableRowCount = 0

  for (let i = 0; i < lines.length; i++) {
    let trimmed = lines[i].trim()

    // Smart table row detection: recover table headers or rows where leading/trailing pipe (|) was omitted or stripped
    // e.g., "Retrieval latency | Index performance |" right before a table separator or row
    const pipeCount = (trimmed.match(/\|/g) || []).length
    const isSeparatorLine = pipeCount >= 1 && (
      /^\s*\|?\s*[-:]+\s*\|\s*[-:]+/.test(trimmed) ||
      /\|\s*[-:]+\s*\|/.test(trimmed)
    )

    if (!trimmed.startsWith('|') && pipeCount >= 1) {
      const nextTrimmed = (i + 1 < lines.length) ? lines[i + 1].trim() : ''
      const prevTrimmed = (i - 1 >= 0) ? lines[i - 1].trim() : ''
      const nextPipeCount = (nextTrimmed.match(/\|/g) || []).length
      const nextIsSep = nextPipeCount >= 1 && (/^\s*\|?\s*[-:]+\s*\|\s*[-:]+/.test(nextTrimmed) || /\|\s*[-:]+\s*\|/.test(nextTrimmed))
      const prevPipeCount = (prevTrimmed.match(/\|/g) || []).length
      const prevIsSepOrRow = prevTrimmed.startsWith('|') || (prevPipeCount >= 1 && (/^\s*\|?\s*[-:]+\s*\|\s*[-:]+/.test(prevTrimmed) || /\|\s*[-:]+\s*\|/.test(prevTrimmed)))
      
      // If this row is right above a table separator, right below a table row/separator, or ends with '|' with multiple columns
      if (nextIsSep || nextTrimmed.startsWith('|') || prevIsSepOrRow || (trimmed.endsWith('|') && pipeCount >= 1)) {
        trimmed = '| ' + trimmed
      }
    }

    const isTableRow = isSeparatorLine || (trimmed.startsWith('|') && (trimmed.endsWith('|') || pipeCount >= 1))

    if (isTableRow) {
      if (!trimmed.endsWith('|')) {
        trimmed = trimmed + ' |'
      }
      if (!inTable) {
        inTable = true
        tableRowCount = 0
      }
      
      const colCount = Math.max(1, (trimmed.match(/\|/g) || []).length - 1)

      if (tableRowCount === 0 && isSeparatorLine) {
        // If a chunked table starts with just the separator line (`| --- | --- |`), prepend a clean header
        const headerRow = '| ' + Array(colCount).fill(0).map((_, idx) => `Col ${idx + 1}`).join(' | ') + ' |'
        formattedLines.push(headerRow)
        const cleanSeparator = '| ' + Array(colCount).fill('---').join(' | ') + ' |'
        formattedLines.push(cleanSeparator)
        tableRowCount += 2
        continue
      }

      if (isSeparatorLine) {
        // Normalize any `--` / `---` separator row to clean `| --- | --- |`
        const cleanSeparator = '| ' + Array(colCount).fill('---').join(' | ') + ' |'
        formattedLines.push(cleanSeparator)
      } else {
        formattedLines.push(trimmed)
        // If this was row 0 (the header) and the next line is NOT a separator line, insert a clean separator right after row 0
        if (tableRowCount === 0 && i + 1 < lines.length) {
          const nextTrimmed = lines[i + 1].trim()
          const nextPipeCount = (nextTrimmed.match(/\|/g) || []).length
          const nextIsSeparator = nextPipeCount >= 1 && (/^\s*\|?\s*[-:]+\s*\|\s*[-:]+/.test(nextTrimmed) || /\|\s*[-:]+\s*\|/.test(nextTrimmed))
          if ((nextTrimmed.startsWith('|') || nextPipeCount >= 1) && !nextIsSeparator && !nextTrimmed.includes('---')) {
            formattedLines.push('| ' + Array(colCount).fill('---').join(' | ') + ' |')
          }
        }
      }
      tableRowCount++
    } else {
      inTable = false
      tableRowCount = 0
      formattedLines.push(lines[i])
    }
  }

  let finalResult = formattedLines.join('\n')

  // ── Make chunks flow like real, properly formatted paragraphs ──
  // 1. Capitalize the very first letter of the text if it is lowercase ([a-z])
  finalResult = finalResult.replace(/^(\s*(?:[>*#\-\d.]+\s+)*)([a-z])/gm, (_, prefix, char) => prefix + char.toUpperCase())
  
  // 2. Capitalize the first letter right after a period, question mark, or exclamation point if lowercase
  finalResult = finalResult.replace(/([.!?]\s+|\n\n\s*|\n\s*-\s+|\n\s*\d+\.\s+)([a-z])/g, (_, prefix, char) => prefix + char.toUpperCase())

  // ── Smart Section & Numbered List Formatting ──
  // Break inline numbered list items (`1. `, `2. ` or `1) `, `2) `) onto double newlines when following punctuation or continuing a list
  finalResult = finalResult.replace(/([.:!?;])\s+(\d{1,2}[\.\)])\s+([A-Z])/g, '$1\n\n$2 $3')
  finalResult = finalResult.replace(/([.:!?;])\s+(\d{1,2}[\.\)])\s+([A-Z])/g, '$1\n\n$2 $3')

  // Break inline numbered headings/sections (`2:3b Program input files:`, `1: Embedding strategies`) onto double newlines as distinct headers
  finalResult = finalResult.replace(/([.:!?;])\s+(\d{1,2}(?::[0-9a-zA-Z]+)?\s+[^.:!?;]+:)\s+([A-Z])/g, '$1\n\n### $2\n\n$3')

  // Ensure any heading (#, ##, ###) is strictly preceded and followed by blank lines so react-markdown always renders an actual heading tag
  finalResult = finalResult.replace(/([^\n])\s*\n*(#{1,6}\s+[^\n]+)/g, '$1\n\n$2')
  finalResult = finalResult.replace(/(#{1,6}\s+[^\n]+)\n+([^\n#])/g, '$1\n\n$2')

  // Break right after introductory colons when immediately followed by a list item (`The following is the process:\n\n1. ...`)
  finalResult = finalResult.replace(/:\s+(\d{1,2}[\.\)])\s+/g, ':\n\n$1 ')

  // 3. Clean up artificial single line breaks from PDF extraction while keeping paragraphs, tables, and lists intact
  const paragraphLines = finalResult.split('\n')
  const cleanedParagraphs = []
  let currentParagraph = []
  let insideBlock = false

  for (let i = 0; i < paragraphLines.length; i++) {
    const line = paragraphLines[i]
    const trimmed = line.trim()

    const isSpecialLine = trimmed.startsWith('|') || 
                          trimmed.startsWith('#') || 
                          trimmed.startsWith('- ') || 
                          trimmed.startsWith('* ') || 
                          trimmed.startsWith('> ') || 
                          trimmed.match(/^\d+[\.\)]\s+/) || 
                          trimmed.startsWith('```') || 
                          trimmed.startsWith('$$') || 
                          trimmed.includes('---') || 
                          trimmed.startsWith('`wikilink:') ||
                          trimmed.startsWith('`sourcecite:')

    const backticksCount = (trimmed.match(/```/g) || []).length
    if (backticksCount % 2 !== 0 || trimmed.startsWith('$$')) {
      insideBlock = !insideBlock
    }

    if (insideBlock || isSpecialLine || trimmed === '') {
      if (currentParagraph.length > 0) {
        cleanedParagraphs.push(currentParagraph.join(' '))
        currentParagraph = []
        if (isSpecialLine && cleanedParagraphs.length > 0 && cleanedParagraphs[cleanedParagraphs.length - 1] !== '') {
          cleanedParagraphs.push('')
        }
      }
      if (isSpecialLine && (trimmed.startsWith('#') || trimmed.match(/^\d+[\.\)]\s+/)) && cleanedParagraphs.length > 0 && cleanedParagraphs[cleanedParagraphs.length - 1] !== '') {
        cleanedParagraphs.push('')
      }
      cleanedParagraphs.push(line)
      if (isSpecialLine && trimmed.startsWith('#')) {
        cleanedParagraphs.push('')
      }
    } else {
      currentParagraph.push(trimmed)
    }
  }
  if (currentParagraph.length > 0) {
    cleanedParagraphs.push(currentParagraph.join(' '))
  }

  const endRefsParagraphs = cleanedParagraphs.map(line => {
    if (!line.includes('`sourcecite:')) return line
    const citeTokens = []
    let cleaned = line.replace(/`sourcecite:([^|`]+)(?:\|([^|`]*))?(?:\|([^|`]*))?`/g, (match) => {
      citeTokens.push(match)
      return ''
    })
    cleaned = cleaned.replace(/\s+([.,!?;:])/g, '$1').replace(/\s{2,}/g, ' ').trimEnd()
    if (citeTokens.length > 0) {
      return cleaned + (cleaned.length > 0 ? ' ' : '') + citeTokens.join(' ')
    }
    return cleaned
  })

  return endRefsParagraphs.join('\n')
}

export const formatJsonContent = (content, maxLength = 150000) => {
  if (!content) return ''
  
  if (typeof content === 'object') {
    try {
      const stringified = JSON.stringify(content, null, 2)
      return stringified.length > maxLength 
        ? stringified.slice(0, maxLength) + '\n\n... [Content truncated for performance]' 
        : stringified
    } catch (e) {
      return String(content).slice(0, maxLength)
    }
  }
  
  if (typeof content !== 'string') return String(content).slice(0, maxLength)
  
  try {
    const parsed = JSON.parse(content)
    const stringified = JSON.stringify(parsed, null, 2)
    return stringified.length > maxLength 
      ? stringified.slice(0, maxLength) + '\n\n... [Content truncated for performance]' 
      : stringified
  } catch (e) {
    // If it's completely missing JSON brackets, it's probably pure extracted text from the DB.
    // Return null so the renderer can fall back to standard text/markdown.
    if (!content.includes('{') && !content.includes('[')) {
      return null
    }

    let displayStr = content
    if (!displayStr.includes('\n') && displayStr.includes('":"')) {
      displayStr = displayStr
        .replace(/","/g, '",\n  "')
        .replace(/\{"/g, '{\n  "')
        .replace(/"\}/g, '"\n}')
    }
    
    return displayStr.slice(0, maxLength) + (displayStr.length > maxLength ? '\n\n... [Content truncated]' : '')
  }
}
