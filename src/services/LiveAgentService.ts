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

  // Stream buffering: accumulate chunks per agent, write one clean log entry on idle
  private streamBuffers: Record<string, string> = {};

  // Decree completion debounce: wait 2s after minister goes idle before marking decree as completed
  private completionTimer: ReturnType<typeof setTimeout> | null = null;

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
      this.socketManager = new SocketManager(url);
      this.socketManager.connect(
          this.handleAgentUpdate.bind(this),
          this.handleAgentOffline.bind(this),
          this.handleStreamChunk.bind(this),
          this.handlePlanPreview.bind(this)
      );
  }

  public stop() {
    this.isRunning = false;
    this.socketManager.disconnect();
    if (this.completionTimer) {
        clearTimeout(this.completionTimer);
        this.completionTimer = null;
    }
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

  private handleStreamChunk(data: { id: string, chunk: string }) {
      const frontendId = BACKEND_ID_MAPPING[data.id] || data.id;

      // Accumulate in per-agent buffer; flushed as one complete log entry when agent goes idle
      if (!this.streamBuffers[frontendId]) this.streamBuffers[frontendId] = '';
      this.streamBuffers[frontendId] += data.chunk;

      // Only update minister's speech bubble for real-time game view feedback
      // Officials show fixed template text — no LLM content in their bubbles
      if (frontendId === 'minister') {
          const buf = this.streamBuffers[frontendId];
          const displayText = buf.length > 60 ? '...' + buf.slice(-60) : buf;
          useAgentStore.getState().setAgentStatus('minister', 'working', displayText);
      }
  }

  // Timer refs for clearing official idle bubbles after 2s
  private officialIdleTimers: Record<string, ReturnType<typeof setTimeout>> = {};

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

    // 2.5 Flush stream buffer when agent finishes — writes one clean log entry per agent
    if (status === 'idle' && this.streamBuffers[frontendId]) {
        const completedContent = this.streamBuffers[frontendId];
        delete this.streamBuffers[frontendId];
        this.writeDecreeLog(frontendId, completedContent);
    }

    // 2.6 Tool Call / Orchestration Detection
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

    // 3.5 Official template bubbles (non-minister, non-emperor agents)
    const isOfficial = frontendId !== 'minister' && frontendId !== 'emperor';
    if (isOfficial) {
        const store = useAgentStore.getState();
        if (status === 'working') {
            // Clear any pending idle timer
            if (this.officialIdleTimers[frontendId]) {
                clearTimeout(this.officialIdleTimers[frontendId]);
                delete this.officialIdleTimers[frontendId];
            }
            store.setAgentStatus(frontendId as AgentId, 'working', '奉命，正在处理...');
        } else if (status === 'idle') {
            store.setAgentStatus(frontendId as AgentId, 'idle', '已回禀丞相');
            // Clear bubble after 2s
            this.officialIdleTimers[frontendId] = setTimeout(() => {
                useAgentStore.getState().setAgentStatus(frontendId as AgentId, 'idle', '');
                delete this.officialIdleTimers[frontendId];
            }, 2000);
        }
    }

    // 4. Court Logic (Decree lifecycle: executing / auto-complete)
    this.updateCourtState(frontendId, status);
  }

  private handlePlanPreview(data: { from: string, tasks: Array<{ official_id: string, instruction: string }> }) {
      const { addLog, activeDecreeId, decrees } = useCourtStore.getState();

      // Add plan preview log to the active decree
      let targetDecreeId = activeDecreeId;
      if (!targetDecreeId) {
          const activeDecree = decrees.find(d => d.status === 'executing' || d.status === 'drafting' || d.status === 'planning');
          if (activeDecree) targetDecreeId = activeDecree.id;
      }

      const officialNames = data.tasks.map(t => {
          const fid = BACKEND_ID_MAPPING[t.official_id] || t.official_id;
          return fid;
      }).join('、');

      if (targetDecreeId) {
          addLog(targetDecreeId, '系统', '执行计划', `丞相将并行召唤：${officialNames}`);
      }

      // Update minister bubble: single vs parallel
      const ministerMsg = data.tasks.length === 1
          ? `已传唤${officialNames}，等待回禀...`
          : `正在协调多部，等待回禀...`;
      useAgentStore.getState().setAgentStatus('minister', 'working', ministerMsg);

      // Mark summoned officials as working with template bubble
      const store = useAgentStore.getState();
      for (const task of data.tasks) {
          const frontendId = BACKEND_ID_MAPPING[task.official_id] || task.official_id;
          store.setAgentStatus(frontendId as AgentId, 'working', '奉命，正在处理...');
      }
  }

  private handleOrchestration(initiatorId: string, toolOrAgentName: string) {      let targetId: string | null = null;
      
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

  /**
   * Write a complete agent response as a single log entry to the active decree.
   * Called when an agent's stream is fully buffered (on idle transition).
   */
  private writeDecreeLog(frontendId: string, content: string) {
      if (!content.trim()) return;

      const { addLog, activeDecreeId, decrees } = useCourtStore.getState();
      let targetDecreeId = activeDecreeId;
      if (!targetDecreeId) {
          const activeDecree = decrees.find(d =>
              d.status === 'executing' || d.status === 'drafting' || d.status === 'planning'
          );
          if (activeDecree) targetDecreeId = activeDecree.id;
      }

      if (targetDecreeId) {
          const actorName = frontendId === 'minister' ? '丞相' : frontendId;
          addLog(targetDecreeId, actorName, '回复', content.trim());
      }
  }

  private updateCourtState(frontendId: string, status: string) {
      const { updateDecreeStatus, activeDecreeId, decrees } = useCourtStore.getState();

      const prevStatus = this.lastAgentStatus[frontendId];
      this.lastAgentStatus[frontendId] = status;

      // Mark decree as executing when any agent starts working
      if (status === 'working') {
          // Cancel any pending completion timer when work resumes
          if (this.completionTimer) {
              clearTimeout(this.completionTimer);
              this.completionTimer = null;
          }

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
      }

      // Auto-complete decree with debounce: wait 2s after minister goes idle
      if (status === 'idle' && prevStatus === 'working' && frontendId === 'minister') {
          // Cancel any existing timer
          if (this.completionTimer) {
              clearTimeout(this.completionTimer);
          }

          // Set new timer: complete decree after 2s if minister stays idle
          this.completionTimer = setTimeout(() => {
              const executingDecree = activeDecreeId
                  ? decrees.find(d => d.id === activeDecreeId)
                  : decrees.find(d => d.status === 'executing');

              if (executingDecree) {
                  const hasLogs = executingDecree.logs.some(l => l.actor !== 'Emperor' && l.actor !== 'System');
                  if (hasLogs) {
                      console.log(`[LiveAgent] Auto-completing decree ${executingDecree.id} (after 2s debounce)`);
                      updateDecreeStatus(executingDecree.id, 'completed');
                      if (activeDecreeId === executingDecree.id) {
                          useCourtStore.getState().setActiveDecree(null);
                      }
                  }
              }
              this.completionTimer = null;
          }, 2000);
      }
  }
}
