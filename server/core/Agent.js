import path from 'path';
import fs from 'fs';
import { MemoryManager } from '../runtime/MemoryManager.js';
import { ContextManager } from '../runtime/ContextManager.js';
import { EmbeddingService } from '../infra/EmbeddingService.js';

export const AgentState = {
    INITIALIZING: 'initializing',
    IDLE: 'idle',
    THINKING: 'thinking',
    ACTING: 'acting',
    WAITING_FOR_HUMAN: 'waiting_for_human',
    SLEEPING: 'sleeping',
    TERMINATED: 'terminated',
    ERROR: 'error'
};

/**
 * Agent Class - Replaces BaseRole to align with OpenClaw's architecture.
 * Encapsulates Configuration, Runtime State, and Capabilities.
 */
export class Agent {
    constructor(config) {
        // --- Identity & Metadata ---
        this.id = config.id;
        if (!this.id) throw new Error('Agent ID is required');
        
        this.name = config.name || this.id;
        this.description = config.description || '';
        
        // Identity Configuration (OpenClaw style)
        this.identity = {
            name: config.identity?.name || this.name,
            emoji: config.identity?.emoji || '🤖',
            avatar: config.identity?.avatar || null
        };

        // --- Workspace & Runtime ---
        // Default workspace: ./data/workspaces/<agent_id>
        this.workspace = config.workspace || path.join(process.cwd(), 'data', 'workspaces', this.id);
        this.ensureWorkspace();

        // --- Model Configuration ---
        // Support string or object format
        if (typeof config.model === 'string') {
            this.modelConfig = { primary: config.model, fallbacks: [] };
        } else {
            this.modelConfig = {
                primary: config.model?.primary || 'gpt-4o', // Default fallback
                fallbacks: config.model?.fallbacks || []
            };
        }
        
        // --- Runtime Configuration ---
        this.runtimeConfig = {
            maxTurns: config.maxTurns || 5,
            tokenLimit: config.tokenLimit || 4096,
            retryCount: config.retryCount || 3,
            temperature: config.temperature || 0.7
        };
        
        // --- Prompt Engineering ---
        this.systemPrompt = config.system_prompt || config.systemPrompt || 'You are a helpful assistant.';

        // --- Capabilities ---
        this.tools = config.tools || [];
        this.skillsFilter = config.skills || ['*']; // Default allow all
        
        // --- Routing & Bindings ---
        this.channels = config.channels || []; // e.g. [{ type: 'slack', id: 'C123' }]
        this.subagentsConfig = config.subagents || { allowAgents: ['*'] };

        // --- Runtime State ---
        this.status = AgentState.INITIALIZING;
        this.lastMessage = '';
        this.kernel = null; // Injected by Kernel

        // --- Memory & Context System ---
        // Initialize Embedding Service (Shared or Per-Agent? Shared is better for caching)
        // For MVP, we instantiate it here, but ideally it should be injected.
        this.embeddingService = new EmbeddingService();
        
        this.memory = new MemoryManager(this.id, './data/agents', this.embeddingService);
        this.context = new ContextManager({
            model: this.modelConfig.primary,
            tokenLimit: this.runtimeConfig.tokenLimit
        });
        
        // Runtime metrics
        this.metrics = {
            startTime: Date.now(),
            totalTurns: 0,
            lastActive: Date.now()
        };
    }

    /**
     * Ensure the agent's workspace directory exists.
     */
    ensureWorkspace() {
        if (!fs.existsSync(this.workspace)) {
            fs.mkdirSync(this.workspace, { recursive: true });
        }
    }

    /**
     * Called when the agent is initialized (before wake)
     */
    async onInit() {
        this.setStatus(AgentState.INITIALIZING, 'Initializing...');
        // Hook for resource loading
    }

    /**
     * Called when the agent is registered/waking up
     */
    async onWake() {
        this.setStatus(AgentState.IDLE, '');
        this.metrics.lastActive = Date.now();
    }

    /**
     * Called when the agent is going to sleep/inactive
     */
    async onSleep() {
        this.setStatus(AgentState.SLEEPING, 'Sleeping');
        // Hook for memory compaction or cleanup
    }

    /**
     * Unified Error Handler
     */
    async onError(error) {
        console.error(`[Agent ${this.id}] Runtime Error:`, error);
        this.setStatus(AgentState.ERROR, `Error: ${error.message}`);
        // TODO: Implement retry logic or fallback strategy here
    }

    /**
     * Get the effective model to use.
     * Can implement complex fallback logic here.
     */
    getModel() {
        return this.modelConfig.primary;
    }

    /**
     * Check if a specific skill is allowed for this agent.
     */
    isSkillAllowed(skillName) {
        if (this.skillsFilter.includes('*')) return true;
        return this.skillsFilter.includes(skillName);
    }

    /**
     * Update runtime configuration
     */
    updateConfig(newConfig) {
        if (newConfig.systemPrompt) {
            this.systemPrompt = newConfig.systemPrompt;
            console.log(`[Agent ${this.id}] Updated System Prompt`);
        }
        
        if (newConfig.tools) {
            this.tools = newConfig.tools;
            console.log(`[Agent ${this.id}] Updated Tools`);
        }
        
        if (newConfig.model) {
            // Handle both string and object formats
            if (typeof newConfig.model === 'string') {
                this.modelConfig.primary = newConfig.model;
            } else {
                this.modelConfig = { ...this.modelConfig, ...newConfig.model };
            }
            console.log(`[Agent ${this.id}] Updated Model to ${this.modelConfig.primary}`);
        }
        
        if (newConfig.skills) {
            this.skillsFilter = newConfig.skills;
            console.log(`[Agent ${this.id}] Updated Skills Filter:`, this.skillsFilter);
        }
        
        // Re-initialize context manager if needed (e.g., token limit changed)
        // For now, we assume token limit is static or handled by model config
    }

    /**
     * Core Execution Loop (Standardized)
     */
    async execute(input) {
        if (!this.kernel) throw new Error('Kernel not attached');

        this.metrics.lastActive = Date.now();
        // Immediately notify frontend that we are working
        this.setStatus(AgentState.THINKING, 'Thinking...');
        
        // Force a broadcast for "working" status if frontend expects it
        // Some frontends might only react to 'working' or specific status strings
        if (this.kernel) {
             this.kernel.events.publish('agent:status', {
                id: this.id,
                status: 'working', // Compatible with legacy frontend
                message: '正在思考...'
            });
        }

        try {
            // 1. Add User Message to Context (Session + Memory)
            await this.kernel.session.addMessage(this.id, { role: 'user', content: input });
            // Save to memory (auto-generates embedding)
            await this.memory.save(`msg_${Date.now()}_u`, input, 'user');

            // 2. Call LLM Loop
            let keepGoing = true;
            let turns = 0;
            const MAX_TURNS = this.runtimeConfig.maxTurns;

            while (keepGoing && turns < MAX_TURNS) {
                turns++;
                this.metrics.totalTurns++;
                
                // 3. Prepare Context with ContextManager
                // Merge role-specific tools with global skills (filtered)
                const globalSkills = this.kernel.skillManager ? this.kernel.skillManager.getAllDefinitions() : [];
                // Tool definitions use OpenAI format: { type: 'function', function: { name, ... } }
                const allowedSkills = globalSkills.filter(s => this.isSkillAllowed(s.function?.name));
                const allTools = [...this.tools, ...allowedSkills];

                // Step 3a: Use Session history as the authoritative conversation context.
                // Session preserves all required API fields (tool_calls, tool_call_id).
                // memory.getRecent() strips these fields and causes 400 errors.
                const sessionHistory = await this.kernel.session.getHistory(this.id);
                const rawHistory = sessionHistory.slice(-20);

                // Step 3b: Retrieve relevant long-term memories (RAG)
                let relevantMemories = [];
                if (turns === 1 && input.length > 5) {
                    relevantMemories = await this.memory.search(input, { limit: 3, useVector: true });
                }
                
                // Inject memories into system prompt or as a separate context message?
                // For now, let's append them to system prompt for simplicity
                let currentSystemPrompt = this.systemPrompt;
                if (relevantMemories.length > 0) {
                    const memoryText = relevantMemories.map(m => `- ${m.content}`).join('\n');
                    currentSystemPrompt += `\n\nRelevant Context:\n${memoryText}`;
                }

                // Compose final context (System Prompt + History + Pruning)
                const messages = await this.context.composeContext({
                    systemPrompt: currentSystemPrompt,
                    history: rawHistory,
                    tools: allTools
                });

                // Use configured model
                const model = this.getModel();
                
                const prunedHistory = messages.filter(m => m.role !== 'system');
                
                const responseMessage = await this.kernel.llm.chatStream({
                    model,
                    systemPrompt: currentSystemPrompt,
                    history: prunedHistory,
                    tools: allTools,
                    temperature: this.runtimeConfig.temperature,
                    onChunk: (chunk) => {
                        this.kernel.events.publish('agent:stream', { id: this.id, chunk });
                    }
                });

                // Always save the complete assistant message to Session.
                // This is critical: when the LLM makes tool calls, content is null but
                // tool_calls must be persisted so subsequent turns have a valid conversation
                // structure (API requires assistant tool_call → tool result pairing).
                const content = responseMessage.content || '';
                const assistantMsg = { role: 'assistant', content: responseMessage.content || null };
                if (responseMessage.tool_calls?.length > 0) {
                    assistantMsg.tool_calls = responseMessage.tool_calls;
                }
                await this.kernel.session.addMessage(this.id, assistantMsg);

                // Save text content to long-term memory for future RAG retrieval
                if (content) {
                    await this.memory.save(`msg_${Date.now()}_a`, content, 'assistant');
                }

                // Handle Tool Calls or Final Response
                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    this.setStatus(AgentState.ACTING, 'Executing tools...');
                    await this.handleToolCalls(responseMessage.tool_calls);
                    // Loop continues
                } else {
                    this.setStatus(AgentState.IDLE, content || 'Task completed');
                    keepGoing = false;
                    return content;
                }
            }
            
            if (turns >= MAX_TURNS) {
                this.setStatus(AgentState.IDLE, 'Max turns reached');
                return "Max turns reached.";
            }

        } catch (error) {
            await this.onError(error);
            throw error;
        }
    }

    /**
     * Handle Tool Calls
     */
    async handleToolCalls(toolCalls) {
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            let args = {};
            try {
                 args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
                console.error(`[Agent ${this.id}] Failed to parse tool arguments`, e);
            }
            
            // Check risk level
            const skill = this.kernel.skillManager.getSkill(functionName);
            if (skill && (skill.riskLevel === 'medium' || skill.riskLevel === 'high')) {
                // Suspend execution for approval
                this.setStatus(AgentState.WAITING_FOR_HUMAN, `Waiting for approval: ${functionName}`);
                
                // Notify frontend about approval request
                this.kernel.events.publish('approval:request', {
                    agentId: this.id,
                    toolCallId: toolCall.id,
                    functionName,
                    args,
                    riskLevel: skill.riskLevel
                });
                
                // Save state for resumption (simplified for MVP - assuming in-memory pause)
                // In a stateless system, we would need to persist this state to DB.
                // Here we block the loop? No, that would block the thread.
                // We need to return from execute() and wait for a callback.
                
                // For MVP, we can't easily pause the JS execution stack inside a loop without Generators or Workers.
                // Alternative: Throw a special "Suspension" error to exit the loop, 
                // and store the continuation context in the Agent instance.
                
                this.pendingApproval = {
                    toolCall,
                    toolCallsRemaining: toolCalls.slice(toolCalls.indexOf(toolCall) + 1)
                };
                
                return; // Exit execution loop
            }

            this.setStatus(AgentState.ACTING, `Executing tool: ${functionName}`);
            
            let result;
            try {
                // Check if it's a built-in tool or a global skill
                if (this.kernel.skillManager.hasSkill(functionName)) {
                    // Pass enriched context
                    const context = {
                        agent: this,
                        kernel: this.kernel,
                        workspace: this.workspace
                    };
                    result = await this.kernel.skillManager.execute(functionName, args, context);
                } else {
                    result = `Tool ${functionName} not found.`;
                }
            } catch (err) {
                console.error(`[Agent ${this.id}] Tool Execution Error:`, err);
                result = `Error executing ${functionName}: ${err.message}`;
            }

            // Add Tool Output to Context
            const toolMessage = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: typeof result === 'string' ? result : JSON.stringify(result)
            };
            
            await this.kernel.session.addMessage(this.id, toolMessage);
            await this.memory.save(`msg_${Date.now()}_t`, JSON.stringify(toolMessage), 'tool', { tool_call_id: toolCall.id });
        }
    }

    /**
     * Resume execution after approval
     */
    async resumeFromApproval(approved, feedback = '') {
        if (!this.pendingApproval) return;
        
        const { toolCall, toolCallsRemaining } = this.pendingApproval;
        this.pendingApproval = null;
        
        if (approved) {
            this.setStatus(AgentState.ACTING, `Resuming tool: ${toolCall.function.name}`);
            
            // Execute the approved tool
            const functionName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            
            let result;
            try {
                const context = { agent: this, kernel: this.kernel, workspace: this.workspace };
                result = await this.kernel.skillManager.execute(functionName, args, context);
            } catch (err) {
                result = `Error executing ${functionName}: ${err.message}`;
            }
            
            const toolMessage = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: typeof result === 'string' ? result : JSON.stringify(result)
            };
            
            await this.kernel.session.addMessage(this.id, toolMessage);
            await this.memory.save(`msg_${Date.now()}_t`, JSON.stringify(toolMessage), 'tool', { tool_call_id: toolCall.id });
            
            // Continue with remaining tools if any
            if (toolCallsRemaining.length > 0) {
                await this.handleToolCalls(toolCallsRemaining);
            }
            
            // Re-trigger execution loop (as if tool execution finished)
            // Note: This calls execute() again, which will load history (including the tool output)
            // and call LLM for the next step.
            await this.execute(''); 
        } else {
            this.setStatus(AgentState.IDLE, `Tool rejected: ${toolCall.function.name}`);
            
            const toolMessage = {
                role: 'tool',
                tool_call_id: toolCall.id,
                content: `User rejected execution. Feedback: ${feedback}`
            };
            
            await this.kernel.session.addMessage(this.id, toolMessage);
            await this.memory.save(`msg_${Date.now()}_t`, JSON.stringify(toolMessage), 'tool', { tool_call_id: toolCall.id });
            
            // Continue execution to let LLM handle rejection
            await this.execute('');
        }
    }

    /**
     * Execute as a sub-agent dispatched by another agent.
     * Temporarily injects task origin context into the system prompt.
     */
    async executeAsSubAgent({ from, instruction }) {
        const originalPrompt = this.systemPrompt;
        this.systemPrompt = `${this.systemPrompt}\n\n[任务来源：${from}]`;
        // Clear stale session history so each sub-agent dispatch starts fresh.
        // Officials are stateless workers — old tool_call chains cause 400 API errors.
        if (this.kernel) {
            await this.kernel.session.clear(this.id);
        }
        try {
            return await this.execute(instruction);
        } finally {
            this.systemPrompt = originalPrompt;
        }
    }

    setStatus(status, message) {
        this.status = status;
        this.lastMessage = message || this.lastMessage;
        
        // Notify via Kernel events
        if (this.kernel) {
            this.kernel.events.publish('agent:status', {
                id: this.id,
                status: this.status,
                message: this.lastMessage
            });
        }
    }

}
