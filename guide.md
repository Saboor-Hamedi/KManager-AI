# KManager Setup & Polish Tasks

## Essential Onboarding (For Non-Technical Users)
- [ ] **First-run onboarding wizard**: Guided setup flow for new users (connect database → initialize schema → drag files).
- [ ] **Auto-initialize schema**: Automatically initialize schema when a user successfully connects to a new database.
- [ ] **Friendly Setup Prompt**: If the app is empty or disconnected, show a friendly "Connect your library to begin" button in the center instead of silently failing searches.
- [x] **Friendly Settings**: Rename technical tabs like "DB Properties", and translate scary raw network errors (like `ECONNREFUSED`) into friendly instructions like *"Database isn't running — start it up and try again."*
- [x] **Folder Scan Safety Check**: Show a confirmation dialog (*"Found 1,500 files, proceed?"*) before scanning massive folders to prevent freezing.

## Completed Tasks
- [x] **LLM Instant Routing**: Stop delaying normal queries by routing conversational checks instantly.
- [x] **Smart Confirm Modals**: Only show confirmation modals when clearing a session that actually has history.
- [x] **Removed Session Storage**: Removed localStorage persistence so chats remain ephemeral.
- [x] **Fixed Maximum update depth exceeded**: Throttled offline RAG extraction to prevent infinite React loops.
- [x] **Fixed `<p> cannot contain <div>` error**: Safely rendered Markdown image tags and component clouds inside `<div>` instead of `<p>`.
- [x] **Seamless RAG Answers**: Removed the dark card styling and "Synthesis" header so RAG answers flow naturally.
