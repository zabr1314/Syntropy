import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export class LLM {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
            baseURL: process.env.OPENAI_BASE_URL
        });
        this.model = process.env.OPENAI_MODEL || 'gpt-4o';
    }

    /**
     * @param {string} systemPrompt 
     * @param {Array} history 
     * @param {Array} tools 
     * @returns {Promise<Object>} OpenAI Chat Completion Response Message
     */
    async chat(systemPrompt, history, tools = []) {
        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history
            ];

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: messages,
                tools: tools.length > 0 ? tools : undefined,
            });

            return response.choices[0].message;
        } catch (error) {
            console.error('[LLM] Chat Error:', error);
            throw error;
        }
    }
}
