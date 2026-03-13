/**
 * Spawn Agent Skill
 * Allows an agent (like the Minister) to dynamically create a sub-agent to handle a specific task.
 * Inspired by OpenClaw's `sessions_spawn` mechanism.
 */
export default {
    name: 'spawn_agent',
    description: 'Create a new sub-agent (temporary or permanent) to handle a specific task or role.',
    parameters: {
        type: 'object',
        properties: {
            id: { type: 'string', description: 'Unique ID for the new agent (e.g., "messenger_01")' },
            name: { type: 'string', description: 'Display name for the agent (e.g., "Urgent Messenger")' },
            description: { type: 'string', description: 'Role description and instructions' },
            systemPrompt: { type: 'string', description: 'The system prompt defining the agent behavior' }
        },
        required: ['id', 'name', 'description']
    },
    handler: async ({ id, name, description, systemPrompt }, { kernel }) => {
        console.log(`[Skill:Spawn] Creating agent: ${id} (${name})`);
        
        try {
            // Check if agent exists
            if (kernel.getAgent(id)) {
                return `Agent with ID ${id} already exists.`;
            }

            // We need to dynamically import Agent here
            const { Agent } = await import('../server/core/Agent.js');
            
            const newAgent = new Agent({
                id,
                name,
                description,
                system_prompt: systemPrompt || `You are ${name}. ${description}`,
                model: { primary: 'deepseek-chat' },
                workspace: `./data/workspaces/${id}`,
                identity: { emoji: '🐣' }
            });

            kernel.registerAgent(newAgent);
            
            // Notify frontend
            kernel.events.publish('agent:status', {
                id,
                status: 'idle',
                message: 'Reporting for duty via Spawn Protocol.'
            });

            return `Agent ${name} (${id}) has been successfully spawned and is ready for orders.`;
        } catch (err) {
            return `Failed to spawn agent: ${err.message}`;
        }
    }
};
