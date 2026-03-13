import fs from 'fs';
import path from 'path';

export class Memory {
    constructor(storagePath = './data/history.jsonl') {
        this.storagePath = storagePath;
        this.memories = new Map();
        this.MAX_HISTORY = 30;

        // Ensure directory exists
        const dir = path.dirname(this.storagePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.loadFromDisk();
    }

    /**
     * Load existing history from JSONL file
     */
    loadFromDisk() {
        if (!fs.existsSync(this.storagePath)) {
            console.log(`[Memory] No existing history found at ${this.storagePath}`);
            return;
        }

        try {
            const content = fs.readFileSync(this.storagePath, 'utf-8');
            const lines = content.split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
                const { agentId, message } = JSON.parse(line);
                if (!this.memories.has(agentId)) {
                    this.memories.set(agentId, []);
                }
                this.memories.get(agentId).push(message);
            });

            // Compact each agent's history if needed
            this.memories.forEach((history, agentId) => {
                if (history.length > this.MAX_HISTORY) {
                    this.memories.set(agentId, history.slice(-this.MAX_HISTORY));
                }
            });

            console.log(`[Memory] Loaded history for ${this.memories.size} agents from disk.`);
        } catch (error) {
            console.error('[Memory] Failed to load from disk:', error);
        }
    }

    /**
     * Get conversation history for an agent
     * @param {string} agentId 
     */
    getHistory(agentId) {
        if (!this.memories.has(agentId)) {
            this.memories.set(agentId, []);
        }
        return this.memories.get(agentId);
    }

    /**
     * Add a message to history and persist
     * @param {string} agentId 
     * @param {Object} message 
     */
    addMessage(agentId, message) {
        const history = this.getHistory(agentId);
        history.push(message);

        // Truncate in memory if exceeds limit
        if (history.length > this.MAX_HISTORY) {
            history.shift();
        }

        // Persist to disk (Append only)
        this.persistMessage(agentId, message);
    }

    /**
     * Append a single message to JSONL file
     */
    persistMessage(agentId, message) {
        try {
            const line = JSON.stringify({ agentId, message, timestamp: Date.now() }) + '\n';
            fs.appendFileSync(this.storagePath, line);
        } catch (error) {
            console.error('[Memory] Failed to persist message:', error);
        }
    }

    /**
     * Clear history for an agent
     */
    clearHistory(agentId) {
        this.memories.set(agentId, []);
        // Note: Real persistence would need to re-write or mark deleted.
        // For MVP simplicity, we just clear in memory. 
        // A full rewrite would be better but expensive for large files.
    }
}
