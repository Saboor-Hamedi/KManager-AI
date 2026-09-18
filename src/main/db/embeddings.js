import { pipeline, env } from '@xenova/transformers'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'

const isProd = app.isPackaged;
const bundledModelsDir = isProd
  ? path.join(process.resourcesPath, 'assets/models')
  : path.join(app.getAppPath(), 'assets/models');

const defaultModel = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
const hasBundled = fs.existsSync(path.join(bundledModelsDir, defaultModel, 'tokenizer.json'));

if (hasBundled) {
  // Fully offline use from local bundle
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.localModelPath = bundledModelsDir;
} else {
  // Graceful fallback: download once to user AppData and use offline thereafter
  console.warn('[EmbeddingService] Bundled model missing at', bundledModelsDir, '- using local cache fallback.');
  const userCache = path.join(app.getPath('userData'), 'models');
  env.allowRemoteModels = true;
  env.allowLocalModels = true;
  env.useBrowserCache = false;
  env.localModelPath = userCache;
  env.cacheDir = userCache;
}

class EmbeddingService {
  constructor() {
    this.modelName = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2';
    this.extractor = null;
    this.initPromise = null;
  }

  async init() {
    if (this.extractor) return;
    if (!this.initPromise) {
      console.log('Initializing embedding model...', this.modelName);
      console.log('Model cache dir:', env.cacheDir);
      
      this.initPromise = pipeline('embeddings', this.modelName, {
        quantized: true, // Use quantized for faster performance and lower memory
      });
    }
    
    try {
      this.extractor = await this.initPromise;
      console.log('Embedding model successfully initialized!');
    } catch (err) {
      console.error('Failed to initialize embedding model:', err);
      this.initPromise = null;
      throw err;
    }
  }

  async embedQuery(input) {
    if (!this.extractor) {
      await this.init();
    }
    
    // Generate embeddings
    const output = await this.extractor(input, {
      pooling: 'mean',
      normalize: true,
    });

    // If input is an array of strings, output is a 2D tensor [batch, dim]
    // If input is a string, output is a 1D tensor [dim]
    if (Array.isArray(input)) {
      return output.tolist();
    } else {
      return Array.from(output.data);
    }
  }
}

// Export a singleton instance
export default new EmbeddingService();
