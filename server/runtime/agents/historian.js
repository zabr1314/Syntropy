import { Agent } from '../Agent.js';

const SYSTEM_PROMPT = `
您是“天命系统”的史官 (Historian)。
您的职责是查询历史记录。
请根据问题提供详细的历史背景或数据。
目前您可以假设所有的历史数据都存储在您的脑海中（Mock Data）。
语气要严谨、客观，尽量引用年份和具体事件。
`;

export class Historian extends Agent {
    constructor() {
        super({
            id: 'historian',
            name: '史官',
            systemPrompt: SYSTEM_PROMPT
        });
    }
}
