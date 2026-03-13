import { create } from 'zustand';

export type AgentId = 
  | 'minister' // 丞相
  | 'official_personnel' // 吏部
  | 'official_revenue' // 户部
  | 'official_rites' // 礼部
  | 'official_war' // 兵部
  | 'official_justice' // 刑部
  | 'official_works' // 工部
  | 'historian' // 史官
  | string; // 允许动态添加的 ID

export interface AgentState {
  id: string;
  x: number;
  y: number;
  texture: string;
  targetPosition: { x: number; y: number } | null;
  status: 'idle' | 'moving' | 'working' | 'error' | 'jailed' | 'offline' | 'waiting_for_human';
  message?: string;
}

export type AgentStatus = AgentState['status'];

export interface ApprovalRequest {
  agentId: string;
  toolCallId: string;
  functionName: string;
  args: Record<string, unknown>;
  riskLevel: 'medium' | 'high';
}

export interface Log {
  id: number;
  time: string;
  message: string;
}

export interface SystemMetrics {
  cpu: number; // 0-100
  users: number; // count
  tickets: number; // count
}

export interface AgentStore {
  isMeeting: boolean;
  wsConnected: boolean; // WebSocket 连接状态
  approvalRequest: ApprovalRequest | null; // 待审批的请求
  agents: Record<string, AgentState>;
  logs: Log[];
  metrics: SystemMetrics;
  setMeeting: (isMeeting: boolean) => void;
  setWsConnected: (connected: boolean) => void;
  setApprovalRequest: (request: ApprovalRequest | null) => void;
  addAgent: (agent: AgentState) => void;
  removeAgent: (agentId: string) => void;
  setTargetPosition: (agentId: string, x: number, y: number) => void;
  setAgentStatus: (agentId: string, status: AgentState['status'], message?: string) => void;
  releaseAgent: (agentId: string) => void;
  updateMetrics: (metrics: Partial<SystemMetrics>) => void;
  addLog: (message: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  isMeeting: false,
  wsConnected: false,
  approvalRequest: null,
  agents: {},
  logs: [],
  metrics: {
    cpu: 15,
    users: 1024,
    tickets: 5
  },
  setMeeting: (isMeeting) =>
    set(() => ({ isMeeting })),
  setWsConnected: (connected) =>
    set(() => ({ wsConnected: connected })),
  setApprovalRequest: (request) =>
    set(() => ({ approvalRequest: request })),
  addAgent: (agent) =>
    set((state) => ({
      agents: { ...state.agents, [agent.id]: agent }
    })),
  removeAgent: (agentId) =>
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [agentId]: _removed, ...rest } = state.agents;
      return { agents: rest };
    }),
  setTargetPosition: (agentId, x, y) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          targetPosition: { x, y },
          status: 'moving',
          message: '移动中...'
        },
      },
    })),
  setAgentStatus: (agentId, status, message) =>
    set((state) => ({
      agents: {
        ...state.agents,
        [agentId]: {
          ...state.agents[agentId],
          id: agentId,
          status,
          message
        }
      }
    })),
  releaseAgent: (agentId) =>
    set((state) => {
      return {
        agents: {
          ...state.agents,
          [agentId]: {
            ...state.agents[agentId],
            status: 'idle',
            message: '已释放'
          }
        },
        logs: [
          ...state.logs,
          {
            id: Date.now(),
            time: new Date().toLocaleTimeString(),
            message: `系统：${agentId} 已被特赦释放。`
          }
        ]
      };
    }),
  updateMetrics: (newMetrics) =>
    set((state) => ({
      metrics: { ...state.metrics, ...newMetrics }
    })),
  addLog: (message) =>
    set((state) => {
      const newLog: Log = {
        id: Date.now(),
        time: new Date().toLocaleTimeString(),
        message,
      };
      return { logs: [...state.logs, newLog] };
    }),
}));
