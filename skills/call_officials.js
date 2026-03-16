/**
 * Call Officials Skill (Parallel Batch Dispatch)
 * Allows the Minister to delegate multiple independent tasks to different officials simultaneously.
 * Uses Promise.all for true parallel execution, improving throughput vs. serial call_official.
 */
export default {
    name: 'call_officials',
    description: 'Call multiple subordinate officials in parallel to execute independent tasks simultaneously. Use this when you have multiple independent tasks that do not depend on each other.',
    parameters: {
        type: 'object',
        properties: {
            tasks: {
                type: 'array',
                description: 'List of tasks to dispatch to officials in parallel. Each task goes to a different official.',
                items: {
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
                }
            }
        },
        required: ['tasks']
    },
    handler: async ({ tasks }, { agent, kernel, depth = 0 }) => {
        console.log(`[Skill:CallOfficials] ${agent.id} dispatching ${tasks.length} tasks in parallel:`, tasks.map(t => t.official_id));

        // 1. Emit plan preview event for frontend visualization
        kernel.events.publish('plan:preview', {
            from: agent.id,
            tasks: tasks.map(t => ({ official_id: t.official_id, instruction: t.instruction }))
        });

        // 2. Emit SUMMON events for each official (UI animation)
        for (const task of tasks) {
            kernel.events.publish('agent:status', {
                id: agent.id,
                status: 'working',
                message: `并行传唤: ${task.official_id}`,
                meta: { type: 'SUMMON', target: task.official_id }
            });
        }

        // 3. Parallel dispatch via Promise.allSettled (single failure won't block others)
        const settled = await Promise.allSettled(
            tasks.map(async (task) => {
                const message = {
                    from: agent.id,
                    to: task.official_id,
                    type: 'REQUEST',
                    action: 'execute_task',
                    payload: { instruction: task.instruction }
                };
                const response = await kernel.dispatch(message, depth);
                if (response && response.error) {
                    throw new Error(response.error);
                }
                return `[来自 ${task.official_id} 的回报]:\n${response}`;
            })
        );

        // 4. Aggregate all results
        return settled.map((r, i) =>
            r.status === 'fulfilled'
                ? r.value
                : `[${tasks[i].official_id}] 未能回报: ${r.reason?.message}`
        ).join('\n\n---\n\n');
    }
};
