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
            // TODO: Load from persistent storage
            this.memories.set(agentId, []);
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

        // TODO: Async persist to storage
        if (this.storage) {
            this.storage.saveMessage(agentId, msgWithMeta);
        }
    }

    /**
     * Clear session data
     */
    async clear(agentId) {
        this.memories.set(agentId, []);
        // TODO: Clear storage
    }
}
