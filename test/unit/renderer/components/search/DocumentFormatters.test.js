import { describe, it, expect } from 'vitest'
import {
  resolveRelativeMedia,
  formatMarkdownText,
  formatJsonContent
} from '../../../../../src/renderer/src/components/search/DocumentFormatters'

describe('resolveRelativeMedia', () => {
  it('returns src unchanged for absolute/http/data/file/blob urls', () => {
    expect(resolveRelativeMedia('http://x.com/i.png', '/v')).toBe('http://x.com/i.png')
    expect(resolveRelativeMedia('https://x.com/i.png', '/v')).toBe('https://x.com/i.png')
    expect(resolveRelativeMedia('data:image/png;base64,abc', '/v')).toBe('data:image/png;base64,abc')
    expect(resolveRelativeMedia('file:///C:/x.png', '/v')).toBe('file:///C:/x.png')
  })

  it('resolves relative src against vault directory', () => {
    expect(resolveRelativeMedia('images/foo.png', '/vault/notes/file.md')).toBe('file:////vault/notes/images/foo.png')
    expect(resolveRelativeMedia('./foo.png', '/vault/notes/file.md')).toBe('file:////vault/notes/foo.png')
  })

  it('returns src when no vault path', () => {
    expect(resolveRelativeMedia('img.png', null)).toBe('img.png')
  })
})

describe('formatMarkdownText', () => {
  it('returns empty string for falsy input', () => {
    expect(formatMarkdownText(null)).toBe('')
    expect(formatMarkdownText('')).toBe('')
  })

  it('converts LaTeX block equations to dollar delimiters', () => {
    expect(formatMarkdownText('Text \\[x^2\\] more')).toContain('$$')
  })

  it('converts wikilinks to inline code tokens', () => {
    expect(formatMarkdownText('See [[Obsidian Page]] here')).toContain('`wikilink:Obsidian Page`')
  })

  it('converts source citations to sourcecite tokens', () => {
    expect(formatMarkdownText('Quote [Source 1] end')).toContain('`sourcecite:1|1`')
  })

  it('capitalizes the first letter', () => {
    const result = formatMarkdownText('hello world')
    expect(result.startsWith('Hello')).toBe(true)
  })

  it('removes wrapping markdown code fences', () => {
    const result = formatMarkdownText('```markdown\nSome content here\n```')
    expect(result).toContain('Some content')
    expect(result).not.toContain('```')
  })
})

describe('formatJsonContent', () => {
  it('returns empty string for falsy content', () => {
    expect(formatJsonContent(null)).toBe('')
  })

  it('pretty-prints valid JSON strings', () => {
    expect(formatJsonContent('{"a":1}')).toContain('"a": 1')
  })

  it('pretty-prints object content', () => {
    expect(formatJsonContent({ b: 2 })).toContain('"b": 2')
  })

  it('returns null for non-JSON plain text without braces', () => {
    expect(formatJsonContent('just plain text')).toBeNull()
  })

  it('truncates long content with marker', () => {
    const long = '{"x":"' + 'a'.repeat(200) + '"}'
    const result = formatJsonContent(long, 100)
    expect(result).toContain('... [Content truncated')
  })
})
