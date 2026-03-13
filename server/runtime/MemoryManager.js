import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * MemoryManager - Inspired by OpenClaw's Memory Architecture.
 * Uses SQLite + FTS5 for efficient local knowledge and conversation retrieval.
 * Supports hybrid search (Keyword + Vector with RRF).
 */
export class MemoryManager {
    constructor(agentId, dataDir = './data/agents', embeddingService = null) {
        this.agentId = agentId;
        this.dataDir = dataDir;
        this.embeddingService = embeddingService;
        
        // Ensure directory exists
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.dbPath = path.join(dataDir, `${agentId}.db`);
        this.db = new Database(this.dbPath);
        
        // Initialize Schema
        this.initSchema();
    }

    initSchema() {
        // 1. Chunks table for conversation history or knowledge snippets
        // Added 'embedding' column (BLOB) for future vector support
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                role TEXT, -- user, assistant, tool, system
                metadata TEXT, -- JSON string
                embedding BLOB, -- Vector data (Float32Array buffer)
                created_at INTEGER
            );
        `);

        // 2. FTS5 Virtual Table for Full Text Search
        try {
            // Check if FTS5 is already set up to avoid errors on re-run
            const tableExists = this.db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='chunks_fts'").get();
            
            if (!tableExists.count) {
                this.db.exec(`
                    CREATE VIRTUAL TABLE chunks_fts USING fts5(
                        content,
                        content='chunks',
                        content_rowid='rowid'
                    );

                    -- Triggers to keep FTS index in sync
                    CREATE TRIGGER chunks_ai AFTER INSERT ON chunks BEGIN
                        INSERT INTO chunks_fts(rowid, content) VALUES (new.rowid, new.content);
                    END;
                    CREATE TRIGGER chunks_ad AFTER DELETE ON chunks BEGIN
                        INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.rowid, old.content);
                    END;
                    CREATE TRIGGER chunks_au AFTER UPDATE ON chunks BEGIN
                        INSERT INTO chunks_fts(chunks_fts, rowid, content) VALUES('delete', old.rowid, old.content);
                        INSERT INTO chunks_fts(rowid, content) VALUES (new.rowid, new.content);
                    END;
                `);
            }
        } catch (e) {
            console.warn('[MemoryManager] FTS5 setup failed or not supported:', e.message);
        }
    }

    /**
     * Save a message or snippet to memory
     * Auto-generates embedding if service is available and vector is missing.
     */
    async save(id, content, role, metadata = {}, vector = null) {
        let embeddingBlob = null;
        
        // Auto-generate embedding if service available and vector not provided
        if (!vector && this.embeddingService && content) {
             try {
                 const generatedVector = await this.embeddingService.embed(content);
                 if (generatedVector) {
                     vector = generatedVector;
                 }
             } catch (e) {
                 console.warn(`[MemoryManager] Failed to auto-generate embedding for ${id}:`, e.message);
             }
        }

        if (vector && Array.isArray(vector)) {
            embeddingBlob = Buffer.from(new Float32Array(vector).buffer);
        }

        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO chunks (id, content, role, metadata, embedding, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(id, content, role, JSON.stringify(metadata), embeddingBlob, Date.now());
    }

    /**
     * Unified Search Interface (Hybrid)
     * Uses Reciprocal Rank Fusion (RRF) to combine FTS and Vector results.
     */
    async search(query, options = {}) {
        const { limit = 5, useVector = true, filterRole = null } = options;
        
        // 1. Run FTS Search
        const ftsResults = this.searchFTS(query, limit * 2, filterRole); // Get more candidates for re-ranking

        // 2. Run Vector Search (if enabled and service available)
        let vectorResults = [];
        if (useVector && this.embeddingService) {
            try {
                const queryVector = await this.embeddingService.embed(query);
                if (queryVector) {
                    vectorResults = this.searchVector(queryVector, limit * 2, filterRole);
                }
            } catch (e) {
                console.warn('[MemoryManager] Vector search failed:', e.message);
            }
        }

        // 3. Hybrid Ranking (RRF)
        if (vectorResults.length > 0) {
            return this.rankRRF(ftsResults, vectorResults, limit);
        } else {
            return ftsResults.slice(0, limit);
        }
    }

    /**
     * Reciprocal Rank Fusion
     * score = 1 / (k + rank)
     */
    rankRRF(ftsResults, vectorResults, limit, k = 60) {
        const scores = new Map();

        // Helper to update score
        const updateScore = (item, rank) => {
            const id = item.id;
            const currentScore = scores.get(id)?.score || 0;
            const newScore = currentScore + (1 / (k + rank));
            scores.set(id, { ...item, score: newScore });
        };

        // Process FTS (Rank starts at 1)
        ftsResults.forEach((item, index) => updateScore(item, index + 1));

        // Process Vector
        vectorResults.forEach((item, index) => updateScore(item, index + 1));

        // Sort by RRF score descending
        return Array.from(scores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
    }

    /**
     * Vector Search (Brute-force Cosine Similarity for MVP)
     * In production, use sqlite-vss or a vector DB.
     */
    searchVector(queryVector, limit = 10, filterRole = null) {
        // Fetch all chunks with embeddings
        let sql = `SELECT * FROM chunks WHERE embedding IS NOT NULL`;
        const params = [];
        
        if (filterRole) {
            sql += ` AND role = ?`;
            params.push(filterRole);
        }

        const candidates = this.db.prepare(sql).all(...params);
        
        if (candidates.length === 0) return [];

        // Calculate Cosine Similarity
        const results = candidates.map(row => {
            const buffer = row.embedding;
            const vector = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
            const similarity = this.cosineSimilarity(queryVector, vector);
            return {
                ...row,
                metadata: row.metadata ? JSON.parse(row.metadata) : {},
                similarity
            };
        });

        // Sort by similarity descending
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }

    cosineSimilarity(vecA, vecB) {
        let dot = 0.0;
        let normA = 0.0;
        let normB = 0.0;
        for (let i = 0; i < vecA.length; i++) {
            dot += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Full Text Search using FTS5
     */
    searchFTS(query, limit = 5, filterRole = null) {
        try {
            // Sanitize query for FTS5 (remove special chars that might break syntax)
            const safeQuery = query.replace(/["']/g, ''); 
            
            let sql = `
                SELECT c.*, bm25(chunks_fts) as rank
                FROM chunks_fts f
                JOIN chunks c ON c.rowid = f.rowid
                WHERE chunks_fts MATCH ?
            `;
            
            const params = [safeQuery];

            if (filterRole) {
                sql += ` AND c.role = ?`;
                params.push(filterRole);
            }

            sql += ` ORDER BY rank LIMIT ?`;
            params.push(limit);

            const stmt = this.db.prepare(sql);
            const results = stmt.all(...params);
            
            if (!results) return [];
            
            return results.map(row => ({
                ...row,
                metadata: row.metadata ? JSON.parse(row.metadata) : {}
            }));

        } catch (e) {
            console.warn('[MemoryManager] FTS search failed, falling back to LIKE:', e.message);
            // Fallback to LIKE
            let sql = `SELECT * FROM chunks WHERE content LIKE ?`;
            const params = [`%${query}%`];
            
            if (filterRole) {
                sql += ` AND role = ?`;
                params.push(filterRole);
            }
            
            sql += ` ORDER BY created_at DESC LIMIT ?`;
            params.push(limit);

            const results = this.db.prepare(sql).all(...params);
            
            if (!results) return [];

            return results.map(row => ({
                ...row,
                metadata: row.metadata ? JSON.parse(row.metadata) : {}
            }));
        }
    }

    /**
     * Get recent conversation history
     */
    getRecent(limit = 20) {
        const stmt = this.db.prepare(`
            SELECT * FROM chunks 
            WHERE role IN ('user', 'assistant', 'tool')
            ORDER BY created_at DESC 
            LIMIT ?
        `);
        // Reverse to return in chronological order (oldest first)
        return stmt.all(limit).reverse().map(row => ({
            role: row.role,
            content: row.content,
            metadata: row.metadata ? JSON.parse(row.metadata) : {}
        }));
    }

    close() {
        this.db.close();
    }
}
