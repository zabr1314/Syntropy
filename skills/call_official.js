/**
 * Call Official Skill
 * Allows the Minister (or any authorized agent) to delegate tasks to other officials.
 * Replaces the hardcoded logic in Minister.js.
 */
export default {
    name: 'call_official',
    description: 'Call a subordinate official to execute a task.',
    parameters: {
        type: 'object',
        properties: {
            official_id: {
                type: 'string',
                enum: [
                    'historian', 
                    'official_revenue',
                    'official_war',
                    'official_works',
                    'official_rites',
                    'official_personnel',
                    'official_justice'
                ],
                description: 'The ID of the target official'
            },
            instruction: {
                type: 'string',
                description: 'Specific instruction for the official'
            }
        },
        required: ['official_id', 'instruction']
    },
    handler: async ({ official_id, instruction }, { agent, kernel, depth = 0 }) => {
        console.log(`[Skill:CallOfficial] ${agent.id} calls ${official_id}: ${instruction}`);

        // 1. Emit SUMMON event for animation/UI
        kernel.events.publish('agent:status', {
            id: agent.id,
            status: 'working',
            message: `Summoning ${official_id}...`,
            meta: {
                type: 'SUMMON',
                target: official_id
            }
        });

        // 2. Use ACP Dispatch
        const message = {
            from: agent.id,
            to: official_id,
            type: 'REQUEST',
            action: 'execute_task',
            payload: { instruction }
        };

        try {
            const response = await kernel.dispatch(message, depth);
            if (response && response.error) {
                return `Error: ${response.error}`;
            }
            return `[Report from ${official_id}]: ${response}`;
        } catch (error) {
            return `Error communicating with ${official_id}: ${error.message}`;
        }
    }
};
