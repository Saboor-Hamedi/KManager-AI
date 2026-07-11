import fs from 'fs'
import path from 'path'
import embeddingService from './embeddings.js'
import crypto from 'crypto'

class IngestionService {
  /**
   * Split text into overlapping chunks of roughly `chunkSize` words.
   */
  chunkText(text, chunkSize = 400, overlap = 50) {
    // Match each word along with its trailing whitespace.
    // This perfectly preserves line breaks, tabs, and spacing when reconstructed!
    const tokens = text.match(/\S+\s*/g) || [];
    const chunks = [];
    
    for (let i = 0; i < tokens.length; i += (chunkSize - overlap)) {
      const chunk = tokens.slice(i, i + chunkSize).join('');
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }
    
    return chunks;
  }

  /**
   * Extract text from a file based on its extension
   */
  async extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const mod = require('pdf-parse');
      const PDFParse = mod.PDFParse;
      
      if (!PDFParse) {
        throw new Error('Could not find PDFParse class in pdf-parse module');
      }
      
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      await parser.destroy();
      
      return result.text;
    } else if (ext === '.txt' || ext === '.md' || ext === '.json' || ext === '.csv') {
      return fs.readFileSync(filePath, 'utf8');
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  /**
   * Main ingestion workflow
   * @param {string} filePath - Absolute path to the file
   * @param {Database} db - The connected database instance
   * @param {Function} progressCallback - Callback to report progress to the UI
   */
  async ingestFile(filePath, db, progressCallback = () => {}) {
    if (!db || !db.isConnected()) {
      throw new Error('Database not connected');
    }

    progressCallback({ status: 'extracting', progress: 10, message: 'Extracting text from file...' });
    
    // 1. Extract Text
    const fileName = path.basename(filePath);
    const fileType = path.extname(filePath).replace('.', '').toLowerCase() || 'txt';
    const fileSize = fs.statSync(filePath).size;
    const rawText = await this.extractText(filePath);
    
    if (!rawText || rawText.trim() === '') {
      throw new Error('No text could be extracted from this file.');
    }

    // Generate a hash to prevent duplicates
    const contentHash = crypto.createHash('sha256').update(rawText).digest('hex');

    progressCallback({ status: 'chunking', progress: 30, message: 'Splitting text into semantic chunks...' });

    // 2. Chunk Text
    const chunks = this.chunkText(rawText);
    const totalChunks = chunks.length;

    progressCallback({ status: 'embedding', progress: 40, message: `Generating embeddings for ${totalChunks} chunks...` });

    // Execute everything inside a robust PostgreSQL transaction
    return await db.transaction(async (client) => {
      // 3. Insert Document record
      const docInsertRes = await client.query(
        `INSERT INTO documents (vault_path, file_name, file_type, file_size, content, content_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (vault_path) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
         RETURNING id`,
        [filePath, fileName, fileType, fileSize, rawText, contentHash]
      );
      
      const documentId = docInsertRes.rows[0].id;
      const totalChunks = await this.chunkAndEmbedDocument(client, documentId, rawText, progressCallback);
      
      progressCallback({ status: 'complete', progress: 100, message: 'Ingestion complete!' });
      return { success: true, documentId, chunksProcessed: totalChunks };
    });
  }

  /**
   * DRY helper method: Deletes existing embeddings for a document, chunks text, generates embeddings, and inserts chunks
   */
  async chunkAndEmbedDocument(client, documentId, rawText, progressCallback = () => {}) {
    await client.query('DELETE FROM embedding_documents WHERE document_id = $1', [documentId]);
    const chunks = this.chunkText(rawText);
    const totalChunks = chunks.length;
    const BATCH_SIZE = 8; // Small micro-batch so ONNX C++ never holds the thread for more than ~30ms

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      // Pause 20ms before each batch so Electron event loop can handle scroll & click events
      await new Promise(resolve => setTimeout(resolve, 20));

      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      progressCallback({ 
        status: 'embedding', 
        progress: 40 + Math.floor((i / chunks.length) * 50), 
        message: `Embedding chunks ${i + 1} to ${Math.min(i + BATCH_SIZE, chunks.length)} of ${totalChunks}...` 
      });
      
      const batchVectors = await embeddingService.embedQuery(batchChunks);

      // Pause 10ms after inference so Electron renders UI animations smoothly
      await new Promise(resolve => setTimeout(resolve, 10));

      const values = [];
      const flatParams = [];
      let paramIndex = 1;
      
      for (let j = 0; j < batchChunks.length; j++) {
        const chunkIndex = i + j;
        const content = batchChunks[j];
        const vectorStr = '[' + batchVectors[j].join(',') + ']';
        const tokenCount = content.split(/\s+/).length;
        
        values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}::vector, $${paramIndex++})`);
        flatParams.push(documentId, chunkIndex, content, vectorStr, tokenCount);
      }

      const bulkInsertQuery = `
        INSERT INTO embedding_documents (document_id, chunk_index, content, embedding, token_count)
        VALUES ${values.join(', ')}
      `;
      await client.query(bulkInsertQuery, flatParams);
    }
    return totalChunks;
  }

  /**
   * Re-chunks and re-embeds all documents currently archived in PostgreSQL
   */
  async reembedAll(db, progressCallback = () => {}) {
    if (!db || !db.isConnected()) {
      throw new Error('Database not connected');
    }
    const docsRes = await db.query('SELECT id, file_name, content FROM documents');
    const docs = docsRes.rows;
    let totalChunksProcessed = 0;

    for (let idx = 0; idx < docs.length; idx++) {
      // Yield to event loop between documents so Electron UI stays completely responsive and smooth
      await new Promise(resolve => setTimeout(resolve, 10));

      const doc = docs[idx];
      progressCallback({
        status: 'embedding',
        progress: Math.floor((idx / docs.length) * 100),
        message: `Re-embedding document (${idx + 1}/${docs.length}): ${doc.file_name}`
      });
      await db.transaction(async (client) => {
        const processed = await this.chunkAndEmbedDocument(client, doc.id, doc.content, progressCallback);
        totalChunksProcessed += processed;
      });
    }

    progressCallback({ status: 'complete', progress: 100, message: `Successfully re-embedded ${docs.length} documents (${totalChunksProcessed} chunks).` });
    return { success: true, documentsProcessed: docs.length, chunksProcessed: totalChunksProcessed };
  }

  /**
   * Lightweight fast truncation of all data
   */
  async truncateAll(db) {
    if (!db || !db.isConnected()) {
      throw new Error('Database not connected');
    }
    await db.query('TRUNCATE TABLE search_feedback, embedding_documents, documents RESTART IDENTITY CASCADE');
    return { success: true };
  }
}

export default new IngestionService();
