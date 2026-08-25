import React, { Suspense, lazy } from 'react'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import 'katex/dist/katex.min.css'
import '../../../assets/horizontal.css'

import { resolveRelativeMedia, formatMarkdownText, formatJsonContent } from './DocumentFormatters'
import DocumentAdaptiveCodeBlock from './DocumentAdaptiveCodeBlock'
import { cleanMarkdownComponents, renderCalloutOrParagraph } from './DocumentMarkdownComponents'
import Highlight from '../../spotlite/Highlight'
import { useMetadata } from '../../../utils/useMetadata'

const ReactMarkdown = lazy(() => import('react-markdown'))

const DocumentRenderer = ({ content, category = 'DOCUMENT', fileTitle = '', vaultPath = '', results = null, className, maxLength = 150000, searchQuery = '', highlightsRemoved = false }) => {
  React.useEffect(() => {
    if (results && Array.isArray(results) && results.length > 0) {
      window.__currentSearchMappedResults = results
    }
  }, [results])

  const components = React.useMemo(() => {
    let base = { ...cleanMarkdownComponents }
    
    if (vaultPath) {
      base.img = ({node, src, alt, ...props}) => cleanMarkdownComponents.img({node, src: resolveRelativeMedia(src, vaultPath), alt, ...props})
      base.a = ({node, href, children, ...props}) => cleanMarkdownComponents.a({node, href: resolveRelativeMedia(href, vaultPath), children, ...props})
    }

    if (searchQuery && !highlightsRemoved) {
      const renderWithHighlight = (children) => {
        if (typeof children === 'string') {
          return <Highlight text={children} query={searchQuery} disabled={highlightsRemoved} />
        }
        if (Array.isArray(children)) {
          return children.map((child, i) => (
            <React.Fragment key={i}>{renderWithHighlight(child)}</React.Fragment>
          ))
        }
        // If it's a React element, we can't easily recurse into it without cloneElement,
        // but react-markdown will pass the inner text through our other overridden components anyway!
        return children
      }

      const wrapOriginal = (OriginalComponent) => {
        if (!OriginalComponent) return undefined
        return ({ node, children, ...props }) => OriginalComponent({ node, children: renderWithHighlight(children), ...props })
      }

      const fallbackRender = (children, props) => (
        <div className="mb-4 last:mb-0 text-justify whitespace-pre-wrap" {...props}>
          {renderWithHighlight(children)}
        </div>
      )
      
      base.p = ({ node, children, ...props }) => renderCalloutOrParagraph(children, props, fallbackRender)
      base.li = wrapOriginal(cleanMarkdownComponents.li)
      base.h1 = wrapOriginal(cleanMarkdownComponents.h1)
      base.h2 = wrapOriginal(cleanMarkdownComponents.h2)
      base.h3 = wrapOriginal(cleanMarkdownComponents.h3)
      base.h4 = wrapOriginal(cleanMarkdownComponents.h4)
      base.strong = wrapOriginal(cleanMarkdownComponents.strong)
      base.em = wrapOriginal(cleanMarkdownComponents.em)
      base.blockquote = wrapOriginal(cleanMarkdownComponents.blockquote)
      base.td = wrapOriginal(cleanMarkdownComponents.td)
      base.th = wrapOriginal(cleanMarkdownComponents.th)
      base.span = wrapOriginal(cleanMarkdownComponents.span)
    }
    
    return base
  }, [vaultPath, searchQuery, highlightsRemoved])

  const rawSafeContent = typeof content !== 'string' && category !== 'JSON' ? String(content || '') : (content || '')
  const { cleanContent: safeContent, metadata } = useMetadata(rawSafeContent)
  
  if (!content) return null
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
