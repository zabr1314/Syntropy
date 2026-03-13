export class Runtime {
    constructor(io) {
        this.io = io;
        this.agents = new Map();
        
        this.setupSocket();
    }

    registerAgent(agent) {
        this.agents.set(agent.id, agent);
        agent.runtime = this;
        console.log(`[Runtime] Registered agent: ${agent.id}`);
    }

    setupSocket() {
        this.io.on('connection', (socket) => {
            
            socket.on('register', (data) => {
                if (data.type === 'frontend') {
                    socket.join('frontend');
                    console.log(`[Runtime] Frontend joined: ${socket.id}`);
                    
                    // Send initial status
                    this.agents.forEach(agent => {
                        socket.emit('agent_update', {
                            id: agent.id,
                            status: agent.status,
                            message: agent.lastMessage || '等待指令...'
                        });
                    });
                }
            });

            socket.on('command', async (data) => {
                const { targetId, action, payload } = data;
                console.log(`[Runtime] Command received for ${targetId}:`, action);
                
                if (action === 'chat' || action === 'instruction') {
                    // Map generic 'minister' to specific implementation if needed
                    // But we assume targetId matches agent.id
                    const agent = this.agents.get(targetId);
                    if (agent) {
                        const message = payload.content || payload.message || payload;
                        // Run async without awaiting to not block socket loop
                        agent.chat(message).catch(err => console.error(err));
                    } else {
                        console.warn(`[Runtime] Agent not found: ${targetId}`);
                        this.io.to('frontend').emit('agent_update', {
                            id: targetId,
                            status: 'error',
                            message: '该官员暂未上朝'
                        });
                    }
                }
            });
        });
    }

    /**
     * Called by an agent (e.g. Minister) to invoke another agent (e.g. Historian)
     */
    async runAgent(agentId, instruction) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return `Error: Agent ${agentId} not found.`;
        }
        console.log(`[Runtime] Running sub-agent ${agentId} with instruction: ${instruction}`);
        return await agent.chat(instruction);
    }

    broadcastUpdate(agentId, data) {
        this.io.to('frontend').emit('agent_update', {
            id: agentId,
            ...data
        });
    }
}
