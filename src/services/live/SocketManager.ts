import { io, Socket } from 'socket.io-client';
import { useAgentStore, type ApprovalRequest } from '../../store/useAgentStore';

type AgentUpdateCallback = (data: { id: string, status: string, message: string }) => void;
type AgentOfflineCallback = (data: { id: string }) => void;
type StreamChunkCallback = (data: { id: string, chunk: string }) => void;
type PlanPreviewCallback = (data: { from: string, tasks: Array<{ official_id: string, instruction: string }> }) => void;

export class SocketManager {
    private socket: Socket | null = null;
    private onAgentUpdate?: AgentUpdateCallback;
    private onAgentOffline?: AgentOfflineCallback;
    private onStreamChunk?: StreamChunkCallback;
    private onPlanPreview?: PlanPreviewCallback;

    constructor(private relayUrl: string = 'http://localhost:3001') {}

    public connect(onUpdate: AgentUpdateCallback, onOffline: AgentOfflineCallback, onChunk?: StreamChunkCallback, onPlanPreview?: PlanPreviewCallback) {
        this.onAgentUpdate = onUpdate;
        this.onAgentOffline = onOffline;
        this.onStreamChunk = onChunk;
        this.onPlanPreview = onPlanPreview;

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

        // 监听流式输出 chunks
        this.socket.on('agent_stream', (data: { id: string, chunk: string }) => {
            if (this.onStreamChunk) this.onStreamChunk(data);
        });

        // 监听审批请求
        this.socket.on('approval_request', (data: ApprovalRequest) => {
            console.log('[SocketManager] Approval Request:', data);
            const store = useAgentStore.getState();
            store.setApprovalRequest(data);
            // 同时更新 Agent 状态
            store.setAgentStatus(data.agentId, 'waiting_for_human', `等待审批: ${data.functionName}`);
        });

        // 监听执行计划预览（并行调度）
        this.socket.on('plan_preview', (data: { from: string, tasks: Array<{ official_id: string, instruction: string }> }) => {
            console.log('[SocketManager] Plan Preview:', data);
            if (this.onPlanPreview) this.onPlanPreview(data);
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