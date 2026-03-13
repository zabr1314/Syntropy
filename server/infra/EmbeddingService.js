
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

/**
 * EmbeddingService
 * Provides text embedding capabilities using OpenAI or local Transformers.js.
 * Supports provider switching via configuration.
 */
export class EmbeddingService {
    constructor(config = {}) {
        this.provider = config.provider || process.env.EMBEDDING_PROVIDER || 'none'; // Default to 'none' if undefined
        this.modelName = config.model || process.env.EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';
        
        // Cache Configuration
        this.cache = new Map();
        this.maxCacheSize = config.maxCacheSize || 1000;

        // Provider Initialization
        if (this.provider === 'openai') {
            this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
            this.baseURL = config.baseURL || process.env.OPENAI_BASE_URL;
            this.client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });
        } else if (this.provider === 'local') {
            // Local provider lazy loading
            this.extractor = null;
            this.localCacheDir = path.join(process.cwd(), 'data', 'models');
            if (!fs.existsSync(this.localCacheDir)) {
                fs.mkdirSync(this.localCacheDir, { recursive: true });
            }
        }
    }

    async initLocalModel() {
        if (this.extractor) return;
        
        console.log(`[EmbeddingService] Loading local model: ${this.modelName}...`);
        try {
            // Dynamic import to avoid load-time errors if dependency is missing
            const { pipeline, env } = await import('@xenova/transformers');
            
            // Set cache directory
            env.cacheDir = this.localCacheDir;
            env.allowLocalModels = false; // Force download first time
            
            this.extractor = await pipeline('feature-extraction', this.modelName);
            console.log('[EmbeddingService] Local model loaded successfully.');
        } catch (error) {
            console.error('[EmbeddingService] Failed to load local model:', error.message);
            // Don't throw, just log. This allows the system to continue without embeddings.
            this.extractor = null;
        }
    }

    /**
     * Generate embedding for a single text string
     */
    async embed(text) {
        if (!text || typeof text !== 'string') {
            return null; // Fail gracefully
        }

        // 1. Check Cache
        const cacheKey = text.length > 200 ? text.substring(0, 200) + text.length : text;
        if (this.cache.has(cacheKey)) {
            const vector = this.cache.get(cacheKey);
            // Refresh LRU
            this.cache.delete(cacheKey);
            this.cache.set(cacheKey, vector);
            return vector;
        }

        try {
            let vector = null;

            // 2. Generate Vector
            if (this.provider === 'openai') {
                const response = await this.client.embeddings.create({
                    model: this.modelName,
                    input: text,
                    encoding_format: 'float'
                });
                vector = response.data[0].embedding;
            } else if (this.provider === 'local') {
                await this.initLocalModel();
                if (!this.extractor) return null; // Failed to load model
                const output = await this.extractor(text, { pooling: 'mean', normalize: true });
                // Convert Tensor to standard Array
                vector = Array.from(output.data);
            } else {
                // 'none' or unknown provider
                return null;
            }

            // 3. Update Cache
            if (vector) {
                if (this.cache.size >= this.maxCacheSize) {
                    const firstKey = this.cache.keys().next().value;
                    this.cache.delete(firstKey);
                }
                this.cache.set(cacheKey, vector);
            }

            return vector;
        } catch (error) {
            console.error(`[EmbeddingService] Embedding failed (${this.provider}):`, error.message);
            return null;
        }
    }

    /**
     * Generate embeddings for multiple texts
     */
    async embedBatch(texts) {
        return Promise.all(texts.map(t => this.embed(t)));
    }
}
