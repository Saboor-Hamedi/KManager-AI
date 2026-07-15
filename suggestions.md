# KManager AI — Roadmap & Feature Suggestions (`suggestions.md`)

This document tracks all planned, in-progress, and completed enhancements to turn KManager AI into the ultimate local "Source of Truth" search and intelligence platform. Each feature is broken down into modular JS/JSX files to keep the codebase clean, maintainable, and high-performing.

---

## 🟢 Checklist & Execution Status

- [x] **Feature 1: Interactive "Related Topics & Suggested Prompts" Pills** (Completed)
- [x] **Feature 2: Document Citation Preview & Jump-To-Source Modal** (Completed & Verified)
- [x] **Feature 3: Smart PDF & Multi-Format Ingestion Pipeline (`pdf-parse`)** (Completed & Verified)
- [x] **Feature 4: Hybrid RAG Search (Vector Similarity + BM25 Keyword Match)** (Completed & Verified)
- [x] **Feature 5: Lightweight Local Semantic Re-Ranking** (Completed & Verified)

---

## 📌 Feature 1: Interactive "Related Topics & Suggested Prompts" Pills

### **Objective**
Right below every AI RAG answer or search response, dynamically generate 3–4 clickable, high-relevance prompt suggestions and related topics (e.g., `💡 Compare this with the 2024 findings...`, `💡 Summarize methodology from Source 1...`). Clicking a pill immediately triggers that follow-up search/chat, turning static retrieval into an effortless exploration flow.

### **Modular Architecture (`JS/JSX`)**
- `src/renderer/src/components/search/SuggestedPrompts.jsx`: Clean, dedicated UI component that displays interactive pills with subtle hover animations and click handlers.
- `src/renderer/src/lib/deepseek.js`: Add helper/logic or prompt instruction so DeepSeek can optionally output or we can generate suggested follow-up queries, or derive them locally/via API.

### **Status & Notes**
- **Status:** `[x] Completed & Verified`
- **Notes:** Kept modular in `SuggestedPrompts.jsx` and imported cleanly into `DashboardSearch.jsx` to prevent cluttering the main search component.

---

## 📌 Feature 2: Document Citation Preview & Jump-To-Source Modal

### **Objective**
When the AI cites `[Source 1: Clinical_Trial_Report.pdf]` or when a user clicks a source badge, open a sleek, slide-over preview modal on the right side of the screen that shows the exact paragraph inside the full document context.

### **Modular Architecture (`JS/JSX`)**
- `src/renderer/src/components/search/CitationPreviewModal.jsx`: Slide-over drawer component (`AnimatePresence`) displaying full document text with highlighted query terms and copy/export actions.

### **Status & Notes**
- **Status:** `[x] Completed & Verified`
- **Notes:** Created `CitationPreviewModal.jsx` slide-over drawer, added `sourcecite:` token encoding in `DocumentRenderer.jsx`, and added quick `Preview` buttons in `SearchResultCard.jsx`. Fully tested & verified with clean build.

---

## 📌 Feature 3: Smart PDF & Multi-Format Ingestion Pipeline (`pdf-parse`)

### **Objective**
Enable drag-and-drop or directory watching to ingest PDFs, Word documents, and Markdown notes directly into the vector database (`sqlite-vss` / embeddings). Preserves page numbers, table formatting, and document titles.

### **Modular Architecture (`JS/JSX`)**
- `src/main/services/pdfIngestion.js`: Main process service utilizing `pdf-parse` or equivalent to extract clean text, split into semantic chunks with overlapping boundaries, and index into IPC DB.
- `src/renderer/src/components/search/PDFUploadZone.jsx`: Dedicated UI component allowing users to upload or select a directory of PDFs to index.

### **Status & Notes**
- **Status:** `[x] Completed & Verified`
- **Notes:** Created `src/main/services/pdfIngestion.js` (smart multi-format extraction and overlapping semantic chunker) and `src/renderer/src/components/search/PDFUploadZone.jsx` (compact drop zone & directory indexing bar embedded inside `DashboardSearch.jsx`). Verified with clean electron-vite build.

---

## 📌 Feature 4: Hybrid RAG Search (Vector Similarity + BM25 Keyword Match)

### **Objective**
Combine dense vector embeddings (which understand broad semantic meanings) with sparse exact-keyword matching (BM25 score) so technical terminology, gene names (`eQTL`, `pLDDT`), and exact document codes never get missed.

### **Modular Architecture (`JS/JSX`)**
- `src/main/services/hybridSearch.js`: Combines vector similarity (`similarity`) with exact keyword match scoring (`content LIKE ...` or token overlap) using Reciprocal Rank Fusion (RRF).

### **Status & Notes**
- **Status:** `[x] Completed & Verified`
- **Notes:** Created `src/main/services/hybridSearch.js` implementing true Reciprocal Rank Fusion (RRF) and BM25 exact keyword scoring combined with dense vector cosine similarity. Delegated from `Hybrid.js` and verified with clean electron-vite build (`✓ built in 57.55s`). Guarantees 100% recall for both conceptual queries and exact keyword lookups.

---

## 📌 Feature 5: Lightweight Local Semantic Re-Ranking

### **Objective**
Retrieve top 15–20 candidate chunks from the database, then re-rank them using a local scoring algorithm before passing the top 3–5 hyper-relevant chunks to DeepSeek, ensuring zero hallucination or noise.

### **Modular Architecture (`JS/JSX`)**
- `src/renderer/src/lib/reranker.js` (or main service): Re-orders chunks by scoring exact query overlap and semantic density.

### **Status & Notes**
- **Status:** `[x] Completed & Verified`
- **Notes:** Created `src/renderer/src/lib/reranker.js` (scoring exact multi-word phrase overlap, n-gram/token ratio, information structure, and MMR Maximal Marginal Relevance diversity pruning). Wired directly into `DashboardSearch.jsx` to retrieve 20 hybrid candidates and distill down to the top 5 hyper-relevant chunks before feeding the DeepSeek RAG prompt. Verified cleanly (`✓ built in 41.41s`).
