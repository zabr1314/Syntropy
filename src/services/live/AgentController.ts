import { useAgentStore, type AgentStatus } from '../../store/useAgentStore';
import { LOCATIONS } from '../../constants/court';
import { getAgentConfig, DEFAULT_AGENT_CONFIG } from '../../constants/agentConfig';

export class AgentController {
    private guestAgentIds: string[] = [];
    private lastTalkingTime: number = 0;

    public updateAgent(frontendId: string, status: string, message?: string, isGuest: boolean = false) {
        const { setAgentStatus, addAgent, agents: currentAgents } = useAgentStore.getState();
        const currentAgent = currentAgents[frontendId];

        // Register guest
        if (isGuest && !this.guestAgentIds.includes(frontendId)) {
            this.guestAgentIds.push(frontendId);
        }

        // Init Agent if not exists
        if (!currentAgent) {
            this.initAgent(frontendId, status, message, isGuest);
            return;
        }

        // Update Status
        setAgentStatus(frontendId, status as AgentStatus, message);

        // Movement Logic
        this.handleMovement(frontendId, currentAgent, status, message, isGuest);
    }

    private initAgent(id: string, status: string, message?: string, isGuest: boolean = false) {
        const { addAgent } = useAgentStore.getState();
        const config = getAgentConfig(id);
        const initialPos = isGuest ? this.getWorkLocation(id, true) : config.initialPos;
        
        // 优先使用 config 中的 texture，如果没有则使用默认或根据逻辑推断
        const texture = config.texture || DEFAULT_AGENT_CONFIG.texture;

        addAgent({
            id,
            x: initialPos.x,
            y: initialPos.y,
            texture,
            targetPosition: null,
            status: status as AgentStatus,
            message
        });
    }

    // 增加交互状态
    private interactionTarget: Record<string, string> = {}; // agentId -> targetAgentId

    public setInteraction(initiatorId: string, targetId: string) {
        this.interactionTarget[initiatorId] = targetId;
        // 立即触发一次位置更新
        const { agents } = useAgentStore.getState();
        const agent = agents[initiatorId];
        if (agent) {
             this.handleMovement(initiatorId, agent, agent.status, agent.message, false);
        }
    }

    public clearInteraction(initiatorId: string) {
        delete this.interactionTarget[initiatorId];
    }

    private handleMovement(id: string, agent: any, status: string, message?: string, isGuest: boolean = false) {
        const { setTargetPosition } = useAgentStore.getState();

        // 1. 检查是否有交互目标 (丞相找人)
        const targetAgentId = this.interactionTarget[id];
        if (targetAgentId) {
            const targetPos = this.getWorkLocation(targetAgentId);
            // 走到目标面前 (稍微偏移一点，避免重叠)
            const approachPos = { x: targetPos.x - 50, y: targetPos.y };
            
            if (this.shouldMove(agent, approachPos)) {
                setTargetPosition(id, approachPos.x, approachPos.y);
            }
            return; // 交互状态下，忽略常规移动逻辑
        }

        const isTalking = status === 'working' && 
                          message && 
                          message !== '正在思考...' && 
                          message !== '执行中...' && 
                          message !== '使用工具...';

        const now = Date.now();
        if (isTalking) {
            this.lastTalkingTime = now;
        }

        const shouldWait = (now - (this.lastTalkingTime || 0)) < 2000;

        if (isTalking || shouldWait) {
            if (agent.targetPosition) {
                setTargetPosition(id, agent.x, agent.y);
            }
        } else {
            if (status === 'working' || status === 'thinking') {
                const targetPos = this.getWorkLocation(id, isGuest);
                if (this.shouldMove(agent, targetPos)) {
                    setTargetPosition(id, targetPos.x, targetPos.y);
                }
            } else if (status === 'idle' || status === 'offline') {
                const idlePos = isGuest ? this.getWorkLocation(id, isGuest) : LOCATIONS.REST_AREA;
                if (this.shouldMove(agent, idlePos)) {
                    setTargetPosition(id, idlePos.x, idlePos.y);
                }
            }
        }
    }

    private getWorkLocation(agentId: string, isGuest: boolean = false) {
        // 优先从配置表获取
        const config = getAgentConfig(agentId);
        if (!isGuest && config.initialPos) {
            return config.initialPos;
        }

        // Guest 处理
        const guestIndex = this.guestAgentIds.indexOf(agentId);
        if (isGuest || guestIndex !== -1) {
            const cols = 5;
            const col = guestIndex % cols;
            const row = Math.floor(guestIndex / cols);
            return {
                x: LOCATIONS.GUEST_START.x + col * LOCATIONS.GUEST_OFFSET.x,
                y: LOCATIONS.GUEST_START.y + row * LOCATIONS.GUEST_OFFSET.y
            };
        }

        return LOCATIONS.REST_AREA;
    }

    private shouldMove(agent: any, target: { x: number, y: number }) {
        if (!agent) return true;
        if (agent.targetPosition && Math.abs(agent.targetPosition.x - target.x) < 10 && Math.abs(agent.targetPosition.y - target.y) < 10) {
            return false;
        }
        if (Math.abs(agent.x - target.x) < 10 && Math.abs(agent.y - target.y) < 10) {
            return false;
        }
        return true;
    }
}