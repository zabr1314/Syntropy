import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Unified LLM Adapter.
 * Currently supports OpenAI-compatible APIs (OpenAI, DeepSeek, etc.)
 */
export class LLM {
    constructor(config = {}) {
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL
        });
        this.defaultModel = process.env.OPENAI_MODEL || 'deepseek-chat';
    }

    /**
     * Standard chat completion wrapper
     * @param {Object} params
     * @param {string} params.systemPrompt
     * @param {Array} params.history - [{role, content}, ...]
     * @param {Array} params.tools - Optional tool definitions
     * @param {string} params.model - Optional model override
     */
    async chat({ systemPrompt, history, tools = [], model = null }) {
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history
            ];

            const response = await this.client.chat.completions.create({
                model: model || this.defaultModel,
                messages: messages,
                tools: tools.length > 0 ? tools : undefined,
            });

            return response.choices[0].message;
        } catch (error) {
            console.error('[LLM] Chat Error:', error);
            throw error;
        }
    }

    /**
     * Streaming chat completion wrapper
     * Calls onChunk(chunk) for each text delta, returns the assembled message.
     * @param {Object} params
     * @param {Function} params.onChunk - Callback invoked with each text chunk string
     */
    async chatStream({ systemPrompt, history, tools = [], model = null, onChunk }) {
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history
            ];

            const stream = await this.client.chat.completions.create({
                model: model || this.defaultModel,
                messages,
                tools: tools.length > 0 ? tools : undefined,
                stream: true,
            });

            let fullContent = '';
            const toolCallsMap = {};

            for await (const chunk of stream) {
                const delta = chunk.choices[0]?.delta;
                if (!delta) continue;

                if (delta.content) {
                    fullContent += delta.content;
                    if (onChunk) onChunk(delta.content);
                }

                // Accumulate streamed tool call fragments
                if (delta.tool_calls) {
                    for (const tc of delta.tool_calls) {
                        const idx = tc.index;
                        if (!toolCallsMap[idx]) {
                            toolCallsMap[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
                        }
                        if (tc.id) toolCallsMap[idx].id = tc.id;
                        if (tc.function?.name) toolCallsMap[idx].function.name += tc.function.name;
                        if (tc.function?.arguments) toolCallsMap[idx].function.arguments += tc.function.arguments;
                    }
                }
            }

            const tool_calls = Object.values(toolCallsMap);
            return {
                role: 'assistant',
                content: fullContent || null,
                tool_calls: tool_calls.length > 0 ? tool_calls : null,
            };
        } catch (error) {
            console.error('[LLM] Stream Error:', error);
            throw error;
        }
    }
}
