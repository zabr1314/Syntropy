import { useAgentStore } from '../store/useAgentStore';
import type { AgentId } from '../store/useAgentStore';
import { useCourtStore } from '../store/useCourtStore';

// Define rally points for different emergency types
const RALLY_POINTS = {
  ASSEMBLY: { x: 400, y: 300 }, // Center screen
  DEFENSE: { x: 100, y: 300 },  // Left gate
  ATTACK: { x: 700, y: 300 },   // Right gate
};

export class EmergencyService {
  private static instance: EmergencyService;
  private isEmergencyActive = false;

  private constructor() {}

  public static getInstance(): EmergencyService {
    if (!EmergencyService.instance) {
      EmergencyService.instance = new EmergencyService();
    }
    return EmergencyService.instance;
  }

  /**
   * Trigger a mass mobilization event
   * @param type 'assembly' | 'defense' | 'attack'
   */
  public async mobilize(type: 'assembly' | 'defense' | 'attack' = 'assembly') {
    if (this.isEmergencyActive) return;
    this.isEmergencyActive = true;

    const { agents, setTargetPosition, setAgentStatus, addLog } = useAgentStore.getState();
    const { addLog: addCourtLog } = useCourtStore.getState();

    // 1. Log the event
    const eventTitle = 
      type === 'defense' ? '御敌' : 
      type === 'attack' ? '出征' : '廷议';
    
    addLog(`系统：发布【${eventTitle}】总动员令！`);
    // Create a dummy decree log for visual feedback in console
    useCourtStore.getState().addDecree(`紧急动员：${eventTitle}`);

    // Trigger visual alarm
    window.dispatchEvent(new CustomEvent('emergency-assembly'));

    // 2. Calculate target positions
    const center = RALLY_POINTS[type.toUpperCase() as keyof typeof RALLY_POINTS];
    const radius = 60; // Formation radius

    // 3. Move all agents to formation
    const agentIds = Object.keys(agents) as AgentId[];
    
    agentIds.forEach((agentId, index) => {
      // Calculate position in a circle/semicircle around the rally point
      const angle = (index / agentIds.length) * Math.PI * 2;
      const offsetX = Math.cos(angle) * radius;
      const offsetY = Math.sin(angle) * radius;
      
      const targetX = center.x + offsetX;
      const targetY = center.y + offsetY;

      // Dispatch movement
      setTargetPosition(agentId, targetX, targetY);
      setAgentStatus(agentId, 'working', `响应${eventTitle}号召!`);
    });

    // 4. Wait for arrival (mock duration)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Special actions after assembly
    if (type === 'attack') {
      agentIds.forEach(id => {
        setAgentStatus(id, 'working', '冲锋！！！');
        // Move them off-screen to the right
        setTargetPosition(id, 900, 300 + (Math.random() - 0.5) * 200);
      });
    } else if (type === 'defense') {
       agentIds.forEach(id => {
        setAgentStatus(id, 'working', '坚守阵地！');
      });
    }

    // Reset flag after some time
    setTimeout(() => {
      this.isEmergencyActive = false;
      // Optional: return to idle
      if (type !== 'attack') { // Don't reset attackers immediately
        agentIds.forEach(id => {
            setAgentStatus(id, 'idle', '待命');
        });
      }
    }, 8000);
  }
}
