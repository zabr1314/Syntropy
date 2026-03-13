import { useAgentStore, type AgentId } from '../store/useAgentStore';
import { useCourtStore } from '../store/useCourtStore';
import { useConfigStore } from '../store/useConfigStore';
import { SocketManager } from './live/SocketManager';
import { MessageProcessor } from './live/MessageProcessor';
import { AgentController } from './live/AgentController';
import { BACKEND_ID_MAPPING } from '../constants/agentConfig';

export class LiveAgentService {
  private static instance: LiveAgentService;
  private isRunning: boolean = false;
  
  private socketManager: SocketManager;
  private messageProcessor: MessageProcessor;
  private agentController: AgentController;

  // Decree Tracking
  private lastDecreeId: string | null = null;
  private lastMessageActor: string | null = null;
  private lastMessageTime: number = 0;
  private lastAgentStatus: Record<string, string> = {};

  private constructor() {
      this.socketManager = new SocketManager();
      this.messageProcessor = new MessageProcessor();
      this.agentController = new AgentController();
  }

  public static getInstance(): LiveAgentService {
    if (!LiveAgentService.instance) {
      LiveAgentService.instance = new LiveAgentService();
    }
    return LiveAgentService.instance;
  }

  public start() {
    if (this.isRunning) {
        console.log('[LiveAgent] Service already running');
        return;
    }
    this.isRunning = true;
    
    // 连接到 Relay Server (默认 3001)
    // 监听 Config 变化以支持动态切换 Relay URL
    const relayUrl = useConfigStore.getState().relayUrl || 'http://localhost:3001';
    console.log(`[LiveAgent] Connecting to Relay Server at ${relayUrl}`);
    
    this.connectRelay(relayUrl);

    // Subscribe to config changes
    useConfigStore.subscribe((state, prevState) => {
      if (this.isRunning && state.relayUrl !== prevState.relayUrl) {
        console.log(`[LiveAgent] Relay URL changed to ${state.relayUrl}`);
        this.socketManager.disconnect();
        this.connectRelay(state.relayUrl || 'http://localhost:3001');
      }
    });

    console.log('LiveAgentService (Single-Connection) started');
  }

  private connectRelay(url: string) {
      // Re-initialize SocketManager with new URL if needed
      // Since SocketManager takes URL in constructor, we might need to recreate it or add setUrl method
      // For now, let's just recreate it if we want to be safe, or assume SocketManager handles it.
      // But wait, SocketManager is created in constructor. 
      // Let's modify SocketManager to accept URL in connect, or create a new one.
      // Current SocketManager takes url in constructor.
      
      this.socketManager = new SocketManager(url);
      this.socketManager.connect(
          this.handleAgentUpdate.bind(this),
          this.handleAgentOffline.bind(this)
      );
  }

  public stop() {
    this.isRunning = false;
    this.socketManager.disconnect();
    console.log('LiveAgentService stopped');
  }

  public sendCommand(agentId: string, action: string, payload: unknown) {
    let targetBackendId = agentId;
    
    // Find backend ID from mapping (Frontend -> Backend)
    // BACKEND_ID_MAPPING is Backend -> Frontend. We need reverse lookup or direct lookup.
    // Actually, BACKEND_ID_MAPPING: 'minister' -> 'minister', 'main' -> 'minister'.
    // If agentId is 'minister', we want to send to 'minister' (or 'main' if that's what backend expects).
    // The server/index.js expects targetId. 
    // If we send 'minister', server maps it to 'main' for chat.send.
    // So sending frontend ID is usually fine if server handles it.
    
    // But let's try to be precise.
    // If agentId is 'official_works', we might want to send 'engineer' if that's the backend ID.
    const entry = Object.entries(BACKEND_ID_MAPPING).find(([, frontend]) => frontend === agentId);
    if (entry) {
        targetBackendId = entry[0];
    }

    return this.socketManager.sendCommand(targetBackendId, action, payload);
  }

  private handleAgentOffline(data: { id: string }) {
      const frontendId = BACKEND_ID_MAPPING[data.id] || data.id;
      useAgentStore.getState().setAgentStatus(frontendId as AgentId, 'offline', '已离线');
  }

  private handleAgentUpdate(remoteAgent: { id: string, status: string, message: string, action?: { type: string, target: string } }) {
    // 1. ID Mapping
    let frontendId = BACKEND_ID_MAPPING[remoteAgent.id];
    let isGuest = false;

    if (!frontendId) {
        frontendId = remoteAgent.id;
        isGuest = true;
    }

    const status = remoteAgent.status;
    const message = remoteAgent.message || undefined;
    const action = remoteAgent.action;

    console.log(`[LiveAgent] Update: ${remoteAgent.id} -> ${frontendId} (${status})`);

    // 2. Message Processing (Buffer & Stitching)
    const fullMessage = this.messageProcessor.processMessage(frontendId, status, message);

    // 2.5 Tool Call / Orchestration Detection
    // New Logic: Check for structured action
    if (action && action.type === 'SUMMON' && action.target) {
         this.handleOrchestration(frontendId, action.target);
    }
    // Fallback logic for legacy string parsing
    else if (status === 'working' && message) {
        let targetId: string | null = null;
        
        // Case 1: sessions_spawn (OpenClaw Native)
        // message format: "正在传唤: historian"
        if (message.startsWith('正在传唤:')) {
            const rawTarget = message.split(':')[1]?.trim();
            if (rawTarget) {
                targetId = rawTarget; // e.g. "historian"
            }
        }
        // Case 2: Legacy Tool Call
        else if (message.startsWith('使用工具:')) {
            const toolName = message.split(':')[1]?.trim();
            if (toolName) {
                // Heuristic mapping
                if (toolName.includes('historian')) targetId = 'historian';
                else if (toolName.includes('revenue')) targetId = 'official_revenue';
                else if (toolName.includes('works')) targetId = 'official_works';
                // ... add more mappings
            }
        }

        if (targetId) {
            this.handleOrchestration(frontendId, targetId);
        }
    } else {
        // If status changes to idle, clear interaction
        if (status !== 'working') {
             this.agentController.clearInteraction(frontendId);
        }
    }

    // 3. Agent Control (State & Movement)
    this.agentController.updateAgent(frontendId, status, fullMessage, isGuest);

    // 4. Court Logic (Decree & Logs)
    this.updateCourtState(frontendId, status, message);
  }

  private handleOrchestration(initiatorId: string, toolOrAgentName: string) {
      let targetId: string | null = null;
      
      const cleanName = toolOrAgentName.toLowerCase().trim();

      // 1. Direct ID Match
      if (BACKEND_ID_MAPPING[cleanName]) {
          targetId = BACKEND_ID_MAPPING[cleanName];
      }
      // 2. Heuristic Mapping (Fallback)
      else if (cleanName.includes('historian') || cleanName.includes('history')) targetId = 'historian';
      else if (cleanName.includes('revenue') || cleanName.includes('finance')) targetId = 'official_revenue';
      else if (cleanName.includes('personnel') || cleanName.includes('hr')) targetId = 'official_personnel';
      else if (cleanName.includes('rites') || cleanName.includes('product')) targetId = 'official_rites';
      else if (cleanName.includes('war') || cleanName.includes('ops')) targetId = 'official_war';
      else if (cleanName.includes('justice') || cleanName.includes('qa')) targetId = 'official_justice';
      else if (cleanName.includes('works') || cleanName.includes('engineer')) targetId = 'official_works';

      if (targetId && targetId !== initiatorId) {
          console.log(`[LiveAgent] Orchestration: ${initiatorId} -> ${targetId} (via ${toolOrAgentName})`);
          this.agentController.setInteraction(initiatorId, targetId);
      }
  }

  private updateCourtState(frontendId: string, status: string, message?: string) {
      const { addLog, decrees, updateDecreeStatus, activeDecreeId } = useCourtStore.getState();

      // Log Recording
      if (message && this.isValidLogMessage(message, status)) {
          let targetDecreeId = activeDecreeId;
          if (!targetDecreeId) {
               const executingDecree = decrees.find(d => d.status === 'executing');
               if (executingDecree) targetDecreeId = executingDecree.id;
          }

          if (targetDecreeId) {
              const actorName = frontendId === 'minister' ? '丞相' : frontendId;
              const now = Date.now();

              if (this.lastDecreeId === targetDecreeId && 
                  this.lastMessageActor === actorName && 
                  (now - this.lastMessageTime < 2000)) {
                  
                  const { appendLogContent } = useCourtStore.getState();
                  appendLogContent(targetDecreeId, message);
              } else {
                  addLog(targetDecreeId, actorName, '回复', message);
              }

              this.lastDecreeId = targetDecreeId;
              this.lastMessageActor = actorName;
              this.lastMessageTime = now;
          }
      }

      // Auto-Complete Logic
      const prevStatus = this.lastAgentStatus[frontendId];
      this.lastAgentStatus[frontendId] = status;

      if (status === 'working') {
          const activeId = activeDecreeId || decrees.find(d => d.status === 'drafting' || d.status === 'planning')?.id;
          if (activeId) {
               const decree = decrees.find(d => d.id === activeId);
               if (decree && decree.status !== 'executing') {
                   updateDecreeStatus(activeId, 'executing');
                   if (!activeDecreeId) {
                       useCourtStore.getState().setActiveDecree(activeId);
                   }
               }
          }
      } else if (status === 'idle') {
          const executingDecree = activeDecreeId 
              ? decrees.find(d => d.id === activeDecreeId) 
              : decrees.find(d => d.status === 'executing');
              
          if (executingDecree && prevStatus === 'working') {
              const hasLogs = executingDecree.logs.some(l => l.actor !== 'Emperor' && l.actor !== 'System');
              if (hasLogs) {
                  console.log(`[LiveAgent] Auto-completing decree ${executingDecree.id}`);
                  updateDecreeStatus(executingDecree.id, 'completed');
                  if (activeDecreeId === executingDecree.id) {
                      useCourtStore.getState().setActiveDecree(null);
                  }
              }
          }
      }
  }

  private isValidLogMessage(message: string, status: string): boolean {
      return message !== '正在思考...' && 
             message !== '等待指令...' && 
             message !== '执行中...' && 
             message !== '已离线' && 
             message !== '使用工具...' &&
             status !== 'offline';
  }
}
