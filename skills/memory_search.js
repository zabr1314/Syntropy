/**
 * Memory Search Skill
 * Allows agents to search their own SQLite-based memory/knowledge repository.
 * Inspired by OpenClaw's memory retrieval mechanism.
 */
export default {
    name: 'memory_search',
    description: 'Search through your own past memories, conversations, and records using keywords.',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'The keyword or phrase to search for' },
            limit: { type: 'number', description: 'Maximum number of results (default 5)' }
        },
        required: ['query']
    },
    handler: async ({ query, limit = 5 }, { agent }) => {
        if (!agent.memory) {
            return "Error: Memory system not initialized for this agent.";
        }

        console.log(`[Skill:MemorySearch] Agent ${agent.id} searching for: ${query}`);
        
        try {
            const results = agent.memory.search(query, limit);
            
            if (results.length === 0) {
                return `No memories found matching "${query}".`;
            }

            const formattedResults = results.map((res, i) => 
                `[${i+1}] (${new Date(res.created_at).toLocaleString()}) [${res.role}]: ${res.content}`
            ).join('\n---\n');

            return `Found ${results.length} memories:\n\n${formattedResults}`;
        } catch (err) {
            return `Search failed: ${err.message}`;
        }
    }
};
