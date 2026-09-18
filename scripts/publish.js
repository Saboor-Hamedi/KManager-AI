#!/usr/bin/env node

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const pkgPath = path.join(rootDir, 'package.json')

function run(cmd, opts = {}) {
  console.log(`\x1b[36m> ${cmd}\x1b[0m`)
  return execSync(cmd, { cwd: rootDir, stdio: 'inherit', ...opts })
}

function runSilent(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, stdio: ['pipe', 'pipe', 'pipe'] }).toString().trim()
  } catch {
    return ''
  }
}

function bumpPatch(version) {
  const parts = version.split('.').map(Number)
  if (parts.length !== 3 || parts.some(isNaN)) {
    throw new Error(`Invalid semver version: ${version}`)
  }
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
}

async function main() {
  console.log('\n\x1b[32m═════════════════════════════════════════════════════════════════\x1b[0m')
  console.log('\x1b[1m\x1b[32m  KManager AI - Automated Multi-Platform Release & Publish   \x1b[0m')
  console.log('\x1b[32m═════════════════════════════════════════════════════════════════\x1b[0m\n')

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  const currentVersion = pkg.version

  // Automatically bump patch version for a clean, new release
  const targetVersion = bumpPatch(currentVersion)
  const newTag = `v${targetVersion}`

  console.log(`Current version:  \x1b[34m${currentVersion}\x1b[0m`)
  console.log(`New release tag:  \x1b[32m${newTag}\x1b[0m (version \x1b[33m${targetVersion}\x1b[0m)\n`)

  // 1. Update version in package.json
  pkg.version = targetVersion
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`✔ Updated package.json to ${targetVersion}`)

  // 2. Commit all release changes
  try {
    console.log('\n\x1b[36mStaging and committing release changes...\x1b[0m')
    run('git add -A')
    run(`git commit -m "chore(release): ${newTag}"`)
  } catch (err) {
    console.warn('Working tree already committed or no changes to commit.')
  }

  // 3. Create Annotated Git Tag
  console.log(`\n\x1b[36mCreating Git tag ${newTag}...\x1b[0m`)
  const existingTag = runSilent(`git tag -l "${newTag}"`)
  if (!existingTag) {
    run(`git tag -a "${newTag}" -m "Release ${newTag}"`)
  } else {
    console.log(`Tag ${newTag} already exists locally.`)
  }

  // 4. Push commit and tag to GitHub to trigger multi-platform CI (Windows, macOS, Linux)
  console.log('\n\x1b[36mPushing release commits and tag directly to GitHub...\x1b[0m')
  const currentBranch = runSilent('git branch --show-current') || 'main'
  try {
    run(`git push origin ${currentBranch}`)
    run(`git push origin ${newTag}`)
    console.log(`\n\x1b[32m✔ Successfully pushed ${newTag} to GitHub!\x1b[0m`)
    console.log('\x1b[35mGitHub Actions is now running in parallel to compile & publish Windows, macOS, and Linux releases.\x1b[0m')
    console.log(`Track live builds at: \x1b[4mhttps://github.com/Saboor-Hamedi/KManager-AI/actions\x1b[0m\n`)
  } catch (err) {
    console.error('\x1b[31mFailed to push to GitHub remote. Ensure your git remote credentials are valid.\x1b[0m')
  }
}

main().catch((err) => {
  console.error('\x1b[31mPublish process failed:\x1b[0m', err)
  process.exit(1)
})
