import { io, Socket } from 'socket.io-client';
import { useAgentStore, type ApprovalRequest } from '../../store/useAgentStore';

type AgentUpdateCallback = (data: { id: string, status: string, message: string }) => void;
type AgentOfflineCallback = (data: { id: string }) => void;

export class SocketManager {
    private socket: Socket | null = null;
    private onAgentUpdate?: AgentUpdateCallback;
    private onAgentOffline?: AgentOfflineCallback;

    constructor(private relayUrl: string = 'http://localhost:3001') {}

    public connect(onUpdate: AgentUpdateCallback, onOffline: AgentOfflineCallback) {
        this.onAgentUpdate = onUpdate;
        this.onAgentOffline = onOffline;

        this.socket = io(this.relayUrl);

        this.socket.on('connect', () => {
            console.log('[SocketManager] Connected to Relay Server');
            useAgentStore.getState().setWsConnected(true);
            this.socket?.emit('register', { type: 'frontend' });
        });

        this.socket.on('connect_error', (err) => {
            console.error('[SocketManager] Connection Error:', err);
            useAgentStore.getState().setWsConnected(false);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('[SocketManager] Disconnected:', reason);
            useAgentStore.getState().setWsConnected(false);
        });

        // 监听 Agent 状态更新
        this.socket.on('agent_update', (data) => {
            if (this.onAgentUpdate) this.onAgentUpdate(data);
        });

        this.socket.on('agent_offline', (data) => {
            if (this.onAgentOffline) this.onAgentOffline(data);
        });

        // 监听审批请求
        this.socket.on('approval_request', (data: ApprovalRequest) => {
            console.log('[SocketManager] Approval Request:', data);
            const store = useAgentStore.getState();
            store.setApprovalRequest(data);
            // 同时更新 Agent 状态
            store.setAgentStatus(data.agentId, 'waiting_for_human', `等待审批: ${data.functionName}`);
        });
    }

    public disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    public sendCommand(targetId: string, action: string, payload: unknown): boolean {
        if (!this.socket || !this.socket.connected) {
            console.warn('[SocketManager] Cannot send command: Socket not connected');
            return false;
        }

        console.log(`[SocketManager] Sending command to ${targetId}: ${action}`, payload);
        this.socket.emit('command', {
            targetId,
            action,
            payload
        });
        return true;
    }
}