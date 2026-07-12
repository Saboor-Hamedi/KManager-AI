import { pipeline, env } from '@xenova/transformers'
import path from 'path'
import { app } from 'electron'

const isProd = app.isPackaged;
const modelsDir = isProd
  ? path.join(process.resourcesPath, 'assets/models')
  : path.join(app.getAppPath(), 'assets/models');

// Configure transformers.js environment for fully offline use
env.allowRemoteModels = false; // Never hit the internet
env.allowLocalModels = true;   // Read from local bundle
env.useBrowserCache = false;   // Disable browser cache in Node.js environment
env.localModelPath = modelsDir;

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
      
      this.initPromise = pipeline('feature-extraction', this.modelName, {
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
