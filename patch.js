const fs = require('fs')

const path = 'src/renderer/src/components/search/DashboardSearch.jsx'
let code = fs.readFileSync(path, 'utf-8')

// 1. Add imports
code = code.replace(
  "import DocumentRenderer from './DocumentRenderer'",
  "import DocumentRenderer from './DocumentRenderer'\nimport Autocompletion from './Autocompletion'\nimport { useMemo } from 'react'"
)

// 2. Add states
code = code.replace(
  "const [savedResponses, setSavedResponses] = useState({})",
  const [savedResponses, setSavedResponses] = useState({})
  const [autocompleteResults, setAutocompleteResults] = useState([])
  const [showAutocomplete, setShowAutocomplete] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
)

// 3. handleInput rewrite
const handleInputOld =   const handleInput = (e) => {
    setQuery(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = \\px\
    }
  }
const handleInputNew =   const handleInput = (e) => {
    const val = e.target.value
    setQuery(val)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = \\px\
    }

    if (val.trim() === '') {
      setAutocompleteResults([])
      setShowAutocomplete(false)
      return
    }

    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await window.electron.ipcRenderer.invoke('db:lexical-search', { query: val, limit: 5 })
        if (results && results.length > 0) {
          setAutocompleteResults(results)
          setShowAutocomplete(true)
          setSelectedIndex(-1)
        } else {
          setAutocompleteResults([])
          setShowAutocomplete(false)
        }
      } catch(err) {
        console.error(err)
      }
    }, 150)
  }
code = code.replace(handleInputOld, handleInputNew)

// 4. handleKeyDown rewrite
const handleKeyDownOld =   const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitSearch()
    }
  }
const handleKeyDownNew =   const handleKeyDown = (e) => {
    if (showAutocomplete && autocompleteResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev < autocompleteResults.length - 1 ? prev + 1 : 0))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : autocompleteResults.length - 1))
        return
      }
      if (e.key === 'Enter' && !e.shiftKey && selectedIndex >= 0) {
        e.preventDefault()
        const selectedRes = autocompleteResults[selectedIndex]
        setShowAutocomplete(false)
        const newQuery = selectedRes.title || selectedRes.content.substring(0, 50)
        setQuery(newQuery)
        setTimeout(() => submitSearch(newQuery), 50)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setShowAutocomplete(false)
      submitSearch()
    }
  }
code = code.replace(handleKeyDownOld, handleKeyDownNew)

// 5. submitSearch patch
code = code.replace(
  "if (!searchQuery.trim() || isSearchingRef.current) return",
  "if (!searchQuery.trim() || isSearchingRef.current) return\n    setShowAutocomplete(false)\n    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)"
)

// 6. Autocompletion JSX insertion
const jsxOld = \      {/* Antigravity-Style AI Composer Card */}
      <div className="pl-6 pr-14 sm:px-6 pb-2 pt-1 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col bg-[var(--bg-card)] rounded-xl transition-all duration-200 overflow-hidden shadow-sm">\

const jsxNew = \      {/* Antigravity-Style AI Composer Card */}
      <div className="pl-6 pr-14 sm:px-6 pb-2 pt-1 bg-gradient-to-t from-[var(--bg-app)] via-[var(--bg-app)] to-transparent shrink-0">
        <div className="max-w-2xl mx-auto relative">
          <Autocompletion 
            results={autocompleteResults} 
            visible={showAutocomplete} 
            query={query} 
            selectedIndex={selectedIndex}
            onSelect={(res) => {
              setShowAutocomplete(false)
              const q = res.title || res.content.substring(0, 50)
              setQuery(q)
              setTimeout(() => submitSearch(q), 50)
            }} 
          />
          <div className={\\\lex flex-col bg-[var(--bg-card)] transition-all duration-200 overflow-hidden shadow-sm \\\\\\}>\
code = code.replace(jsxOld, jsxNew)

fs.writeFileSync(path, code)
console.log('DashboardSearch.jsx patched successfully.')
