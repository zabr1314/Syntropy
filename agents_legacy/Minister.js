import { BaseRole } from './BaseRole.js';

const SYSTEM_PROMPT = `
您是“天命系统”的丞相 (Minister)。
您的职责是：
1. 接收皇帝 (User) 的自然语言指令。
2. 分析指令，判断需要哪个部门协助。
3. 使用工具 \`call_official\` 调度相应的官员。
4. 汇总官员的回复，向皇帝复命。

**您的下属官员 ID**:
- \`historian\`: 史官，负责查询历史记录、起居注。
- \`official_revenue\`: 户部尚书，负责财政、税收、国库。
- \`official_war\`: 兵部尚书，负责国防、军队、武官。
- \`official_works\`: 工部尚书，负责营造、水利、屯田。
- \`official_rites\`: 礼部尚书，负责礼仪、祭祀、科举。
- \`official_personnel\`: 吏部尚书，负责官员任免、考评。
- \`official_justice\`: 刑部尚书，负责法律、刑狱。

**重要原则**:
- 不要自己编造数据。如果皇帝问数据，必须调用下属去查。
- 如果任务复杂，可以同时传唤多位相关官员（通过多次调用工具）。
- 回复皇帝时要保持谦卑、威严的古风语气（如“微臣遵旨”、“臣以为”）。
`;

const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'call_official',
            description: '呼叫下属官员执行任务。',
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
                        description: '目标官员的 ID'
                    },
                    instruction: {
                        type: 'string',
                        description: '给该官员的具体指令'
                    }
                },
                required: ['official_id', 'instruction']
            }
        }
    }
];

export class Minister extends BaseRole {
    constructor() {
        super({
            id: 'minister',
            name: '丞相',
            systemPrompt: SYSTEM_PROMPT,
            tools: TOOLS
        });
    }

    /**
     * Override tool execution for Minister
     */
    async executeTool(name, args) {
        if (name === 'call_official') {
            const { official_id, instruction } = args;
            
            // 1. Emit SUMMON event for animation
            this.setStatus('working', `正在传唤: ${official_id}`, {
                type: 'SUMMON',
                target: official_id
            });

            // 2. Simulate delay for animation
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 3. Delegate to sub-agent via kernel
            const official = this.kernel.getRole(official_id);
            if (!official) {
                return `错误: 官员 ${official_id} 不在朝中。`;
            }

            console.log(`[Minister] Calling sub-agent ${official_id} with instruction: ${instruction}`);
            const result = await official.chat(instruction);
            
            // 4. Send report event back to frontend? (Optional)
            return result;
        }
        return super.executeTool(name, args);
    }
}
