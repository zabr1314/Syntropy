export class BaseRole {
    constructor(config) {
        if (!config.id || !config.name) {
            throw new Error('Role must have id and name');
        }
        this.id = config.id;
        this.name = config.name;
        this.systemPrompt = config.systemPrompt || 'You are a helpful assistant.';
        this.tools = config.tools || [];
        
        this.kernel = null; // Will be injected by Kernel
        this.status = 'idle';
        this.lastMessage = '';
    }

    /**
     * Called when the role is registered
     */
    onWake() {
        this.setStatus('idle', '已就位');
    }

    /**
     * Update status and notify frontend
     */
    setStatus(status, message, action = null) {
        this.status = status;
        this.lastMessage = message;
        if (this.kernel) {
            this.kernel.events.publish('AGENT_UPDATE', {
                id: this.id,
                status,
                message,
                action
            });
        }
    }

    /**
     * Main Chat Logic
     * @param {string} userMessage 
     */
    async chat(userMessage) {
        if (!this.kernel) throw new Error('Kernel not attached');

        try {
            // 1. Add User Message to Context (Memory + Persistence)
            this.kernel.context.addMessage(this.id, { role: 'user', content: userMessage });
            this.kernel.memory.persistMessage(this.id, { role: 'user', content: userMessage });

            // 2. Call LLM Loop
            let keepGoing = true;
            let turns = 0;
            const MAX_TURNS = 5;

            while (keepGoing && turns < MAX_TURNS) {
                turns++;
                
                const history = this.kernel.context.getHistory(this.id);
                // Merge role-specific tools with global tools if needed
                // For now, use role.tools
                
                const responseMessage = await this.kernel.llm.chat(
                    this.systemPrompt, 
                    history, 
                    this.tools
                );

                // Add Assistant Message to Context
                this.kernel.context.addMessage(this.id, responseMessage);
                this.kernel.memory.persistMessage(this.id, responseMessage);

                // Handle Tool Calls or Final Response
                if (responseMessage.tool_calls) {
                    await this.handleToolCalls(responseMessage.tool_calls);
                } else {
                    const content = responseMessage.content;
                    this.setStatus('idle', content);
                    keepGoing = false;
                    return content;
                }
            }
        } catch (error) {
            console.error(`[Role ${this.id}] Chat Error:`, error);
            this.setStatus('error', `出错了: ${error.message}`);
            throw error;
        }
    }

    /**
     * Handle Tool Execution
     */
    async handleToolCalls(toolCalls) {
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            console.log(`[Role ${this.id}] Tool Call: ${functionName}`, args);
            
            // Execute Tool
            const result = await this.executeTool(functionName, args);

            // Add Tool Result to Context
            const toolResult = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(result)
            };
            this.kernel.context.addMessage(this.id, toolResult);
            this.kernel.memory.persistMessage(this.id, toolResult);
        }
    }

    /**
     * Override this method to implement custom tools
     */
    async executeTool(name, args) {
        return `Tool ${name} executed successfully.`;
    }
}
