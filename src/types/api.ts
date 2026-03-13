export interface AgentStatus {
  instance_id: string;
  alias_name: string;
  status: 'idle' | 'working' | 'moving' | 'error' | 'offline';
  current_task: string;
  last_updated: number;
  health: 'online' | 'offline';
}

export interface AgentStatusResponse {
  timestamp: number;
  total_online: number;
  agents: AgentStatus[];
}

export interface Official {
  id: string;
  name: string;
  description?: string;
  status: string;
  lastMessage?: string;
  role_class?: string;
}
