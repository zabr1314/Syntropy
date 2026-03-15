import fs from 'fs';
import path from 'path';

/**
 * Persistence Layer Adapter.
 * Currently supports JSONL (Line-delimited JSON).
 * Can be upgraded to SQLite later.
 */
export class Storage {
    constructor(config = {}) {
        this.baseDir = config.path || './data';
        this.ensureDir(this.baseDir);
    }

    ensureDir(dir) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Append a record to a JSONL file
     */
    async append(collection, data) {
        const filePath = path.join(this.baseDir, `${collection}.jsonl`);
        const line = JSON.stringify({ ...data, _ts: Date.now() }) + '\n';
        await fs.promises.appendFile(filePath, line);
    }

    /**
     * Read all records from a JSONL file
     */
    async readAll(collection) {
        const filePath = path.join(this.baseDir, `${collection}.jsonl`);
        if (!fs.existsSync(filePath)) return [];

        const content = await fs.promises.readFile(filePath, 'utf-8');
        return content
            .split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line));
    }

    /**
     * Specific helper for Session Messages
     */
    async saveMessage(agentId, message) {
        await this.append('history', { agentId, message });
    }

    /**
     * Load messages for a specific agent from persistent storage
     */
    async loadMessages(agentId) {
        const all = await this.readAll('history');
        const clearedAt = this._clearedAt?.[agentId] || 0;
        return all
            .filter(r => r.agentId === agentId && r._ts > clearedAt)
            .map(r => r.message);
    }

    /**
     * Clear messages for a specific agent (marks cleared timestamp in memory)
     */
    clearMessages(agentId) {
        if (!this._clearedAt) this._clearedAt = {};
        this._clearedAt[agentId] = Date.now();
    }
}
