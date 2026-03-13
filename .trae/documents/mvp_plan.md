# 天命系统 (Taihe) MVP 完善计划

## 目标
完成 MVP 核心功能，重点实现“天牢”拦截机制 (Human-in-the-loop) 和模拟后端驱动的业务流。

## 阶段一：核心机制完善 (The Jail & Intervention)
- [ ] **1.1 状态定义升级**
  - 修改 `src/store/useAgentStore.ts`，在 `AgentState['status']` 中增加 `'jailed'` 状态。
  - 添加 `releaseAgent(id)` action，用于释放 Agent。

- [ ] **1.2 天牢区域与视觉表现**
  - 在 `src/game/MainScene.ts` 中明确定义天牢区域坐标 (例如右上角)。
  - 在 `update` 或 `syncAgents` 中处理 `jailed` 状态：
    - 强制 Agent 瞬移或快速移动到天牢区域。
    - 可选：添加栅栏或红色高亮特效。

- [ ] **1.3 御批拦截弹窗 (React)**
  - 创建 `src/components/JailModal.tsx`。
  - 监听 Store 中的 `agents`，如果有 agent 状态为 `jailed`，自动弹出模态框。
  - 弹窗内容：显示错误原因 (mock)、Agent 信息、操作按钮 (驳回/释放)。
  - 按钮点击后调用 `releaseAgent` 或重置状态。

## 阶段二：模拟后端驱动 (The Mock Driver)
- [ ] **2.1 增强 GameEventManager**
  - 修改 `src/game/GameEventManager.ts`，添加 `triggerSecurityBreach` 方法。
  - 模拟场景：
    1. 用户下达指令 "开始代码审查"。
    2. 丞相 Agent 走向 藏书阁 (RAG)。
    3. 工部 Agent 开始工作 (Working)。
    4. 工部 Agent 触发 "越权访问" -> 状态变为 `jailed` -> 触发弹窗。

- [ ] **2.2 集成 Mock 服务**
  - 在 `Sidebar` 中添加“触发安全拦截”按钮，调用 `GameEventManager.triggerSecurityBreach()`。

## 阶段三：交互与体验优化 (Polishing)
- [ ] **3.1 自然语言输入模拟**
  - 在 `Sidebar` 增加一个输入框。
  - 用户输入任何内容，都触发 Mock 演示脚本 (MVP 阶段 trick)。
  - 在日志中显示用户输入的指令。

- [ ] **3.2 视觉细节优化**
  - 调整 Agent 移动速度和动画流畅度。
  - 优化 `MainScene` 的地图布局，确保“天牢”区域清晰可见。

## 执行顺序
1. 1.1 -> 1.2 -> 1.3 (优先打通天牢闭环)
2. 2.1 -> 2.2 (实现自动演示)
3. 3.1 -> 3.2 (优化体验)
