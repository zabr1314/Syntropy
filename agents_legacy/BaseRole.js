import { MemoryManager } from '../server/runtime/MemoryManager.js';

export const RoleState = {
    INITIALIZING: 'initializing',
    IDLE: 'idle',
    THINKING: 'thinking',
    ACTING: 'acting',
    WAITING_FOR_HUMAN: 'waiting_for_human',
    SLEEPING: 'sleeping',
    TERMINATED: 'terminated',
    ERROR: 'error'
};

export class BaseRole {
    constructor(config) {
        if (!config.id || !config.name) {
            throw new Error('Role must have id and name');
        }
        this.id = config.id;
        this.name = config.name;
        this.systemPrompt = config.systemPrompt || 'You are a helpful assistant.';
        this.description = config.description || '';
        this.role_class = config.role_class || 'BaseRole';
        this.permissions = config.permissions || [];
        
        // Configuration with defaults
        this.config = {
            maxTurns: config.maxTurns || 5,
            tokenLimit: config.tokenLimit || 4096, // Context window limit
            model: config.model || 'gpt-4',
            retryCount: config.retryCount || 3,
            temperature: config.temperature || 0.7,
            ...config.config // Merge extra config
        };

        // Capabilities are now handled by Skills, but we keep this for backwards compatibility
        // or specific role-bound logic
        this.tools = config.tools || [];
        
        this.kernel = null; // Will be injected by Kernel
        this.status = RoleState.INITIALIZING;
        this.lastMessage = '';

        // Initialize Memory Manager
        this.memory = new MemoryManager(this.id);
        
        // Runtime metrics
        this.metrics = {
            startTime: Date.now(),
            totalTurns: 0,
            lastActive: Date.now()
        };
    }

    /**
     * Called when the role is initialized (before wake)
     */
    async onInit() {
        this.setStatus(RoleState.INITIALIZING, '正在初始化...');
        // Hook for resource loading
    }

    /**
     * Called when the role is registered/waking up
     */
    async onWake() {
        this.setStatus(RoleState.IDLE, '已就位');
        this.metrics.lastActive = Date.now();
    }

    /**
     * Called when the role is going to sleep/inactive
     */
    async onSleep() {
        this.setStatus(RoleState.SLEEPING, '休眠中');
        // Hook for memory compaction or cleanup
    }

    /**
     * Unified Error Handler
     */
    async onError(error) {
        console.error(`[Role ${this.id}] Runtime Error:`, error);
        this.setStatus(RoleState.ERROR, `错误: ${error.message}`);
        // TODO: Implement retry logic or fallback strategy here
    }

    /**
     * Update status and notify frontend
     */
    setStatus(status, message, action = null) {
        this.status = status;
        this.lastMessage = message;
        if (this.kernel) {
            this.kernel.events.publish('agent:status', {
                id: this.id,
                status,
                message,
                action
            });
        }
    }

    /**
     * Main Execution Logic
     * @param {string} input - User input or system instruction
     */
    async execute(input) {
        if (!this.kernel) throw new Error('Kernel not attached');

        this.metrics.lastActive = Date.now();
        this.setStatus(RoleState.THINKING, '思考中...');

        try {
            // 1. Add User Message to Context (Session + Memory)
            await this.kernel.session.addMessage(this.id, { role: 'user', content: input });
            this.memory.save(`msg_${Date.now()}_u`, input, 'user');

            // 2. Token Budget Check (Placeholder)
            // const currentTokens = this.estimateTokens(this.memory.getRecent(10));
            // if (currentTokens > this.config.tokenLimit) { this.compactMemory(); }

            // 3. Call LLM Loop
            let keepGoing = true;
            let turns = 0;
            const MAX_TURNS = this.config.maxTurns;

            while (keepGoing && turns < MAX_TURNS) {
                turns++;
                this.metrics.totalTurns++;
                
                // Get history from Memory instead of Session (Hybrid approach)
                const history = this.memory.getRecent(10);
                
                // Merge role-specific tools with global skills
                const globalTools = this.kernel.skillManager ? this.kernel.skillManager.getAllDefinitions() : [];
                const allTools = [...this.tools, ...globalTools];

                const responseMessage = await this.kernel.llm.chat({
                    systemPrompt: this.systemPrompt, 
                    history, 
                    tools: allTools,
                    temperature: this.config.temperature
                });

                // Add Assistant Message to Context
                const content = responseMessage.content || '';
                // Note: Some LLM responses might be null content if it's a tool call, ensure we handle that
                if (content) {
                     await this.kernel.session.addMessage(this.id, { role: 'assistant', content });
                     this.memory.save(`msg_${Date.now()}_a`, content, 'assistant');
                }

                // Handle Tool Calls or Final Response
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    this.setStatus(RoleState.ACTING, '执行工具调用中...');
                    await this.handleToolCalls(responseMessage.tool_calls);
                    // Loop continues to get LLM's interpretation of tool results
                } else {
                    this.setStatus(RoleState.IDLE, content || '任务完成');
                    keepGoing = false;
                    return content;
                }
            }
            
            if (turns >= MAX_TURNS) {
                this.setStatus(RoleState.IDLE, '达到最大对话轮数，停止执行');
                return "Max turns reached.";
            }

        } catch (error) {
            await this.onError(error);
            throw error;
        }
    }

    /**
     * Handle Tool Execution
     */
    async handleToolCalls(toolCalls) {
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            let args = {};
            try {
                 args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
                console.error(`[Role ${this.id}] Failed to parse tool arguments`, e);
                // Continue with empty args or handle error?
            }

            console.log(`[Role ${this.id}] Tool Call: ${functionName}`, args);
            
            // Try to find handler in Role first, then SkillManager
            let result;
            try {
                if (typeof this.executeTool === 'function' && await this.canHandleTool(functionName)) {
                     result = await this.executeTool(functionName, args);
                } else if (this.kernel.skillManager) {
                    const skill = this.kernel.skillManager.getSkill(functionName);
                    if (skill) {
                        result = await skill.handler(args, { agent: this, kernel: this.kernel });
                    } else {
                        throw new Error(`Tool ${functionName} not found`);
                    }
                } else {
                    throw new Error(`Tool ${functionName} not found`);
                }
            } catch (err) {
                console.error(`[Role ${this.id}] Tool Execution Error:`, err);
                result = `Error executing tool ${functionName}: ${err.message}`;
            }

            // Add Tool Result to Context
            const toolResult = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: typeof result === 'string' ? result : JSON.stringify(result)
            };
            
            // Save to session and memory
            await this.kernel.session.addMessage(this.id, toolResult);
            // Tool results might be too large for simple memory log, but saving for now
            this.memory.save(`msg_${Date.now()}_t`, JSON.stringify(toolResult), 'tool');
        }
    }

    /**
     * Default tool handler for the role itself
     * Override this in subclasses to handle specific tools
     */
    async executeTool(name, args) {
        // By default, BaseRole doesn't handle any tools
        throw new Error(`Tool ${name} not handled by role ${this.id}`);
    }

    /**
     * Check if the role can handle a specific tool
     */
    async canHandleTool(name) {
        // Check if the tool is defined in the role's tools list
        return this.tools.some(t => t.function.name === name);
    }
}
