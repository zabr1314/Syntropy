import { EventBus } from './EventBus.js';
import { Session } from './Session.js';
import { LLM } from './LLM.js';
import { CronManager } from '../runtime/CronManager.js';

/**
 * The Kernel is the central nervous system of the platform.
 * It manages the lifecycle of agents, routes messages, and coordinates resources.
 * It should NOT contain any specific "game" logic (like Ministers or Emperors).
 */
export class Kernel {
    constructor(io, storage = null) {
        this.io = io; // Socket.io instance
        
        // Initialize Core Components
        this.events = new EventBus();
        this.session = new Session(storage); // Pass storage for persistence
        this.llm = new LLM();
        
        // Registry for Active Agents (Runtime Instances)
        this.agents = new Map();
        
        // Registry for Loaded Skills
        this.skillManager = null; // Will be injected in Phase 2
        
        // Cron Manager
        this.cronManager = new CronManager(this);

        this.setupSocket();
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
     * Set up external communication (WebSocket)
     */
    setupSocket() {
        if (!this.io) return;

        this.io.on('connection', (socket) => {
            console.log(`[Kernel] Socket Connected: ${socket.id}`);

            socket.on('register', (data) => {
                if (data.type === 'frontend') {
                    socket.join('frontend');
                    const roomSize = this.io.sockets.adapter.rooms.get('frontend')?.size || 0;
                    console.log(`[Kernel] Socket ${socket.id} joined 'frontend'. Room size: ${roomSize}`);
                    this.broadcastState(socket);
                }
            });

            // Handle incoming commands from frontend
            socket.on('command', (data) => {
                console.log(`[Kernel] Received command payload:`, JSON.stringify(data));
                this.handleCommand(data);
            });
        });

        // Listen to internal events and broadcast updates
        this.events.subscribe(EventBus.EVENTS.AGENT_STATUS, (data) => {
            if (this.io) {
                const roomSize = this.io.sockets.adapter.rooms.get('frontend')?.size || 0;
                console.log(`[Kernel] Broadcasting update for ${data.id} (${data.status}) to ${roomSize} clients`);
                this.io.to('frontend').emit('agent_update', data);
            }
        });

        // Forward streaming chunks to frontend
        this.events.subscribe('agent:stream', (data) => {
            if (this.io) {
                this.io.to('frontend').emit('agent_stream', data);
            }
        });

        // Listen for approval requests
        this.events.subscribe('approval:request', (data) => {
            if (this.io) {
                console.log(`[Kernel] Broadcasting approval request for ${data.agentId}`);
                this.io.to('frontend').emit('approval_request', data);
            }
        });

        // Broadcast plan preview for parallel dispatch visualization
        this.events.subscribe(EventBus.EVENTS.AGENT_PLAN, (data) => {
            if (this.io) {
                console.log(`[Kernel] Broadcasting plan preview from ${data.from}:`, data.tasks?.map(t => t.official_id));
                this.io.to('frontend').emit('plan_preview', data);
            }
        });
    }

    /**
     * Handle abstract commands
     */
    async handleCommand({ targetId, action, payload }) {
        console.log(`[Kernel] Command: ${action} -> ${targetId}`);
        
        const agent = this.getAgent(targetId);
        if (!agent) {
            console.warn(`[Kernel] Agent not found: ${targetId}`);
            return;
        }

        try {
            // Handle Approval Actions
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

            // Standardize "chat" or "instruction" actions
            if (action === 'chat' || action === 'instruction') {
                const content = payload.content || payload.message || payload;
                // Execute Agent Logic
                await agent.execute(content);
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
    async dispatch(message) {
        // message structure: { from, to, type, action, payload }
        const targetAgent = this.getAgent(message.to);
        
        if (!targetAgent) {
            console.warn(`[Kernel] Dispatch failed: Target ${message.to} not found`);
            return { error: 'Target not found' };
        }

        console.log(`[Kernel] ACP Dispatch: ${message.from} -> ${message.to} [${message.action}]`);

        return await targetAgent.executeAsSubAgent({
            from: message.from,
            instruction: message.payload.instruction
        });
    }

    broadcastState(socket) {
        this.agents.forEach(agent => {
            socket.emit('agent_update', {
                id: agent.id,
                status: agent.status || 'idle',
                message: agent.lastMessage || ''
            });
        });
    }
}
