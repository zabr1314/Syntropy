
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
     * Strategy: Keep System Prompt + Recent Messages. Prune oldest user/assistant pairs.
     * Always keep the last N messages to maintain immediate context.
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
        
        // Identify System Prompt (usually first)
        const systemPrompt = pruned.find(m => m.role === 'system');
        
        // We want to keep System Prompt and the very last user message (if possible)
        // So we remove from the beginning of the "history" part (index 1 onwards)
        
        // Simple strategy: Remove messages from index 1 (after system) until it fits.
        // But we should try to remove pairs (User + Assistant) or tool chains to keep coherence?
        // For now, simple FIFO removal from the "middle".
        
        let removedCount = 0;
        // Start checking from index 1 (assuming index 0 is system)
        // If no system prompt, start from 0.
        let startIndex = systemPrompt ? 1 : 0;
        
        while (currentTokens > limit && pruned.length > startIndex + 1) { // +1 to keep at least one recent msg
            const removed = pruned.splice(startIndex, 1)[0];
            currentTokens -= this.estimateTokens(removed);
            removedCount++;
        }

        if (removedCount > 0) {
            // Insert a placeholder to indicate omitted context? 
            // Some models might get confused, but for debugging it's useful.
            // pruned.splice(startIndex, 0, { role: 'system', content: `[...${removedCount} messages pruned...]` });
            console.log(`[ContextManager] Pruned ${removedCount} messages.`);
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
