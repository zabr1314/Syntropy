
/**
 * Context Manager
 * Responsible for managing the LLM Context Window, Token Counting, and Message Pruning.
 * Inspired by OpenClaw's context.ts
 */

export class ContextManager {
    constructor(config = {}) {
        this.model = config.model || 'gpt-4o';
        this.tokenLimit = config.tokenLimit || 128000; // Default for GPT-4o
        this.reservedTokens = config.reservedTokens || 1000; // Reserve for response
        
        // Simple cache for token estimation
        this.tokenCache = new Map();
    }

    /**
     * Estimate token count for a string or message object
     * Uses a simple heuristic: ~4 characters per token for English, ~1-2 chars for Chinese.
     * For production, use 'tiktoken' or similar library.
     */
    estimateTokens(input) {
        if (!input) return 0;
        
        let content = '';
        if (typeof input === 'string') {
            content = input;
        } else if (typeof input === 'object') {
            if (input.content) {
                content = typeof input.content === 'string' ? input.content : JSON.stringify(input.content);
            }
            if (input.function) {
                content += JSON.stringify(input.function);
            }
            if (input.tool_calls) {
                content += JSON.stringify(input.tool_calls);
            }
        }

        // Heuristic: 
        // 1 Chinese char ~= 2 tokens (conservative)
        // 1 English word ~= 1.3 tokens -> 1 char ~= 0.25 tokens
        // To be safe, we can average or take a conservative approach.
        // Let's use: Length / 3 for English-heavy, Length / 1.5 for mixed.
        // A simple robust estimate: Length / 2.5
        
        // Better heuristic:
        const len = content.length;
        // Count non-ASCII characters
        const nonAscii = (content.match(/[^\x00-\x7F]/g) || []).length;
        const ascii = len - nonAscii;
        
        // ASCII: ~0.25 tokens per char
        // CJK: ~1.5 tokens per char
        // Overhead: +5 tokens per message wrapper
        const tokens = Math.ceil(ascii * 0.3 + nonAscii * 1.5) + 5;
        
        return tokens;
    }

    /**
     * Calculate total tokens for a list of messages
     */
    countTotalTokens(messages, tools = []) {
        let total = 0;
        
        // System Prompt & History
        for (const msg of messages) {
            total += this.estimateTokens(msg);
        }
        
        // Tools Definition Overhead
        if (tools && tools.length > 0) {
            const toolsJson = JSON.stringify(tools);
            total += this.estimateTokens(toolsJson);
        }
        
        return total;
    }

    /**
     * Prune messages to fit within the token limit.
     * Identifies "safe deletion units" to avoid splitting tool_call/tool_result pairs.
     *
     * Safe units:
     *   - A single user message (no dependencies)
     *   - A single assistant message without tool_calls
     *   - An assistant(tool_calls) message + ALL its corresponding tool results
     *
     * @param {Array} messages - Full message history including system prompt
     * @param {Array} tools - Tool definitions
     * @param {number} maxTokens - Optional override
     * @returns {Array} Pruned messages
     */
    pruneContext(messages, tools = [], maxTokens = null) {
        const limit = maxTokens || (this.tokenLimit - this.reservedTokens);
        let currentTokens = this.countTotalTokens(messages, tools);

        if (currentTokens <= limit) {
            return messages;
        }

        console.log(`[ContextManager] Pruning context: ${currentTokens} > ${limit}`);

        // Deep copy to avoid mutating original
        const pruned = [...messages];

        // Index 0 is system prompt — never remove it
        const startIndex = pruned[0]?.role === 'system' ? 1 : 0;

        // Build safe deletion units from startIndex
        const buildUnits = (msgs, start) => {
            const units = [];
            let i = start;
            while (i < msgs.length) {
                const msg = msgs[i];
                if (msg.role === 'user') {
                    units.push({ indices: [i] });
                    i++;
                } else if (msg.role === 'assistant' && (!msg.tool_calls || msg.tool_calls.length === 0)) {
                    units.push({ indices: [i] });
                    i++;
                } else if (msg.role === 'assistant' && msg.tool_calls?.length > 0) {
                    // Collect all tool_call_ids from this assistant message
                    const callIds = new Set(msg.tool_calls.map(tc => tc.id));
                    const groupIndices = [i];
                    i++;
                    // Collect all matching tool results (may not be contiguous in edge cases)
                    while (i < msgs.length && callIds.size > 0) {
                        if (msgs[i].role === 'tool' && callIds.has(msgs[i].tool_call_id)) {
                            callIds.delete(msgs[i].tool_call_id);
                            groupIndices.push(i);
                            i++;
                        } else {
                            break;
                        }
                    }
                    units.push({ indices: groupIndices });
                } else {
                    // tool result without matching assistant (orphan) — skip safely
                    i++;
                }
            }
            return units;
        };

        let removedCount = 0;
        while (currentTokens > limit) {
            const units = buildUnits(pruned, startIndex);
            if (units.length === 0) break;

            // Remove the earliest safe unit
            const unit = units[0];
            // Remove in reverse index order to preserve positions
            const sortedIndices = [...unit.indices].sort((a, b) => b - a);
            for (const idx of sortedIndices) {
                currentTokens -= this.estimateTokens(pruned[idx]);
                pruned.splice(idx, 1);
                removedCount++;
            }
        }

        if (removedCount > 0) {
            console.log(`[ContextManager] Pruned ${removedCount} messages (safe-unit strategy).`);
        }

        return pruned;
    }
    
    /**
     * Create a context object for the LLM
     */
    async composeContext({ systemPrompt, history, tools, query }) {
        const messages = [];
        
        // 1. System Prompt
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        
        // 2. History (Recent Conversation)
        // Ensure history is in correct chronological order
        if (history && Array.isArray(history)) {
             messages.push(...history);
        }

        // 3. Current User Query (if provided separately, though usually it's in history)
        if (query) {
             messages.push({ role: 'user', content: query });
        }

        // 4. Prune if necessary
        return this.pruneContext(messages, tools);
    }
}
