import { pipeline, env } from '@xenova/transformers';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, 'assets', 'models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Configure transformers.js to download to our local folder
env.allowLocalModels = false; 
env.allowRemoteModels = true;
env.cacheDir = modelsDir;

async function downloadModel() {
  console.log('Downloading Xenova/paraphrase-multilingual-MiniLM-L12-v2 to', modelsDir, '...');
  
  try {
    // This will trigger the download and caching
    const extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', {
      quantized: true,
    });
    console.log('Model successfully downloaded and cached in assets/models!');
  } catch (error) {
    console.error('Failed to download model:', error);
  }
}

downloadModel();
