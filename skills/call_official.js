/**
 * Call Official Skill
 * Allows the Minister (or any authorized agent) to delegate tasks to other officials.
 * Replaces the hardcoded logic in Minister.js.
 */
export default {
    name: 'call_official',
    description: 'Call a subordinate official to execute a task. You MUST provide reasoning for your decision.',
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
            },
            reasoning: {
                type: 'string',
                description: 'Why you chose this official (e.g., "Revenue handles financial analysis")'
            },
            alternatives_considered: {
                type: 'array',
                items: { type: 'string' },
                description: 'Other officials you considered but did not choose'
            },
            why_not_alternatives: {
                type: 'string',
                description: 'Why you did not choose the alternatives'
            },
            confidence: {
                type: 'number',
                minimum: 0,
                maximum: 100,
                description: 'Your confidence in this decision (0-100)'
            }
        },
        required: ['official_id', 'instruction', 'reasoning']
    },
    handler: async ({ official_id, instruction, reasoning, alternatives_considered, why_not_alternatives, confidence }, { agent, kernel, depth = 0, traceId }) => {
        console.log(`[Skill:CallOfficial] ${agent.id} calls ${official_id}: ${instruction}`);

        // 1. Emit decision event for Decision Trace
        const decisionId = `${traceId}-${Date.now()}`;
        kernel.events.publish('decision:made', {
            traceId,
            decisionId,
            agentId: agent.id,
            timestamp: Date.now(),
            chosen: official_id,
            instruction,
            reasoning: reasoning || 'No reasoning provided',
            alternatives: alternatives_considered || [],
            whyNot: why_not_alternatives || '',
            confidence: confidence || 50
        });

        // 2. Emit SUMMON event for animation/UI
        kernel.events.publish('agent:status', {
            id: agent.id,
            status: 'working',
            message: `Summoning ${official_id}...`,
            meta: {
                type: 'SUMMON',
                target: official_id
            }
        });

        // 3. Use ACP Dispatch
        const message = {
            from: agent.id,
            to: official_id,
            type: 'REQUEST',
            action: 'execute_task',
            payload: { instruction }
        };

        try {
            const startTime = Date.now();
            const response = await kernel.dispatch(message, depth, traceId);
            const durationMs = Date.now() - startTime;

            // 4. Emit output event for Decision Trace
            kernel.events.publish('decision:output', {
                traceId,
                decisionId,
                agentId: official_id,
                timestamp: Date.now(),
                output: response,
                outputSummary: typeof response === 'string' ? response.substring(0, 200) : JSON.stringify(response).substring(0, 200),
                durationMs
            });

            if (response && response.error) {
                return `Error: ${response.error}`;
            }
            return `[Report from ${official_id}]: ${response}`;
        } catch (error) {
            return `Error communicating with ${official_id}: ${error.message}`;
        }
    }
};
