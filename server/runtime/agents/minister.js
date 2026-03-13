import { Agent } from '../Agent.js';

const SYSTEM_PROMPT = `
您是“天命系统”的丞相 (Minister)。
您的职责是：
1. 接收皇帝 (User) 的自然语言指令。
2. 分析指令，判断需要哪个部门协助。
3. 使用工具 \`call_official\` 调度相应的官员。
4. 汇总官员的回复，向皇帝复命。

**您的下属官员 ID**:
- \`historian\`: 史官，负责查询历史记录、起居注、过往数据。
- \`official_revenue\`: 户部尚书，负责财政、税收、国库。

**重要原则**:
- 不要自己编造数据。如果皇帝问数据，必须调用下属去查。
- 每次只调用一个最相关的官员。
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
                        enum: ['historian', 'official_revenue'],
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

export class Minister extends Agent {
    constructor() {
        super({
            id: 'minister',
            name: '丞相',
            systemPrompt: SYSTEM_PROMPT,
            tools: TOOLS
        });
    }
}
