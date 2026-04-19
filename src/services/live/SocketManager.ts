import { io, Socket } from 'socket.io-client';
import { useAgentStore, type ApprovalRequest } from '../../store/useAgentStore';
import { useCourtStore, type DecisionNode } from '../../store/useCourtStore';
import { BACKEND_ID_MAPPING } from '../../constants/agentConfig';

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

        this.socket = io(this.relayUrl, {
            transports: ['websocket', 'polling'],
            reconnectionAttempts: 10,
            reconnectionDelay: 1000
        });

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

        // 监听决策树事件
        this.socket.on('decision_made', (data: {
            traceId: string, decisionId: string, agentId: string, timestamp: number,
            chosen: string, instruction: string, reasoning: string,
            alternatives: string[], whyNot: string, confidence: number
        }) => {
            const { addDecisionNode, activeDecreeId, decrees } = useCourtStore.getState();
            const targetDecreeId = activeDecreeId || decrees.find(d =>
                d.status === 'executing' || d.status === 'drafting' || d.status === 'planning'
            )?.id;
            console.log('[SocketManager] decision_made received, targetDecreeId:', targetDecreeId, 'activeDecreeId:', activeDecreeId, 'decrees statuses:', decrees.map(d => d.status));
            if (!targetDecreeId) return;

            const frontendAgentId = BACKEND_ID_MAPPING[data.agentId] || data.agentId;
            const chosenFrontendId = BACKEND_ID_MAPPING[data.chosen] || data.chosen;

            // minister 是 root，chosen official 是 child
            // child 节点用 decisionId 作为 id，agentId 是 chosen official
            const childNode: DecisionNode = {
                id: data.decisionId,
                agentId: chosenFrontendId,
                action: `执行任务`,
                reasoning: data.reasoning,
                timestamp: data.timestamp,
                alternatives: data.alternatives.map((a: string) => BACKEND_ID_MAPPING[a] || a),
                whyNot: data.whyNot,
                confidence: data.confidence,
                parentId: frontendAgentId,
                children: []
            };

            const decree = decrees.find(d => d.id === targetDecreeId);
            if (!decree?.decisionTree) {
                // 还没有 root，先创建 minister root 节点，再把 child 挂上去
                const rootNode: DecisionNode = {
                    id: `root-${data.traceId}`,
                    agentId: frontendAgentId,
                    action: '拆解任务并调度',
                    reasoning: '统筹全局，分配各部',
                    timestamp: data.timestamp,
                    children: [childNode]
                };
                addDecisionNode(targetDecreeId, rootNode);
            } else {
                // root 已存在，直接追加 child
                addDecisionNode(targetDecreeId, childNode);
            }
        });

        this.socket.on('decision_output', (data: {
            traceId: string, decisionId: string, agentId: string, timestamp: number,
            output: string, outputSummary: string, durationMs: number
        }) => {
            const { updateDecisionOutput, activeDecreeId, decrees } = useCourtStore.getState();
            const targetDecreeId = activeDecreeId || decrees.find(d =>
                d.status === 'executing' || d.status === 'drafting' || d.status === 'planning'
            )?.id;
            if (!targetDecreeId) return;

            updateDecisionOutput(targetDecreeId, data.decisionId, data.output, data.outputSummary, data.durationMs);
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