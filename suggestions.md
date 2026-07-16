# KManager AI — Roadmap & Feature Suggestions

This document tracks planned enhancements to turn KManager AI into an advanced local knowledge management platform, beyond ordinary chatbot capabilities.

---

## Checklist & Execution Status

- [ ] Feature 1: Local Multi-Model RAG (Ollama / LlamaCPP)
- [ ] Feature 2: Adaptive Semantic Chunking
- [ ] Feature 3: RAG Quality Auto-Scoring
- [ ] Feature 4: Knowledge Graph from Documents
- [ ] Feature 5: Smart Query Decomposition
- [ ] Feature 6: Bidirectional Auto-Linking Between Documents
- [ ] Feature 7: Timeline View
- [ ] Feature 8: Conversational State Machine

---

## Feature 1: Local Multi-Model RAG

### Objective
Add support for local LLMs via Ollama or LlamaCPP alongside the existing DeepSeek integration. Users could run Llama 3, Mistral, Qwen, Phi, or any GGUF model locally for fully offline RAG -- no API key needed, no data ever leaves the machine. This eliminates the last remaining cloud dependency and makes the product truly air-gapped.

### Modular Architecture
- `src/main/services/llm.js`: Abstraction layer that supports multiple backends (DeepSeek API, Ollama REST API, local subprocess for llama.cpp). Single interface (`generate()` / `stream()`) regardless of backend.
- `src/renderer/src/components/settings/SettingAIPanel.jsx`: Extend with model selection dropdown showing available local models and connection status.

### Impact
Eliminates the final internet dependency. True air-gapped operation with no external API calls. Users can choose between speed (DeepSeek API) and privacy (local models).

---

## Feature 2: Adaptive Semantic Chunking

### Objective
Replace the current fixed 1500-char window chunking with semantic boundary detection. Split at natural paragraph breaks, section headers (detected via markdown heading syntax or formatting), and concept boundaries. Store parent-child relationships between chunks (section -> document) so retrieval can return coherent sections instead of arbitrary slices.

### Modular Architecture
- `src/main/services/pdfIngestion.js`: Enhance `splitIntoSemanticChunks()` to detect markdown headers, numbered sections, and natural paragraph clusters as boundary markers.
- `schema.sql`: Add a `parent_chunk_id` column to `embedding_documents` for hierarchical chunk relationships.

### Impact
Coherent context instead of mid-sentence cutoffs. Better RAG quality because the LLM receives complete thoughts, not truncated snippets.

---

## Feature 3: RAG Quality Auto-Scoring

### Objective
After each RAG response, run an automatic evaluation pipeline that scores:
- **Faithfulness**: Does the answer contradict the source chunks? (Use DeepSeek or a local model to check)
- **Relevance**: Does it address the user's query directly?
- **Completeness**: Did it miss key information present in the sources?

Store scores in the existing `search_feedback` table. Use the accumulated data to identify which chunking strategies, retrieval parameters, and prompt formats produce the best results for your specific corpus.

### Modular Architecture
- `src/renderer/src/lib/qualityScorer.js`: New module that sends the query, chunks, and answer to an LLM for automated scoring.
- `src/main/index.js`: New IPC handler for quality scoring. Store results in a new `quality_scores` table or extend `search_logs`.

### Impact
Self-improving system. Over time, the system learns which strategies work best for your data. Also provides real quality metrics for the analytics dashboard instead of synthetic benchmark data.

---

## Feature 4: Knowledge Graph from Documents

### Objective
Extract entities, relationships, and concepts from ingested documents using the LLM or local NLP. Build a graph that connects related documents via shared concepts, authors, topics, or extracted entities. Display an interactive graph visualization for exploration.

### Modular Architecture
- `src/main/services/knowledgeGraph.js`: New service that runs entity extraction on ingested documents, builds relationship edges, and stores them in a new `graph_edges` table.
- `src/renderer/src/components/KnowledgeGraph.jsx`: Interactive graph visualization using Cytoscape (already a dependency via Mermaid diagrams).
- `src/renderer/src/components/search/DashboardSearch.jsx`: Add a "Graph View" toggle that switches between list and graph display of search results.

### Impact
Unique differentiator from every other RAG tool. Users can visually explore their knowledge base -- find connected documents they didn't know existed, discover relationships between concepts, and navigate by association rather than just by search.

---

## Feature 5: Smart Query Decomposition

### Objective
For complex or compound questions, automatically break them into sub-queries, search each independently, then synthesize a merged answer. Example: "Compare the treatment protocols in the 2023 and 2024 guidelines" decomposes into searches for "2023 guidelines treatment protocol" and "2024 guidelines treatment protocol", then merges the results.

### Modular Architecture
- `src/renderer/src/lib/queryDecomposer.js`: New module that sends the query to an LLM with instructions to return a JSON array of independent sub-queries.
- `src/renderer/src/components/search/DashboardSearch.jsx`: Execute sub-queries in parallel (or sequentially), collect results, then feed merged context to the RAG synthesis step.

### Impact
Enables multi-document synthesis and comparative analysis -- something single-query RAG systems fundamentally struggle with.

---

## Feature 6: Bidirectional Auto-Linking

### Objective
When a document contains a term that exists as a tag or keyword in another document, automatically create a bidirectional link between them. This is similar to Obsidian's backlinks but generated automatically during ingestion. Render these links as clickable badges within DocumentRenderer.

### Modular Architecture
- `src/main/db/ingestion.js`: After auto-tagging, query for existing documents that share the same tags and create link entries in a new `document_links` table.
- `src/renderer/src/components/search/DocumentRenderer.jsx`: Render backlinks as a "Linked Documents" section at the bottom of each document view, styled as clickable pill badges.

### Impact
The knowledge base grows connections organically with zero user effort. Users discover related documents they didn't know existed, enabling serendipitous exploration.

---

## Feature 7: Timeline View

### Objective
Show ingested documents on a chronological timeline based on creation date, modification date, or extracted dates from document content. Allow filtering by date range. Particularly powerful for research, legal, compliance, and project documentation use cases.

### Modular Architecture
- `src/renderer/src/components/TimelineView.jsx`: New view that renders documents on a horizontal or vertical timeline, with zoom controls for date range.
- Could use Recharts (already a dependency) or a purpose-built timeline component.
- Accessible via a new sidebar nav item or a tab within the Analytics view.

### Impact
Temporal navigation of your knowledge base. Users can ask "what did I add last month?" and see everything in context.

---

## Feature 8: Conversational State Machine

### Objective
Instead of passing raw chat history, maintain a structured state object that tracks:
- Current topic / document being discussed
- Referenced sources (with chunk IDs)
- User's apparent goal (exploring, comparing, verifying)
- Previous questions and answers (summarized)

Use this state to proactively suggest related documents, offer follow-up actions, and provide contextually aware responses without relying solely on raw token history.

### Modular Architecture
- `src/renderer/src/lib/conversationState.js`: New module that manages a structured state object, with functions for updating state based on user input and generating state summaries for the LLM prompt.
- `src/renderer/src/lib/deepseek.js`: Inject structured state into the system prompt alongside raw history.
- `src/renderer/src/components/search/DashboardSearch.jsx`: Use state to drive proactive suggestions and contextual UI cues.

### Impact
Proactive assistance instead of purely reactive Q&A. The system understands what you're trying to do and helps you do it, rather than just answering one question at a time.
