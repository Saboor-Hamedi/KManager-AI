# KManager AI

[![Electron](https://img.shields.io/badge/Electron-191970?style=flat-square&logo=Electron&logoColor=white)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Knowledge Management Studio (KManager AI)** is a powerful, fully-offline desktop application designed for secure semantic and hybrid document search. Built with privacy as the absolute priority, KManager AI runs its entire vector embedding and search pipeline locally on your machine—no cloud APIs, no data telemetry, and no internet required.

> [!NOTE]
> **Branch Notice**
> The `master` branch of this repository contains the original **Biomarker Analysis Platform** (a prostate cancer machine learning pipeline). 
> This specific branch (`hybrid-seach`) is a completely distinct, standalone project that evolved into a privacy-first AI Knowledge Management system.

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Usage](#-usage)
- [Building from Source](#-building-from-source)
- [License](#-license)

---

## ⚡ Features

- **Fully Offline AI Engine**: Uses `transformers.js` to run the `paraphrase-multilingual-MiniLM-L12-v2` neural network directly inside the Node.js runtime. 
- **True Hybrid Search**: Combines PostgreSQL's exact-match Full-Text Search (FTS) with `pgvector`'s approximate nearest neighbor (IVFFlat) semantic search using a Reciprocal Rank Fusion (RRF) algorithm.
- **Drag-and-Drop Ingestion**: Drop massive directories of PDF, Markdown, JSON, and text files. The app automatically extracts, chunks, and vectorizes them into the database.
- **Native Document Viewing**: Read your source documents directly within the application's isolated embedded viewers.
- **Air-Gapped Ready**: The 45MB quantized AI model is bundled directly into the installer.
- **Seamless Auto-Updates**: Integrated GitHub Releases auto-updater downloads and applies patches silently in the background.

---

## 🏗 Architecture

KManager AI is built on a modern, high-performance technology stack:

- **Frontend**: React 19, Tailwind CSS, Framer Motion, and Lucide Icons.
- **Desktop Container**: Electron (v39), configured with strict context isolation and a custom IPC bridge.
- **Backend Search**: PostgreSQL 14+ utilizing the `pgvector` extension for storing and querying 384-dimensional vector embeddings.
- **Embedding Pipeline**: `@xenova/transformers` running entirely locally.

---

## 📋 Prerequisites

To run KManager AI from source, ensure you have the following installed on your system:

1. **Node.js** (v18 or higher)
2. **PostgreSQL** (v14 or higher)
3. **pgvector extension** installed on your PostgreSQL server:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

---

## 🚀 Installation

1. **Clone the repository** (ensure you are on the `hybrid-seach` branch):
   ```bash
   git clone https://github.com/Saboor-Hamedi/biomarkers.git
   cd biomarkers
   git checkout hybrid-seach
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Database Setup**:
   Launch the application. Navigate to the **Settings** panel to configure your database connection string and click **Initialize Database**. This will automatically execute the required SQL schemas.

4. **Start the development server**:
   ```bash
   npm run dev
   ```

---

## 💻 Usage

1. **Ingest Documents**: Go to the Settings panel and drag your PDFs into the drop zone. The system will automatically chunk and vectorize the text.
2. **Search**: Return to the Dashboard and type your query in natural language. The Hybrid Search engine will return the most relevant document chunks.
3. **Read**: Click on any search result to open the original source document and read the context.

---

## 📦 Building from Source

To compile KManager AI into a standalone Windows installer (`.exe`):

```bash
npm run build:win
```

To build and automatically publish a new release to GitHub (requires a valid `GITHUB_TOKEN` environment variable):

```bash
npm run publish:win
```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
