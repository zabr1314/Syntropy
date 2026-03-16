import { EventBus } from './EventBus.js';
import { Session } from './Session.js';
import { LLM } from './LLM.js';
import { CronManager } from '../runtime/CronManager.js';
import { tracer } from '../infra/Tracer.js';

/**
 * The Kernel is the central nervous system of the platform.
 * It manages the lifecycle of agents, routes messages, and coordinates resources.
 * It should NOT contain any specific "game" logic (like Ministers or Emperors).
 */
export class Kernel {
    constructor(storage = null) {
        // Initialize Core Components
        this.events = new EventBus();
        this.session = new Session(storage);
        this.llm = new LLM();

        // Registry for Active Agents (Runtime Instances)
        this.agents = new Map();

        // Registry for Loaded Skills
        this.skillManager = null; // Injected after construction

        // Cron Manager
        this.cronManager = new CronManager(this);
    }

    /**
     * Register a runtime agent instance
     */
    registerAgent(agent) {
        if (!agent.id) throw new Error('Agent must have an ID');
        
        agent.kernel = this; // Inject kernel reference
        this.agents.set(agent.id, agent);
        console.log(`[Kernel] Registered Agent: ${agent.id}`);
        
        if (typeof agent.onWake === 'function') {
            agent.onWake();
        }
    }

    /**
     * Unregister a runtime agent instance
     */
    unregisterAgent(agentId) {
        if (!this.agents.has(agentId)) {
            console.warn(`[Kernel] Agent not found for unregistration: ${agentId}`);
            return false;
        }
        
        const agent = this.agents.get(agentId);
        // Optional: Call cleanup method on agent if exists
        // if (typeof agent.onDestroy === 'function') agent.onDestroy();
        
        this.agents.delete(agentId);
        console.log(`[Kernel] Unregistered Agent: ${agentId}`);
        return true;
    }

    getAgent(id) {
        return this.agents.get(id);
    }

    /**
     * Handle abstract commands (called by SocketGateway or other entry points)
     */
    async handleCommand({ targetId, action, payload }, traceId = null) {
        console.log(`[Kernel] Command: ${action} -> ${targetId} trace=${traceId || 'none'}`);

        const agent = this.getAgent(targetId);
        if (!agent) {
            console.warn(`[Kernel] Agent not found: ${targetId}`);
            return;
        }

        try {
            if (action === 'approve' || action === 'reject') {
                const { toolCallId, feedback } = payload;
                const approved = action === 'approve';
                console.log(`[Kernel] Processing approval: ${approved ? 'YES' : 'NO'} for ${toolCallId}`);
                if (agent.resumeFromApproval) {
                    await agent.resumeFromApproval(approved, feedback);
                } else {
                    console.warn(`[Kernel] Agent ${targetId} does not support approval workflow`);
                }
                return;
            }

            if (action === 'chat' || action === 'instruction') {
                const content = payload.content || payload.message || payload;
                await agent.execute(content, traceId);
            }
        } catch (error) {
            console.error(`[Kernel] Execution Error (${targetId}):`, error);
            this.events.publish(EventBus.EVENTS.AGENT_STATUS, {
                id: agent.id,
                status: 'error',
                message: error.message
            });
        }
    }

    /**
     * Dispatch an ACP message between agents
     */
    async dispatch(message, depth = 0, traceId = null) {
        const MAX_SPAWN_DEPTH = 2;
        if (depth >= MAX_SPAWN_DEPTH) {
            console.warn(`[Kernel] Max spawn depth reached (depth=${depth})`);
            return '[系统] 派生深度超限，拒绝执行';
        }

        const targetAgent = this.getAgent(message.to);

        if (!targetAgent) {
            console.warn(`[Kernel] Dispatch failed: Target ${message.to} not found`);
            return { error: 'Target not found' };
        }

        // Derive child traceId for sub-agent, or generate root if none
        const activeTraceId = traceId
            ? tracer.childTraceId(traceId, depth)
            : tracer.newTraceId();

        console.log(`[Kernel] ACP Dispatch: ${message.from} -> ${message.to} [${message.action}] depth=${depth} trace=${activeTraceId}`);

        const TIMEOUT_MS = 60000;
        const t0 = Date.now();
        tracer.dispatchStart(message.from, message.to, activeTraceId, depth);

        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`[${message.to}] dispatch timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
        );

        try {
            const result = await Promise.race([
                targetAgent.executeAsSubAgent({
                    from: message.from,
                    instruction: message.payload.instruction,
                    depth: depth + 1,
                    traceId: activeTraceId
                }),
                timeout
            ]);
            tracer.dispatchEnd(message.from, message.to, activeTraceId, depth, Date.now() - t0, true);
            return result;
        } catch (err) {
            tracer.dispatchEnd(message.from, message.to, activeTraceId, depth, Date.now() - t0, false);
            throw err;
        }
    }
}
