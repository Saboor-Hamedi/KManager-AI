import { pipeline, env } from '@xenova/transformers'
import path from 'path'
import { app } from 'electron'

const isProd = app.isPackaged;
const modelsDir = isProd
  ? path.join(process.resourcesPath, 'assets/models')
  : path.join(app.getAppPath(), 'assets/models');

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = false;
env.localModelPath = modelsDir;

class ReRankerService {
  constructor() {
    this.modelName = 'Xenova/ms-marco-MiniLM-L-6-v2';
    this.classifier = null;
    this.initPromise = null;
  }

  async init() {
    if (this.classifier) return;
    if (!this.initPromise) {
      console.log('Initializing re-ranker model...', this.modelName);
      
      this.initPromise = pipeline('text-classification', this.modelName, {
        quantized: true,
      });
    }
    
    try {
      this.classifier = await this.initPromise;
      console.log('Re-ranker model successfully initialized!');
    } catch (err) {
      console.error('Failed to initialize re-ranker model:', err);
      this.initPromise = null;
      throw err;
    }
  }

  async rerank(query, documents) {
    if (!this.classifier) {
      await this.init();
    }
    
    if (!documents || documents.length === 0) return [];

    // The cross-encoder takes pairs of [query, documentText]
    // ms-marco-MiniLM-L-6-v2 requires passing inputs as an array of pairs, or calling it multiple times.
    // For Transformers.js, we can map over documents and score them.
    
    const scores = [];
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      try {
        // text-classification for cross encoders in Transformers.js takes a single string or an array of strings. 
        // For query-document pairs, we can concatenate them with a separator or pass `{ text: query, text_pair: doc.content }`
        // Xenova handles text_pair like this:
        const result = await this.classifier(query, doc.content);
        
        // result is typically [{ label: 'LABEL_0', score: 0.99 }] 
        // For ms-marco-MiniLM-L-6-v2, it returns a single score for relevance
        const score = result[0]?.score || 0;
        scores.push(score);
      } catch (err) {
        console.error('Rerank error on chunk:', err);
        scores.push(0);
      }
    }

    // Attach cross-encoder scores and sort
    for (let i = 0; i < documents.length; i++) {
      documents[i].crossEncoderScore = scores[i];
    }

    return documents.sort((a, b) => b.crossEncoderScore - a.crossEncoderScore);
  }
}

export default new ReRankerService();
