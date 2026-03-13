import { useAgentStore } from '../store/useAgentStore';
import type { Scenario, ScenarioStep, AgentUpdate } from './MockProtocol';

export class MockSimulator {
  private static instance: MockSimulator;
  private isRunning: boolean = false;
  private currentTimeoutIds: number[] = [];

  private constructor() {}

  public static getInstance(): MockSimulator {
    if (!MockSimulator.instance) {
      MockSimulator.instance = new MockSimulator();
    }
    return MockSimulator.instance;
  }

  public runScenario(scenario: Scenario) {
    if (this.isRunning) {
      console.warn('Scenario already running, stopping previous...');
      this.stop();
    }

    // 停止随机事件
    import('../game/GameEventManager').then(({ GameEventManager }) => {
        GameEventManager.getInstance().stop();
    });

    this.isRunning = true;
    const { addLog } = useAgentStore.getState();
    addLog(`🎬 剧本启动：${scenario.name}`);

    let accumulatedDelay = 0;

    scenario.steps.forEach((step, index) => {
      accumulatedDelay += step.delay;

      const timeoutId = window.setTimeout(() => {
        this.executeStep(step);
        
        // 剧本结束检查
        if (index === scenario.steps.length - 1) {
          this.isRunning = false;
          addLog(`🏁 剧本结束：${scenario.name}`);
          
          // 如果没有 jailed 状态，恢复随机事件
          const hasJailed = step.updates.some(u => u.status === 'jailed');
          if (!hasJailed) {
             import('../game/GameEventManager').then(({ GameEventManager }) => {
                GameEventManager.getInstance().start();
            });
          }
        }
      }, accumulatedDelay);

      this.currentTimeoutIds.push(timeoutId);
    });
  }

  public stop() {
    this.currentTimeoutIds.forEach(id => window.clearTimeout(id));
    this.currentTimeoutIds = [];
    this.isRunning = false;
  }

  private executeStep(step: ScenarioStep) {
    const { setTargetPosition, setAgentStatus, addLog } = useAgentStore.getState();

    step.updates.forEach((update: AgentUpdate) => {
      // 1. 更新日志
      if (update.log_message) {
        addLog(update.log_message);
      }

      // 2. 更新位置
      if (update.position) {
        setTargetPosition(update.agent_id, update.position.x, update.position.y);
      }

      // 3. 更新状态和气泡
      if (update.status) {
        setAgentStatus(update.agent_id, update.status, update.bubble_text);
      }
    });
  }
}