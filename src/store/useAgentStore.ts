import { create } from 'zustand';

export interface AgentState {
  id: string;
  x: number;
  y: number;
  texture: string;
  targetPosition: { x: number; y: number } | null;
  status: 'idle' | 'moving' | 'working' | 'error';
  message?: string;
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
  agents: Record<string, AgentState>;
  logs: Log[];
  metrics: SystemMetrics;
  addAgent: (agent: AgentState) => void;
  removeAgent: (agentId: string) => void;
  setTargetPosition: (agentId: string, x: number, y: number) => void;
  setAgentStatus: (agentId: string, status: AgentState['status'], message?: string) => void;
  updateMetrics: (metrics: Partial<SystemMetrics>) => void;
  addLog: (message: string) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agents: {},
  logs: [],
  metrics: {
    cpu: 15,
    users: 1024,
    tickets: 5
  },
  addAgent: (agent) =>
    set((state) => ({
      agents: { ...state.agents, [agent.id]: agent }
    })),
  removeAgent: (agentId) =>
    set((state) => {
      const { [agentId]: _, ...rest } = state.agents;
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
