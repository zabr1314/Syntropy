import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

// Allow customization of API Key and Base URL via environment variables
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder',
    baseURL: process.env.OPENAI_BASE_URL
});

export class Agent {
    constructor({ id, name, systemPrompt, tools = [], runtime }) {
        this.id = id;
        this.name = name;
        this.systemPrompt = systemPrompt;
        this.tools = tools;
        this.runtime = runtime; // Reference to Runtime to call other agents
        this.messages = [];
        this.status = 'idle';
    }

    /**
     * Main entry point for chatting with the agent
     */
    async chat(userMessage) {
        try {
            this.setStatus('working', '思考中...');
            this.messages.push({ role: 'user', content: userMessage });

            let keepGoing = true;
            while (keepGoing) {
                const response = await openai.chat.completions.create({
                    model: process.env.OPENAI_MODEL || 'gpt-4o',
                    messages: [
                        { role: 'system', content: this.systemPrompt },
                        ...this.messages
                    ],
                    tools: this.tools.length > 0 ? this.tools : undefined,
                });

                const message = response.choices[0].message;
                this.messages.push(message);

                if (message.tool_calls) {
                    // Handle Tool Calls
                    await this.handleToolCalls(message.tool_calls);
                } else {
                    // Final Response
                    const content = message.content;
                    this.setStatus('idle', content);
                    return content;
                }
            }
        } catch (error) {
            console.error(`[Agent ${this.id}] Error:`, error);
            const errorMsg = `出错了: ${error.message}`;
            this.setStatus('error', errorMsg);
            return errorMsg;
        }
    }

    /**
     * Handle tool execution
     */
    async handleToolCalls(toolCalls) {
        const results = [];
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            console.log(`[Agent ${this.id}] Tool Call: ${functionName}`, args);

            let result;

            // Intercept 'call_official' for animation
            if (functionName === 'call_official') {
                const { official_id, instruction } = args;
                
                // 1. Emit SUMMON event for animation
                this.emitUpdate('working', `正在传唤: ${official_id}`, {
                    type: 'SUMMON',
                    target: official_id
                });

                // 2. Execute Sub-Agent via Runtime
                // Simulate a small delay for animation to start
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                result = await this.runtime.runAgent(official_id, instruction);
            } else {
                // Generic tool execution (if we had other tools)
                result = `Tool ${functionName} executed successfully.`;
            }

            // Add result to history
            this.messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            });
        }
    }

    /**
     * Helper to update status and emit event
     */
    setStatus(status, message, action = null) {
        this.status = status;
        this.emitUpdate(status, message, action);
    }

    emitUpdate(status, message, action = null) {
        if (this.runtime) {
            this.runtime.broadcastUpdate(this.id, {
                status,
                message,
                action
            });
        }
    }
}
