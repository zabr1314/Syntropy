import { LOCATIONS } from './court';
import { useConfigStore } from '../store/useConfigStore';

export interface AgentConfig {
    id: string;
    name: string;
    texture: string;
    scale: number;
    bubbleOffsetY: number;
    nameTagOffsetY: number;
    initialPos: { x: number, y: number };
}

// 默认配置 (用于 Guest 或未知角色)
export const DEFAULT_AGENT_CONFIG: Omit<AgentConfig, 'id' | 'name' | 'initialPos'> = {
    texture: 'generic_official',
    scale: 2.8,
    bubbleOffsetY: 80,
    nameTagOffsetY: 10,
};

// 角色配置表
export const AGENT_CONFIGS: Record<string, AgentConfig> = {
    'emperor': {
        id: 'emperor',
        name: '皇帝',
        texture: 'emperor',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: { x: 400, y: 100 } // MainScene width/2, y=100
    },
    'minister': {
        id: 'minister',
        name: '丞相',
        texture: 'minister_char',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: { x: 320, y: 180 } // width/2 - 80
    },
    'historian': {
        id: 'historian',
        name: '史官',
        texture: 'historian_char',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: LOCATIONS.ARCHIVES
    },
    // 六部尚书
    'official_personnel': { // 吏部
        id: 'official_personnel',
        name: '吏部尚书',
        texture: 'revenue_char',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: LOCATIONS.PERSONNEL
    },
    'official_revenue': { // 户部
        id: 'official_revenue',
        name: '户部尚书',
        texture: 'revenue_char',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: LOCATIONS.REVENUE
    },
    'official_rites': { // 礼部
        id: 'official_rites',
        name: '礼部尚书',
        texture: 'revenue_char',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: LOCATIONS.RITES
    },
    'official_war': { // 兵部
        id: 'official_war',
        name: '兵部尚书',
        texture: 'revenue_char',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: LOCATIONS.WAR
    },
    'official_justice': { // 刑部
        id: 'official_justice',
        name: '刑部尚书',
        texture: 'revenue_char',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: LOCATIONS.JUSTICE
    },
    'official_works': { // 工部
        id: 'official_works',
        name: '工部尚书',
        texture: 'revenue_char',
        scale: 0.35,
        bubbleOffsetY: 90,
        nameTagOffsetY: 5,
        initialPos: LOCATIONS.WORKS
    }
};

// 后端 ID 映射 (OpenClaw Role -> Frontend ID)
export const BACKEND_ID_MAPPING: Record<string, string> = {
    'minister': 'minister',
    'main': 'minister', 
    'historian': 'historian', // Explicitly map historian
    'engineer': 'official_works',
    'product_manager': 'official_rites',
    'designer': 'official_revenue',
    'qa': 'official_justice',
    'hr': 'official_personnel',
    'ops': 'official_war',
};

// 获取配置辅助函数
export function getAgentConfig(id: string): AgentConfig {
    // 1. Try static config
    if (AGENT_CONFIGS[id]) {
        return AGENT_CONFIGS[id];
    }

    // 2. Try dynamic config from store
    const store = useConfigStore.getState();
    const dynamicConfig = store.agents.find(a => a.role === id);
    
    if (dynamicConfig) {
        return {
            id,
            name: dynamicConfig.name,
            texture: dynamicConfig.texture || 'generic_official', // Fallback to generic
            scale: dynamicConfig.texture === 'generic_official' ? 2.8 : 0.35, // Adjust scale based on texture
            bubbleOffsetY: 80,
            nameTagOffsetY: 10,
            initialPos: LOCATIONS.GUEST_START
        };
    }

    // 3. Guest / Unknown Fallback
    return {
        id,
        name: id,
        texture: 'guest', // 特殊处理 guest texture
        scale: 3.0, // guest base scale * 1.5 = 2.0 * 1.5 = 3.0
        bubbleOffsetY: 80,
        nameTagOffsetY: 10,
        initialPos: LOCATIONS.GUEST_START // 默认起点，实际由 AgentController 计算
    };
}