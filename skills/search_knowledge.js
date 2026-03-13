/**
 * Search Knowledge Skill
 * Allows agents to search the historical or system database.
 */
export default {
    name: 'search_knowledge',
    description: 'Search for historical or legal knowledge in the database.',
    parameters: {
        type: 'object',
        properties: {
            query: { type: 'string', description: 'The search query' }
        },
        required: ['query']
    },
    handler: async ({ query }, { agent }) => {
        // Mock implementation for now
        // In Phase 3, this will connect to Vector Store
        console.log(`[Skill:Search] Agent ${agent.id} searching for: ${query}`);
        
        if (query.includes('税收') || query.includes('revenue')) {
            return "明朝万历年间，岁入约200万两白银。";
        }
        if (query.includes('兵') || query.includes('army')) {
            return "京营兵力约15万，边军约30万。";
        }
        
        return "未找到相关记录 (Mock Database)";
    }
};
