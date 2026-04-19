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
                        },
                        reasoning: {
                            type: 'string',
                            description: 'Why you chose this official for this task'
                        },
                        confidence: {
                            type: 'number',
                            minimum: 0,
                            maximum: 100,
                            description: 'Your confidence in this decision (0-100)'
                        }
                    },
                    required: ['official_id', 'instruction', 'reasoning']
                }
            }
        },
        required: ['tasks']
    },
    handler: async ({ tasks }, { agent, kernel, depth = 0, traceId }) => {
        console.log(`[Skill:CallOfficials] ${agent.id} dispatching ${tasks.length} tasks in parallel:`, tasks.map(t => t.official_id));

        // 1. Emit plan preview event for frontend visualization
        kernel.events.publish('plan:preview', {
            from: agent.id,
            tasks: tasks.map(t => ({ official_id: t.official_id, instruction: t.instruction }))
        });

        // 2. Emit decision:made for each task (Decision Trace)
        const decisionIds = tasks.map(task => {
            const decisionId = `${traceId}-${task.official_id}-${Date.now()}`;
            kernel.events.publish('decision:made', {
                traceId,
                decisionId,
                agentId: agent.id,
                timestamp: Date.now(),
                chosen: task.official_id,
                instruction: task.instruction,
                reasoning: task.reasoning || 'No reasoning provided',
                alternatives: [],
                whyNot: '',
                confidence: task.confidence || 50
            });
            return decisionId;
        });

        // 3. Emit SUMMON events for each official (UI animation)
        for (const task of tasks) {
            kernel.events.publish('agent:status', {
                id: agent.id,
                status: 'working',
                message: `并行传唤: ${task.official_id}`,
                meta: { type: 'SUMMON', target: task.official_id }
            });
        }

        // 4. Parallel dispatch via Promise.allSettled
        const settled = await Promise.allSettled(
            tasks.map(async (task, i) => {
                const decisionId = decisionIds[i];
                const message = {
                    from: agent.id,
                    to: task.official_id,
                    type: 'REQUEST',
                    action: 'execute_task',
                    payload: { instruction: task.instruction }
                };
                const startTime = Date.now();
                const response = await kernel.dispatch(message, depth, traceId);
                const durationMs = Date.now() - startTime;

                // Emit output event with same decisionId
                kernel.events.publish('decision:output', {
                    traceId,
                    decisionId,
                    agentId: task.official_id,
                    timestamp: Date.now(),
                    output: response,
                    outputSummary: typeof response === 'string' ? response.substring(0, 200) : JSON.stringify(response).substring(0, 200),
                    durationMs
                });

                if (response && response.error) throw new Error(response.error);
                return `[来自 ${task.official_id} 的回报]:\n${response}`;
            })
        );

        // 5. Aggregate all results
        return settled.map((r, i) =>
            r.status === 'fulfilled'
                ? r.value
                : `[${tasks[i].official_id}] 未能回报: ${r.reason?.message}`
        ).join('\n\n---\n\n');
    }
};
