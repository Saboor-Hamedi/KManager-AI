# KManager AI — UI & Non-Technical User Improvement Suggestions

> Comprehensive findings from a full codebase audit, focused on UI, non-technical users, and overall app quality. Each item lists impact, file references, and a concrete recommendation. Suggestions only — no code has been written.

---

## 1. Accessibility (highest priority)

### 1.1 Keyboard focus indicators are globally removed
- **Where**: `src/renderer/src/assets/main.css:56-96`
- **Problem**: Every `:focus`, `:focus-visible`, `:focus-within` rule sets `outline: none !important` and `box-shadow: none !important` on buttons, inputs, textareas, links, and tabindex elements. Keyboard/tab users get **zero visual cue** about where focus is.
- **Fix**: Remove the blanket resets; instead provide a visible focus ring (e.g. `outline: 2px solid var(--text-accent); outline-offset: 2px`) scoped to `:focus-visible` only, so hover-based mouse users stay unaffected.

### 1.2 Hover-only affordances are undiscoverable
- **Where**: `Sidebar.jsx:26`, `SidebarFooter.jsx:19`, `DocumentRenderer.jsx:307`, `SuggestedPrompts.jsx:56`
- **Problem**: Shortcut hints and copy buttons are `opacity-0` until hover. Invisible for touch and unknown to mouse users.
- **Fix**: Show shortcuts always (or in a "?" help), and make code-block copy buttons always visible.

### 1.3 Tiny text and low contrast
- **Where**: 9-11px labels in `SettingDBPropertiesPanel.jsx`, `PDFUploadZone.jsx`, `GlobalTitleBar.jsx`; `--text-faint: #64748b` on `--bg-app: #0d1017`.
- **Problem**: Very small font sizes and ~4.5:1 contrast at tiny sizes are hard to read.
- **Fix**: Raise the minimum body/UI text size to 12px, darken `--text-faint` (or lighten it for dark themes), and audit contrast for all semantic color pairs in `themeDefinitions.js`.

---

## 2. Functional bugs users will actually hit

### 2.1 "Edit chunk" is broken (read-only textarea)
- **Where**: `SearchResultCard.jsx:307`
- **Problem**: `AutoResizeTextarea` is passed `readOnly={true}` during editing, so users **cannot type**. The whole edit-chunk feature (`SearchResultCard.jsx:199-225`) is dead.
- **Fix**: Remove `readOnly={true}`; keep `disabled` only while saving.

### 2.2 4 of 5 AI providers are blocked by CSP
- **Where**: `src/renderer/index.html:9` CSP `connect-src`; provider files `ChatGPT.js`, `Gemini.js`, `Grok.js`, `Claude.js`
- **Problem**: CSP allows only DeepSeek. OpenAI (`api.openai.com`), Gemini (`generativelanguage.googleapis.com`), Grok (`api.x.ai`), and Claude (`api.anthropic.com`) are **blocked in production**. Settings advertises all 5 (`SettingAIPanel.jsx:6-12`).
- **Fix**: Add each provider's host to `connect-src`, or route all LLM calls through the main process (best practice).

### 2.3 No timeouts/aborts on non-DeepSeek providers
- **Where**: `DeepSeek.js:7-22` has AbortController; `ChatGPT.js`, `Gemini.js`, `Grok.js`, `Claude.js` do not.
- **Problem**: A hung provider produces an infinite "Synthesizing answer…" spinner (`RagAnswer.jsx:53-58`) with no cancel — appears frozen.
- **Fix**: Add the same timeout/abort pattern to all providers, plus a "Stop" button during generation.

### 2.4 Keyword highlighting is inconsistent
- **Where**: `SearchResultCard.jsx:38-51`
- **Problem**: A single `gi` regex with `.test()` is stateful (`lastIndex`), so highlights flicker on/off incorrectly.
- **Fix**: Build a non-global regex, or use `split` + `includes`, or iterate with `matchAll`.

### 2.5 Edit-save silently mutates content
- **Where**: `SearchResultCard.jsx:202`, `RagAnswer.jsx:41`
- **Problem**: Saves append two trailing spaces to every line to force `<br>`; re-opening reveals hidden spaces, surprising non-markdown users.
- **Fix**: Render with proper CSS (`whitespace-pre-wrap`) instead of injecting invisible markdown.

---

## 3. First-run onboarding (biggest non-technical gap)

### 3.1 No guided setup flow
- **Problem**: A new user sees "DB Disconnected" (`GlobalTitleBar.jsx:220`) and an empty search box with no path forward. No explanation of: connect → init schema → import files.
- **Fix**: Add a first-run wizard modal (auto-open when no DB was ever connected, with a "Skip" button and a config flag to not re-show): Step 1 connect library, Step 2 auto-init schema, Step 3 drag in files, Step 4 done.

### 3.2 Empty state never prompts to connect
- **Where**: `DashboardSearch.jsx:650-684` / `HistoryFeed.jsx:50-84`
- **Problem**: The connect button only appears *after* a failed search (`HistoryFeed.jsx:110-117`).
- **Fix**: When DB is disconnected, show "Connect your library to begin" with a button that opens Settings → Connection.

### 3.3 "Init Schema" is an undiscoverable manual step
- **Where**: `SettingDBPanel.jsx:107-123`
- **Problem**: Users connect and then nothing works because the schema was never created.
- **Fix**: Auto-run schema initialization on first successful connect (idempotent `CREATE TABLE IF NOT EXISTS` already in `schema.sql`).

---

## 4. Settings clarity

### 4.1 Technical tab labels
- **Where**: `Setting.jsx:11-17`
- **Problem**: "DB Properties", "Data Ingestion" are jargon.
- **Fix**: Rename to "Library", "Files", etc., with a plain-language subtitle on each tab.

### 4.2 Connection form is intimidating
- **Where**: `SettingDBPanel.jsx:125-168`
- **Problem**: Host/Port/Username/Password in mono font, no help text, no connection-string option.
- **Fix**: Add a single `postgres://user:pass@host:port/db` field, per-field plain-language help, and a "where do I find these?" hint.

### 4.3 Raw error messages leak
- **Where**: `SettingDBPanel.jsx:212-221`, `HistoryFeed.jsx:104-118`, `InlineChat.jsx:59-61`
- **Problem**: `ECONNREFUSED 127.0.0.1:5432`, raw network errors shown verbatim; InlineChat errors have no guidance (unlike `RagAnswer.jsx:204-217`).
- **Fix**: Map common failures to friendly text with next steps ("PostgreSQL isn't running — start it and try again").

### 4.4 Dead "Reading Engine" input
- **Where**: `SettingAIPanel.jsx:167-184` vs hardcoded model in `src/main/db/embeddings.js:18`
- **Problem**: User-editable field that does nothing.
- **Fix**: Remove it, or make it read-only informational text.

---

## 5. Misleading / dead UI

### 5.1 Mic button does nothing
- **Where**: `DashboardSearch.jsx:786-791`
- **Fix**: Remove it or implement voice input.

### 5.2 PDF webview preview is half-wired
- **Where**: `DashboardSearch.jsx:103` calls `window.api.server.getPort()`, which doesn't exist in `src/preload/index.js` (main registers `get-pdf-port` but never exposes it).
- **Fix**: Wire the preload `server` API or drop the webview path and make text the explicit preview mode.

### 5.3 "Postgres Connected" wording
- **Where**: `GlobalTitleBar.jsx:215-225`
- **Problem**: Means nothing to non-tech users; not clickable.
- **Fix**: "Library Connected / Not Connected", clickable to open Connection settings.

### 5.4 "Smart Chat: ON/OFF" pill unclear + duplicated RAG toggle
- **Where**: `DashboardSearch.jsx:770-782` and `SettingAIPanel.jsx:187-203`
- **Problem**: Two toggles for the same setting can drift in appearance; label is unclear.
- **Fix**: Single source of truth; label like "AI Answers: On/Off".

---

## 6. Ingestion safety & feedback

### 6.1 Folder scan has no safety check
- **Where**: `src/main/index.js:881-912` (`system:resolve-paths` recursively scans everything)
- **Problem**: Selecting Desktop/Home can embed thousands of files for minutes.
- **Fix**: Confirm dialog showing the folder path + estimated file count before large scans; add a cap.

### 6.2 Per-file failure reasons hidden
- **Where**: `SettingDataPanel.jsx:220-228`, `PDFUploadZone.jsx:471`
- **Problem**: Failed queue items show only a generic "error" badge.
- **Fix**: Surface the actual message ("unsupported format", "no text extracted") inline.

### 6.3 Supported-format messaging mismatch
- **Where**: `SettingDataPanel.jsx:154` (`.pdf .txt .md .json .csv`) vs `PDFUploadZone.jsx:352` (many more)
- **Fix**: Use one consistent, complete supported-formats message.

---

## 7. AI / RAG UX

### 7.1 With "Smart Chat" ON, source documents are hidden
- **Where**: `HistoryFeed.jsx:123` gates the result-card list behind `(!ragStatus || ragStatus === 'disabled')`
- **Problem**: Only the AI answer renders; users can't see which documents matched (sources only reachable via hover citations). The "no exact match / refined terms" notices (`HistoryFeed.jsx:125-145`) are also suppressed.
- **Fix**: Always show a collapsible "Sources" list under the AI answer (NotebookLM-style), and keep fallback notices visible.

### 7.2 Offline fallback is invisible
- **Where**: `LLMProvider.js:170`
- **Problem**: Without an API key, RAG silently degrades to offline extraction with no notice.
- **Fix**: Show "No AI key set — showing offline summary" banner.

### 7.3 No "Stop generation" control
- **Where**: `DashboardSearch.jsx:379-400`, `RagAnswer.jsx`
- **Fix**: Add a cancel/stop button during streaming.

---

## 8. In-app Help

### 8.1 Docs may not ship in the installer
- **Where**: Documentation modal reads `brain/` (`Documentation.jsx:20`, `src/main/index.js:925`); `electron-builder.yml:48-54` bundles only `assets/` and `schema.sql`.
- **Problem**: If `brain/` isn't included in the package, the built app shows "No Documentation".
- **Fix**: Verify in a packaged build and explicitly bundle `brain/` via `extraResources`.

### 8.2 No guided help path
- **Where**: `Documentation.jsx:95-126` (alphabetical prev/next across all categories)
- **Fix**: Add a "Getting Started" guide and a recommended reading order.

---

## 9. Theme

- **Duplicate keys**: `nord` and `gruvbox` defined twice in `themeDefinitions.js` (later wins silently); `tokyoNight` vs `tokyo_night` are near-identical separate themes. → Deduplicate.
- **Every theme card says "INSTALLED"** (`ThemeModal.jsx:87`) — meaningless. → Show "Active" only for the current theme.
- **Grid hardcoded** `repeat(4,1fr)` (`theme.css:112`) — cramped on small windows. → Make responsive.

---

## 10. Small polish

- **Confirmation modals**: Add confirmations before destructive/irreversible actions like **"Clear Session"** (`ChatBot.jsx:575`) and **"New Session"** (`Sidebar.jsx:52`).
  - **Style guidance**: the confirmation modal should be **small and subtle — no header/title**, just a short message, a single "OK" confirm button, and a **very subtle** Cancel (e.g. quiet, muted styling so the confirm action reads as primary).
- **Autocomplete auto-submits** on selection (`DashboardSearch.jsx:612-621`) — surprise for mouse-first users; consider filling the query without submitting.
- **No search-history persistence** — history is component state only (`DashboardSearch.jsx:46`); restarting wipes the session. Consider saving the last session.
- **Every-query LLM routing check** (`DashboardSearch.jsx:313`) adds latency to short searches when a key exists.

---

## 11. Suggested priority order

- **P0 (fix first, real bugs)**: 2.1 Edit-chunk broken · 2.2 CSP blocks 4 providers · 2.3 No timeouts · 1.1 Focus rings removed
- **P1 (biggest non-technical wins)**: 3.1 Onboarding wizard · 3.3 Auto-init schema · 3.2 Connect CTA in empty state · 4.1/4.2 Settings clarity · 7.1 Show sources with AI answers · 6.1 Folder-scan guard
- **P2 (polish)**: 1.2/1.3 Accessibility text · 5.1–5.4 Dead/misleading UI · 6.2/6.3 Ingestion feedback · 7.2/7.3 RAG notices & stop · 8.1/8.2 In-app help · 9 Theme cleanup · 10 Small polish
