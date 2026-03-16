import path from 'path';
import fs from 'fs';
import { MemoryManager } from '../runtime/MemoryManager.js';
import { ContextManager } from '../runtime/ContextManager.js';
import { EmbeddingService } from '../infra/EmbeddingService.js';
import { tracer } from '../infra/Tracer.js';

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
    async execute(input, traceId = null) {
        if (!this.kernel) throw new Error('Kernel not attached');

        // Use provided traceId (from sub-agent dispatch) or generate a new root one
        const activeTraceId = traceId || tracer.newTraceId();
        this._currentTraceId = activeTraceId;

        this.metrics.lastActive = Date.now();
        this.setStatus(AgentState.THINKING, 'Thinking...');

        if (this.kernel) {
             this.kernel.events.publish('agent:status', {
                id: this.id,
                status: 'working',
                message: '正在思考...'
            });
        }

        try {
            await this.kernel.session.addMessage(this.id, { role: 'user', content: input });
            await this.memory.save(`msg_${Date.now()}_u`, input, 'user');

            let keepGoing = true;
            let turns = 0;
            const MAX_TURNS = this.runtimeConfig.maxTurns;

            while (keepGoing && turns < MAX_TURNS) {
                turns++;
                this.metrics.totalTurns++;

                const t0 = Date.now();
                tracer.agentTurnStart(this.id, activeTraceId, turns);

                const globalSkills = this.kernel.skillManager ? this.kernel.skillManager.getAllDefinitions() : [];
                const allowedSkills = globalSkills.filter(s => this.isSkillAllowed(s.function?.name));
                const allTools = [...this.tools, ...allowedSkills];

                const sessionHistory = await this.kernel.session.getHistory(this.id);
                const rawHistory = sessionHistory.slice(-20);

                let relevantMemories = [];
                if (turns === 1 && input.length > 5) {
                    relevantMemories = await this.memory.search(input, { limit: 3, useVector: true });
                }

                let currentSystemPrompt = this.systemPrompt;
                if (relevantMemories.length > 0) {
                    const memoryText = relevantMemories.map(m => `- ${m.content}`).join('\n');
                    currentSystemPrompt += `\n\nRelevant Context:\n${memoryText}`;
                }

                const messages = await this.context.composeContext({
                    systemPrompt: currentSystemPrompt,
                    history: rawHistory,
                    tools: allTools
                });

                const model = this.getModel();
                const prunedHistory = messages.filter(m => m.role !== 'system');

                const responseMessage = await this.kernel.llm.chatStream({
                    model,
                    systemPrompt: currentSystemPrompt,
                    history: prunedHistory,
                    tools: allTools,
                    temperature: this.runtimeConfig.temperature,
                    traceId: activeTraceId,
                    agentId: this.id,
                    onChunk: (chunk) => {
                        this.kernel.events.publish('agent:stream', { id: this.id, chunk });
                    }
                });

                tracer.agentTurnEnd(this.id, activeTraceId, turns, Date.now() - t0);

                const content = responseMessage.content || '';
                const assistantMsg = { role: 'assistant', content: responseMessage.content || null };
                if (responseMessage.tool_calls?.length > 0) {
                    assistantMsg.tool_calls = responseMessage.tool_calls;
                }
                await this.kernel.session.addMessage(this.id, assistantMsg);

                if (content) {
                    await this.memory.save(`msg_${Date.now()}_a`, content, 'assistant');
                }

                if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
                    this.setStatus(AgentState.ACTING, 'Executing tools...');
                    await this.handleToolCalls(responseMessage.tool_calls, activeTraceId);
                } else {
                    this.setStatus(AgentState.IDLE, content || 'Task completed');
                    keepGoing = false;

                    const CAPTURE_KEYWORDS = ['记住', '偏好', '总是', '永远', '不要', '喜欢', '习惯',
                                              'remember', 'prefer', 'always', 'never', 'like', 'hate'];
                    const shouldCapture = input && input.length >= 10 && input.length <= 2000 &&
                        CAPTURE_KEYWORDS.some(k => input.toLowerCase().includes(k));
                    if (turns === 1 && shouldCapture) {
                        await this.memory.save(`pref_${Date.now()}`, input, 'user_preference');
                    }

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
    async handleToolCalls(toolCalls, traceId = null) {
        const activeTraceId = traceId || this._currentTraceId || 'unknown';
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
                this.setStatus(AgentState.WAITING_FOR_HUMAN, `Waiting for approval: ${functionName}`);
                tracer.approvalWait(this.id, activeTraceId, functionName);

                this.kernel.events.publish('approval:request', {
                    agentId: this.id,
                    toolCallId: toolCall.id,
                    functionName,
                    args,
                    riskLevel: skill.riskLevel
                });

                this.pendingApproval = {
                    toolCall,
                    toolCallsRemaining: toolCalls.slice(toolCalls.indexOf(toolCall) + 1)
                };

                return;
            }

            this.setStatus(AgentState.ACTING, `Executing tool: ${functionName}`);
            tracer.toolCallStart(this.id, activeTraceId, { toolName: functionName, callId: toolCall.id });
            const t0 = Date.now();

            let result;
            try {
                if (this.kernel.skillManager.hasSkill(functionName)) {
                    const context = {
                        agent: this,
                        kernel: this.kernel,
                        workspace: this.workspace,
                        depth: this._currentDepth || 0,
                        traceId: activeTraceId
                    };
                    result = await this.kernel.skillManager.execute(functionName, args, context);
                } else {
                    result = `Tool ${functionName} not found.`;
                }
                tracer.toolCallEnd(this.id, activeTraceId, { toolName: functionName, callId: toolCall.id, durationMs: Date.now() - t0, ok: true });
            } catch (err) {
                console.error(`[Agent ${this.id}] Tool Execution Error:`, err);
                tracer.toolCallEnd(this.id, activeTraceId, { toolName: functionName, callId: toolCall.id, durationMs: Date.now() - t0, ok: false });
                result = `Error executing ${functionName}: ${err.message}`;
            }

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
    async executeAsSubAgent({ from, instruction, depth = 0, traceId = null }) {
        this._currentDepth = depth;
        const originalPrompt = this.systemPrompt;
        this.systemPrompt = `${this.systemPrompt}\n\n[任务来源：${from}]`;
        if (this.kernel) {
            await this.kernel.session.clear(this.id);
        }
        try {
            return await this.execute(instruction, traceId);
        } finally {
            this.systemPrompt = originalPrompt;
            this._currentDepth = 0;
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
