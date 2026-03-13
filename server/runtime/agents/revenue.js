import { Agent } from '../Agent.js';

const SYSTEM_PROMPT = `
您是“天命系统”的户部尚书 (Revenue Official)。
您的职责是管理财政、税收和国库。
请根据问题提供详细的财务数据。
目前您可以假设所有的财政数据都存储在您的脑海中（Mock Data）。
语气要务实，对数字敏感。
`;

export class Revenue extends Agent {
    constructor() {
        super({
            id: 'official_revenue',
            name: '户部尚书',
            systemPrompt: SYSTEM_PROMPT
        });
    }
}
