import React, { Suspense, lazy } from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import '../../../assets/horizontal.css'

import { resolveRelativeMedia, formatMarkdownText, formatJsonContent } from './DocumentFormatters'
import DocumentAdaptiveCodeBlock from './DocumentAdaptiveCodeBlock'
import { cleanMarkdownComponents } from './DocumentMarkdownComponents'

const ReactMarkdown = lazy(() => import('react-markdown'))

const DocumentRenderer = ({ content, category = 'DOCUMENT', fileTitle = '', vaultPath = '', results = null, className, maxLength = 150000 }) => {
  React.useEffect(() => {
    if (results && Array.isArray(results) && results.length > 0) {
      window.__currentSearchMappedResults = results
    }
  }, [results])

  const components = React.useMemo(() => {
    if (!vaultPath) return cleanMarkdownComponents
    return {
      ...cleanMarkdownComponents,
      img: ({node, src, alt, ...props}) => cleanMarkdownComponents.img({node, src: resolveRelativeMedia(src, vaultPath), alt, ...props}),
      a: ({node, href, children, ...props}) => cleanMarkdownComponents.a({node, href: resolveRelativeMedia(href, vaultPath), children, ...props})
    }
  }, [vaultPath])

  if (!content) return null
  const safeContent = typeof content !== 'string' && category !== 'JSON' ? String(content) : content
  const ext = fileTitle ? fileTitle.split('.').pop().toLowerCase() : ''
  
  // Prevent AI Responses (which might have titles like "Explain index.js") from being rendered entirely as code files.
  const isCodeFile = category !== 'AI_RESPONSE' && ['py', 'js', 'jsx', 'ts', 'tsx', 'sql', 'html', 'css', 'sh', 'bash', 'java', 'cpp', 'c', 'rust', 'go'].includes(ext)

  if (category === 'JSON' || ext === 'json') {
    const formattedJson = formatJsonContent(safeContent, maxLength)
    if (formattedJson !== null) {
      return (
        <DocumentAdaptiveCodeBlock code={formattedJson} language="json" title="JSON Data" showLineNumbers={true} />
      )
    }
  }

  if (isCodeFile) {
    const codeContent = safeContent.length > maxLength 
      ? safeContent.slice(0, maxLength) + '\n\n... [Content truncated for performance]'
      : safeContent
      
    return (
      <DocumentAdaptiveCodeBlock code={codeContent.trim()} language={ext || 'text'} title={`${ext} Source File`} showLineNumbers={true} />
    )
  }

  const formattedContent = formatMarkdownText(safeContent)

  return (
    <div className={className || "text-[var(--text-main)] text-[14.5px] leading-relaxed max-w-full overflow-visible"}>
      <Suspense fallback={<div className="flex items-center justify-center py-10 text-[var(--text-muted)] animate-pulse text-sm">Loading document...</div>}>
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, rehypeKatex]} components={components}>
          {formattedContent}
        </ReactMarkdown>
      </Suspense>
    </div>
  )
}

export default DocumentRenderer
export { remarkMath, rehypeKatex, formatMarkdownText }
// Also re-export components used by other files
export { WikiHoverCite, cleanMarkdownComponents, renderCalloutOrParagraph } from './DocumentMarkdownComponents'
