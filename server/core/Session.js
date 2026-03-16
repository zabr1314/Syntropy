/**
 * Session Manager
 * Manages conversation state and history for active agents.
 */
export class Session {
    constructor(storage) {
        this.storage = storage; // Inject storage dependency (Phase 3)
        this.memories = new Map(); // In-memory cache
        this.MAX_HISTORY = 50;
    }

    /**
     * Retrieve history for a specific agent context
     */
    async getHistory(agentId) {
        if (!this.memories.has(agentId)) {
            // Load from persistent storage on cache miss
            if (this.storage) {
                // SessionStore.loadMessages is synchronous (better-sqlite3)
                const saved = this.storage.loadMessages(agentId);
                // Keep only the most recent MAX_HISTORY entries
                this.memories.set(agentId, saved.slice(-this.MAX_HISTORY));
            } else {
                this.memories.set(agentId, []);
            }
        }
        return this.memories.get(agentId);
    }

    /**
     * Add a message to the history
     */
    async addMessage(agentId, message) {
        const history = await this.getHistory(agentId);

        // Add timestamp if missing
        const msgWithMeta = {
            ...message,
            timestamp: Date.now()
        };

        history.push(msgWithMeta);

        // Simple compaction strategy
        if (history.length > this.MAX_HISTORY) {
            history.shift(); // Remove oldest
        }

        // Persist to storage
        if (this.storage) {
            // SessionStore.saveMessage is synchronous (better-sqlite3)
            this.storage.saveMessage(agentId, msgWithMeta);
        }
    }

    /**
     * Clear session data
     */
    async clear(agentId) {
        this.memories.set(agentId, []);
        if (this.storage) {
            this.storage.clearMessages(agentId);
        }
    }
}
