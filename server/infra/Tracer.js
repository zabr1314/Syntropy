import { randomBytes } from 'crypto';

/**
 * Tracer - Structured observability for the agent runtime.
 *
 * Responsibilities:
 *   1. traceId generation and propagation
 *   2. Structured diagnostic event emission
 *   3. Log redaction (API keys, Bearer tokens, secrets)
 *   4. Stuck-agent detection
 */

// ─── Redaction ───────────────────────────────────────────────────────────────

const REDACT_PATTERNS = [
    // Bearer / Authorization headers
    { re: /(Bearer\s+)([A-Za-z0-9\-._~+/]{8,})/gi,   replace: (_, p, v) => p + redactValue(v) },
    // sk- style keys (OpenAI, DeepSeek, etc.)
    { re: /(sk-[A-Za-z0-9]{4})[A-Za-z0-9\-]*/g,       replace: (_, p) => p + '…[redacted]' },
    // password= / secret= / apiKey= / api_key= in any context
    { re: /("?(?:password|secret|api_?key|token)"?\s*[:=]\s*")([^"]{4,})(")/gi,
      replace: (_, k, v, q) => k + redactValue(v) + q },
];

function redactValue(val) {
    if (val.length <= 8) return '***';
    return val.slice(0, 6) + '…' + val.slice(-4);
}

export function redact(text) {
    if (typeof text !== 'string') return text;
    let out = text;
    for (const { re, replace } of REDACT_PATTERNS) {
        out = out.replace(re, replace);
    }
    return out;
}

// ─── Tracer ──────────────────────────────────────────────────────────────────

export class Tracer {
    constructor() {
        // agentId → { traceId, since (ms timestamp) }
        this._activeAgents = new Map();

        // Stuck detection: check every 60s, warn after STUCK_THRESHOLD_MS
        this.STUCK_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
        this._stuckTimer = setInterval(() => this._checkStuck(), 60_000);
        // Don't block process exit
        if (this._stuckTimer.unref) this._stuckTimer.unref();
    }

    // ── traceId helpers ──────────────────────────────────────────────────────

    /** Generate a new root traceId (8 hex chars, readable) */
    newTraceId() {
        return randomBytes(4).toString('hex');
    }

    /** Derive a child traceId for sub-agent dispatch */
    childTraceId(parentTraceId, depth) {
        return `${parentTraceId}.${depth}`;
    }

    // ── Event emission ───────────────────────────────────────────────────────

    /**
     * Emit a structured diagnostic event to stdout.
     * Format: [TRACE] <event> <json>
     */
    emit(event, data = {}) {
        const payload = { event, ts: Date.now(), ...data };
        // Redact the serialized output before printing
        console.log(`[TRACE] ${redact(JSON.stringify(payload))}`);
    }

    // ── Lifecycle markers ────────────────────────────────────────────────────

    /** Call when an agent starts a turn (THINKING state) */
    agentTurnStart(agentId, traceId, turn) {
        this._activeAgents.set(agentId, { traceId, since: Date.now(), turn });
        this.emit('agent.turn.start', { agentId, traceId, turn });
    }

    /** Call when an agent finishes a turn */
    agentTurnEnd(agentId, traceId, turn, durationMs) {
        this._activeAgents.delete(agentId);
        this.emit('agent.turn.end', { agentId, traceId, turn, durationMs });
    }

    /** Call after LLM responds — record token usage */
    modelUsage(agentId, traceId, { model, promptTokens, completionTokens, durationMs }) {
        this.emit('model.usage', { agentId, traceId, model, promptTokens, completionTokens, durationMs });
    }

    /** Call before a tool executes */
    toolCallStart(agentId, traceId, { toolName, callId }) {
        this.emit('tool.call.start', { agentId, traceId, toolName, callId });
    }

    /** Call after a tool finishes */
    toolCallEnd(agentId, traceId, { toolName, callId, durationMs, ok }) {
        this.emit('tool.call.end', { agentId, traceId, toolName, callId, durationMs, ok });
    }

    /** Call at dispatch entry */
    dispatchStart(from, to, traceId, depth) {
        this.emit('dispatch.start', { from, to, traceId, depth });
    }

    /** Call at dispatch exit */
    dispatchEnd(from, to, traceId, depth, durationMs, ok) {
        this.emit('dispatch.end', { from, to, traceId, depth, durationMs, ok });
    }

    /** Call when agent enters approval wait */
    approvalWait(agentId, traceId, toolName) {
        this.emit('approval.wait', { agentId, traceId, toolName });
    }

    // ── Stuck detection ──────────────────────────────────────────────────────

    _checkStuck() {
        const now = Date.now();
        for (const [agentId, { traceId, since, turn }] of this._activeAgents) {
            const elapsed = now - since;
            if (elapsed > this.STUCK_THRESHOLD_MS) {
                this.emit('agent.stuck', { agentId, traceId, turn, elapsedMs: elapsed });
                console.warn(`[Tracer] agent.stuck: ${agentId} has been in turn ${turn} for ${Math.round(elapsed / 1000)}s`);
            }
        }
    }

    destroy() {
        clearInterval(this._stuckTimer);
    }
}

// Singleton — import and use directly
export const tracer = new Tracer();
