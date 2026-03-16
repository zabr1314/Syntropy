import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

/**
 * SessionStore - SQLite-backed session persistence.
 * Replaces JSONL-based Storage for session messages.
 * Uses better-sqlite3 (synchronous API) for simplicity and performance.
 */
export class SessionStore {
    constructor(dbPath = './data/sessions.db') {
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS messages (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                agent_id    TEXT    NOT NULL,
                role        TEXT    NOT NULL,
                content     TEXT,
                tool_calls  TEXT,
                tool_call_id TEXT,
                name        TEXT,
                created_at  INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_agent_created
                ON messages(agent_id, created_at);
        `);

        this.stmtInsert = this.db.prepare(
            `INSERT INTO messages (agent_id, role, content, tool_calls, tool_call_id, name, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
        );
        this.stmtLoad = this.db.prepare(
            `SELECT * FROM messages WHERE agent_id = ? ORDER BY created_at ASC LIMIT 50`
        );
        this.stmtClear = this.db.prepare(
            `DELETE FROM messages WHERE agent_id = ?`
        );
    }

    /**
     * Persist a single message for an agent (synchronous).
     */
    saveMessage(agentId, message) {
        this.stmtInsert.run(
            agentId,
            message.role,
            message.content ?? null,
            message.tool_calls ? JSON.stringify(message.tool_calls) : null,
            message.tool_call_id ?? null,
            message.name ?? null,
            message.timestamp || Date.now()
        );
    }

    /**
     * Load all messages for an agent (synchronous, returns array).
     */
    loadMessages(agentId) {
        return this.stmtLoad.all(agentId).map(row => {
            const msg = { role: row.role, timestamp: row.created_at };
            if (row.content !== null) msg.content = row.content;
            if (row.tool_calls)      msg.tool_calls = JSON.parse(row.tool_calls);
            if (row.tool_call_id)    msg.tool_call_id = row.tool_call_id;
            if (row.name)            msg.name = row.name;
            return msg;
        });
    }

    /**
     * Delete all messages for an agent (synchronous).
     */
    clearMessages(agentId) {
        this.stmtClear.run(agentId);
    }
}
