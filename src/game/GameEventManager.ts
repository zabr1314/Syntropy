import { useAgentStore } from '../store/useAgentStore';

export class GameEventManager {
  private static instance: GameEventManager;
  private intervalId: number | null = null;
  private timeoutIds: Set<number> = new Set();
  
  private constructor() {}

  public static getInstance(): GameEventManager {
    if (!GameEventManager.instance) {
      GameEventManager.instance = new GameEventManager();
    }
    return GameEventManager.instance;
  }

  public start() {
    if (this.intervalId) return;

    // 每 10 秒尝试生成一次事件
    this.intervalId = window.setInterval(() => {
      this.tryTriggerEvent();
    }, 10000);
  }

  public stop() {
    if (this.intervalId) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.timeoutIds.forEach(id => window.clearTimeout(id));
    this.timeoutIds.clear();
  }

  private addTimeout(callback: () => void, delay: number) {
    const id = window.setTimeout(() => {
      callback();
      this.timeoutIds.delete(id);
    }, delay);
    this.timeoutIds.add(id);
  }

  public triggerOverload() {
    const { updateMetrics, addLog, setTargetPosition, setAgentStatus } = useAgentStore.getState();
    
    // 强制设置 CPU 为 99
    updateMetrics({ cpu: 99 });
    addLog(`⚠️ 警报：服务器负载激增至 99.0%！`);

    // 触发自动修复流程 (简化版)
    // 1. Minister 指挥
    setTargetPosition('minister', 350, 450); // 移动到会议室附近
    setAgentStatus('minister', 'working', 'Engineer，快去机房！');

    // 2. Engineer 响应 (延迟 2 秒)
    this.addTimeout(() => {
      setTargetPosition('engineer', 110, 500); // 移动到机房
      setAgentStatus('engineer', 'working', '收到，正在前往机房...');
      
      // 3. Engineer 修复 (延迟 5 秒)
      this.addTimeout(() => {
        setAgentStatus('engineer', 'working', '正在重启服务...');
        
        // 4. 修复完成 (延迟 8 秒)
        this.addTimeout(() => {
          updateMetrics({ cpu: 20 });
          setAgentStatus('engineer', 'idle', '服务已恢复正常。');
          
          // Minister 表扬
          setTargetPosition('minister', 260, 230); // 回工位
          setAgentStatus('minister', 'idle', '干得好。');
          
          // Engineer 回工位
          setTargetPosition('engineer', 560, 230); 
          
          addLog('✅ 系统：服务器负载已恢复正常。');
        }, 3000);
      }, 3000);
    }, 2000);
  }

  private tryTriggerEvent() {
    const { metrics, updateMetrics, addLog, setTargetPosition, setAgentStatus } = useAgentStore.getState();
    const random = Math.random();

    // 30% 概率触发服务器过载 (前提是当前 CPU 不太高，避免重复触发)
    if (random < 0.3 && metrics.cpu < 80) {
      this.triggerOverload();
    } 
    // 20% 概率触发新需求 (前提是工单不多)
    else if (random > 0.3 && random < 0.5 && metrics.tickets < 20) {
      addLog('ℹ️ 通知：收到新的业务需求。');
      updateMetrics({ tickets: metrics.tickets + 2 });
      
      setTargetPosition('minister', 260, 230); // 办公桌
      setAgentStatus('minister', 'working', '正在评估需求...');
      
      this.addTimeout(() => {
        setAgentStatus('minister', 'idle', '需求已分配。');
        // Engineer 假装接单
        setTargetPosition('engineer', 560, 230); // 办公桌
        setAgentStatus('engineer', 'working', '正在写代码...');
        
        this.addTimeout(() => {
            setAgentStatus('engineer', 'idle', '功能上线。');
            updateMetrics({ tickets: Math.max(0, metrics.tickets - 1) });
        }, 3000);
      }, 2000);
    }
  }
}
