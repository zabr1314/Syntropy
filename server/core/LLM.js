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
            // Basic retry logic or error propagation could go here
            throw error;
        }
    }
}
