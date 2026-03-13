export type AgentId = 'minister' | 'engineer' | 'staff_1' | 'staff_2' | 'staff_3';

export type AgentStatus = 'idle' | 'moving' | 'working' | 'error' | 'jailed';

export interface Position {
  x: number;
  y: number;
}

export interface AgentUpdate {
  agent_id: AgentId;
  agent_name?: string;
  status: AgentStatus;
  position?: Position;
  bubble_text?: string;
  log_message?: string;
  duration?: number; // 持续时间 (毫秒)，用于模拟工作时长或移动耗时
}

export interface ServerEvent {
  event_id: string;
  timestamp: number;
  type: 'AGENT_STATE_UPDATE' | 'CRITICAL_INTERCEPT' | 'SYSTEM_NOTIFICATION';
  data: AgentUpdate | { message: string; type: 'info' | 'warning' | 'error' };
}

// 预定义场景剧本类型
export interface ScenarioStep {
  delay: number; // 距离上一步的延迟
  updates: AgentUpdate[]; // 这一步可能涉及多个 Agent 的更新
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
}