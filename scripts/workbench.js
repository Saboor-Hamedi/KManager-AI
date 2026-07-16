const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT = __dirname + '/..'
const SRC = path.join(ROOT, 'src')
const BRAIN = path.join(ROOT, 'brain')
const TEST = path.join(ROOT, 'test')

const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'out', '.vscode', 'build'])

let totalData = { files: 0, lines: 0, size: 0 }

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

function countLines(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  return content.split('\n').length
}

function scanDir(dirPath, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return { files: 0, lines: 0, size: 0, byType: {} }
  const result = { files: 0, lines: 0, size: 0, byType: {} }
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        const sub = scanDir(fullPath, depth + 1, maxDepth)
        result.files += sub.files
        result.lines += sub.lines
        result.size += sub.size
        for (const [ext, count] of Object.entries(sub.byType)) {
          result.byType[ext] = (result.byType[ext] || 0) + count
        }
      } else {
        const stat = fs.statSync(fullPath)
        result.files++
        result.size += stat.size
        const ext = path.extname(entry.name) || '(no ext)'
        result.byType[ext] = (result.byType[ext] || 0) + 1
        try {
          result.lines += countLines(fullPath)
        } catch { /* binary files */ }
      }
    }
  } catch { /* permission denied */ }
  return result
}

function printLine(label, value, unit = '', indent = 0) {
  const pad = '  '.repeat(indent)
  const labelStr = label.padEnd(30)
  console.log(`${pad}${labelStr} ${value}${unit ? ' ' + unit : ''}`)
}

function divider(title) {
  const len = 70
  const side = Math.floor((len - title.length - 2) / 2)
  console.log('\n' + '='.repeat(side) + ' ' + title + ' ' + '='.repeat(side) + '\n')
}

async function run() {
  console.clear()
  console.log(`
  ██╗  ██╗███╗   ███╗ █████╗ ███╗   ██╗ █████╗  ██████╗ ███████╗██████╗
  ██║ ██╔╝████╗ ████║██╔══██╗████╗  ██║██╔══██╗██╔════╝ ██╔════╝██╔══██╗
  █████╔╝ ██╔████╔██║███████║██╔██╗ ██║███████║██║  ███╗█████╗  ██████╔╝
  ██╔═██╗ ██║╚██╔╝██║██╔══██║██║╚██╗██║██╔══██║██║   ██║██╔══╝  ██╔══██╗
  ██║  ██╗██║ ╚═╝ ██║██║  ██║██║ ╚████║██║  ██║╚██████╔╝███████╗██║  ██║
  ╚═╝  ╚═╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝
                              Workbench v1.0
`)

  // 1. PROJECT OVERVIEW
  divider('PROJECT OVERVIEW')
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  printLine('Project', pkg.name)
  printLine('Version', pkg.version)
  printLine('Description', pkg.description)
  printLine('Electron', pkg.devDependencies?.electron || pkg.dependencies?.electron || 'N/A')
  printLine('React', pkg.dependencies?.react || 'N/A')
  printLine('Node', process.version)

  // 2. DEPENDENCY ANALYSIS
  divider('DEPENDENCY ANALYSIS')
  const deps = pkg.dependencies || {}
  const devDeps = pkg.devDependencies || {}
  printLine('Runtime dependencies', Object.keys(deps).length)
  printLine('Dev dependencies', Object.keys(devDeps).length)
  printLine('Total dependencies', Object.keys(deps).length + Object.keys(devDeps).length)

  // node_modules size
  const nmPath = path.join(ROOT, 'node_modules')
  let nmSize = 0
  try {
    nmSize = fs.readdirSync(nmPath).reduce((acc, dir) => {
      try {
        const stat = fs.statSync(path.join(nmPath, dir))
        return acc + (stat.isDirectory() ? getDirSize(path.join(nmPath, dir)) : stat.size)
      } catch { return acc }
    }, 0)
  } catch {}
  printLine('node_modules size', formatBytes(nmSize))

  // Top deps by size
  divider('LARGEST DEPENDENCIES')
  const depSizes = []
  try {
    const nmDirs = fs.readdirSync(nmPath)
    for (const dir of nmDirs) {
      if (dir.startsWith('.')) continue
      const dirPath = path.join(nmPath, dir)
      try {
        const size = getDirSize(dirPath)
        if (size > 1024 * 100) { // > 100KB
          depSizes.push({ name: dir, size })
        }
      } catch {}
    }
    depSizes.sort((a, b) => b.size - a.size)
    depSizes.slice(0, 15).forEach((dep, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. ${dep.name.padEnd(35)} ${formatBytes(dep.size).padStart(10)}`)
    })
  } catch {}

  // 3. SOURCE CODE ANALYSIS
  divider('SOURCE CODE ANALYSIS')

  // Main process
  const main = scanDir(path.join(SRC, 'main'))
  printLine('Main process files', main.files, 'files')
  printLine('Main process lines', main.lines.toLocaleString(), 'lines')
  printLine('Main process size', formatBytes(main.size))

  // Renderer
  const renderer = scanDir(path.join(SRC, 'renderer'))
  printLine('Renderer files', renderer.files, 'files')
  printLine('Renderer lines', renderer.lines.toLocaleString(), 'lines')
  printLine('Renderer size', formatBytes(renderer.size))

  // Preload
  const preload = scanDir(path.join(SRC, 'preload'))
  printLine('Preload files', preload.files, 'files')

  // Utils
  const utils = scanDir(path.join(SRC, 'utils'))
  printLine('Utils files', utils.files, 'files')

  // Total
  const total = scanDir(SRC)
  printLine('Total source files', total.files, 'files')
  printLine('Total source lines', total.lines.toLocaleString(), 'lines')
  printLine('Total source size', formatBytes(total.size))

  // By file type
  divider('FILE BREAKDOWN BY TYPE')
  const sortedTypes = Object.entries(total.byType).sort((a, b) => b[1] - a[1])
  for (const [ext, count] of sortedTypes) {
    console.log(`  ${ext.padEnd(12)} ${count.toString().padStart(4)} files`)
  }

  // 4. COMPONENT ANALYSIS
  divider('REACT COMPONENTS')
  const components = scanDir(path.join(SRC, 'renderer', 'src', 'components'))
  printLine('Total components', components.files, 'files')
  printLine('Component lines', components.lines.toLocaleString(), 'lines')

  // Largest components
  console.log('\n  Largest component files:')
  const compFiles = getFileSizes(path.join(SRC, 'renderer', 'src', 'components'))
  compFiles.sort((a, b) => b.lines - a.lines)
  compFiles.slice(0, 10).forEach((f, i) => {
    const rel = path.relative(SRC, f.path)
    console.log(`  ${(i + 1).toString().padStart(2)}. ${rel.padEnd(60)} ${f.lines.toString().padStart(5)} lines ${formatBytes(f.size).padStart(10)}`)
  })

  // 5. TEST ANALYSIS
  divider('TEST ANALYSIS')
  const testData = scanDir(TEST)
  printLine('Test files', testData.files, 'files')
  printLine('Test lines', testData.lines.toLocaleString(), 'lines')

  // Test coverage by category
  const unitTests = scanDir(path.join(TEST, 'unit'))
  printLine('Unit tests', unitTests.files, 'files', 1)
  try {
    const e2eTests = scanDir(path.join(TEST, 'e2e'))
    printLine('E2E tests', e2eTests.files, 'files', 1)
  } catch {}

  // 6. DOCUMENTATION ANALYSIS
  divider('DOCUMENTATION')
  const brainData = scanDir(BRAIN)
  printLine('Doc files', brainData.files, 'files')
  printLine('Doc lines', brainData.lines.toLocaleString(), 'lines')

  // 7. BUILD OUTPUT
  divider('BUILD OUTPUT')
  const outPath = path.join(ROOT, 'out')
  if (fs.existsSync(outPath)) {
    const outData = scanDir(outPath)
    printLine('Build files', outData.files, 'files')
    printLine('Build size', formatBytes(outData.size))
  } else {
    printLine('Build status', 'Not built (run npm run build)')
  }

  // 8. GIT STATS
  divider('GIT STATISTICS')
  try {
    const commits = execSync('git rev-list --count HEAD', { cwd: ROOT }).toString().trim()
    printLine('Total commits', commits)

    const branches = execSync('git branch --list | wc -l', { cwd: ROOT, shell: true }).toString().trim()
    printLine('Local branches', branches)

    const lastCommit = execSync('git log --oneline -1', { cwd: ROOT }).toString().trim()
    printLine('Latest commit', lastCommit)

    const contributors = execSync('git shortlog -sn --all | wc -l', { cwd: ROOT, shell: true }).toString().trim()
    printLine('Contributors', contributors)
  } catch {
    printLine('Git stats', 'Unavailable')
  }

  // 9. SCRIPTS SUMMARY
  divider('AVAILABLE SCRIPTS')
  const scripts = pkg.scripts || {}
  const scriptEntries = Object.entries(scripts)
  const maxLen = Math.max(...scriptEntries.map(([k]) => k.length))
  for (const [name, cmd] of scriptEntries) {
    console.log(`  ${name.padEnd(maxLen + 2)} ${cmd}`)
  }

  // 10. SUMMARY
  divider('SUMMARY')
  console.log(`  Total source files:     ${total.files}`)
  console.log(`  Total source lines:     ${total.lines.toLocaleString()}`)
  console.log(`  Components:             ${components.files}`)
  console.log(`  Tests:                  ${testData.files}`)
  console.log(`  Dependencies:           ${Object.keys(deps).length + Object.keys(devDeps).length}`)
  console.log(`  node_modules:           ${formatBytes(nmSize)}`)

  console.log('\n')
}

function getDirSize(dirPath) {
  let total = 0
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        total += getDirSize(fullPath)
      } else {
        total += fs.statSync(fullPath).size
      }
    }
  } catch { /* skip */ }
  return total
}

function getFileSizes(dirPath) {
  const result = []
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (EXCLUDE_DIRS.has(entry.name)) continue
      if (entry.name.startsWith('.')) continue
      const fullPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) {
        result.push(...getFileSizes(fullPath))
      } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
        const stat = fs.statSync(fullPath)
        try {
          const lines = fs.readFileSync(fullPath, 'utf8').split('\n').length
          result.push({ path: fullPath, lines, size: stat.size })
        } catch {}
      }
    }
  } catch {}
  return result
}

run().catch(console.error)
