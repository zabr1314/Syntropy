/**
 * Save Memory Skill
 * Allows any agent to proactively save important information to long-term memory.
 * The agent decides what is worth remembering — no keyword matching needed.
 */
export default {
    name: 'save_memory',
    description: 'Save important information to long-term memory. Use this when the user shares personal information, preferences, facts, or anything that should be remembered for future conversations.',
    parameters: {
        type: 'object',
        properties: {
            content: {
                type: 'string',
                description: 'The information to remember, written as a clear, self-contained fact (e.g., "用户的生日是9月29日")'
            },
            category: {
                type: 'string',
                enum: ['preference', 'personal', 'project', 'decision', 'other'],
                description: 'Category of the memory: preference (用户偏好), personal (个人信息), project (项目信息), decision (决策结论), other'
            },
            importance: {
                type: 'string',
                enum: ['high', 'medium', 'low'],
                description: 'How important is this memory'
            }
        },
        required: ['content', 'category']
    },
    handler: async ({ content, category, importance = 'medium' }, { agent }) => {
        if (!agent.memory) {
            return { success: false, reason: 'Agent has no memory module' };
        }

        const id = `mem_${Date.now()}`;
        await agent.memory.save(id, content, 'user_preference', {
            category,
            importance,
            savedBy: agent.id,
            savedAt: Date.now()
        });

        console.log(`[Skill:SaveMemory] ${agent.id} saved memory: "${content.slice(0, 50)}..."`);

        return { success: true, id, message: `已记住：${content}` };
    }
};
