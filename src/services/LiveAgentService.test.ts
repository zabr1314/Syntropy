import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock dependencies BEFORE importing LiveAgentService
vi.mock('./live/SocketManager');
vi.mock('./live/MessageProcessor');
vi.mock('./live/AgentController');
vi.mock('../store/useConfigStore', () => ({
  useConfigStore: {
    getState: vi.fn(() => ({ relayUrl: 'http://localhost:3001' })),
    subscribe: vi.fn(),
  },
}));

import { LiveAgentService } from './LiveAgentService';
import { useCourtStore } from '../store/useCourtStore';

describe('LiveAgentService - Decree Lifecycle', () => {
  let service: LiveAgentService;

  beforeEach(() => {
    // Reset store state
    useCourtStore.setState({ decrees: [], activeDecreeId: null, draftInput: '' });

    // Reset singleton so each test gets a fresh instance
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (LiveAgentService as any).instance = null;
    service = LiveAgentService.getInstance();

    vi.useFakeTimers();
  });

  afterEach(() => {
    if (service) service.stop();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('应该在 minister 变 working 时取消待完成的 decree', () => {
    // Setup: 创建一个执行中的 decree
    const decreeId = useCourtStore.getState().addDecree('检查各部门工作进展');
    useCourtStore.getState().updateDecreeStatus(decreeId, 'executing');
    useCourtStore.getState().setActiveDecree(decreeId);
    useCourtStore.getState().addLog(decreeId, 'minister', '回复', '正在处理中');

    // Simulate: minister goes idle (should start 2s timer)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).lastAgentStatus['minister'] = 'working';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).updateCourtState('minister', 'idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).completionTimer).not.toBeNull();

    // Simulate: minister goes back to working before 2s (should cancel timer)
    vi.advanceTimersByTime(1000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).updateCourtState('minister', 'working');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).completionTimer).toBeNull();

    // Verify: decree should still be executing
    const decree = useCourtStore.getState().decrees.find(d => d.id === decreeId);
    expect(decree?.status).toBe('executing');
  });

  it('应该在 minister idle 2秒后自动完成 decree', () => {
    // Setup
    const decreeId = useCourtStore.getState().addDecree('查询税收情况');
    useCourtStore.getState().updateDecreeStatus(decreeId, 'executing');
    useCourtStore.getState().setActiveDecree(decreeId);
    useCourtStore.getState().addLog(decreeId, 'minister', '回复', '税收情况良好');

    // Simulate: minister goes idle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).lastAgentStatus['minister'] = 'working';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).updateCourtState('minister', 'idle');

    // Fast-forward 2 seconds
    vi.advanceTimersByTime(2000);

    // Verify: decree should be completed
    const decree = useCourtStore.getState().decrees.find(d => d.id === decreeId);
    expect(decree?.status).toBe('completed');
    expect(useCourtStore.getState().activeDecreeId).toBeNull();
  });

  it('应该在 stop() 时清理 completion timer', () => {
    // Setup: start a timer
    const decreeId = useCourtStore.getState().addDecree('测试诏令内容');
    useCourtStore.getState().updateDecreeStatus(decreeId, 'executing');
    useCourtStore.getState().addLog(decreeId, 'minister', '回复', 'test');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).lastAgentStatus['minister'] = 'working';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).updateCourtState('minister', 'idle');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).completionTimer).not.toBeNull();

    // Stop service
    service.stop();

    // Verify: timer should be cleared
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((service as any).completionTimer).toBeNull();
  });

  it('不应该完成没有非系统日志的 decree', () => {
    // Setup: decree with only system/emperor logs
    const decreeId = useCourtStore.getState().addDecree('空诏令测试内容');
    useCourtStore.getState().updateDecreeStatus(decreeId, 'executing');
    useCourtStore.getState().setActiveDecree(decreeId);
    // Only Emperor and System logs — no agent response yet
    useCourtStore.getState().addLog(decreeId, 'System', '系统消息', '任务开始');

    // Simulate: minister goes idle
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).lastAgentStatus['minister'] = 'working';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (service as any).updateCourtState('minister', 'idle');
    vi.advanceTimersByTime(2000);

    // Verify: decree should still be executing (no agent logs)
    const decree = useCourtStore.getState().decrees.find(d => d.id === decreeId);
    expect(decree?.status).toBe('executing');
  });
});
