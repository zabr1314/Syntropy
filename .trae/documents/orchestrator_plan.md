# 丞相作为 Orchestrator (主控 Agent) 的架构设计

## 1. 核心理念
您希望丞相 (`minister`) 扮演 **Orchestrator** 的角色，负责规划、拆解任务，并将具体的工作分发给六部尚书 (`sub-agents`)。

这与我们现有的架构并不冲突，反而更加符合“天命系统”的隐喻。

## 2. 数据流向

**User (皇帝)** -> **Minister (丞相)** -> **Sub-Agents (六部)**

1.  **用户下旨**: 所有的自然语言指令 (`addDecree`) **只发送给丞相**。
2.  **丞相思考**: 丞相接收到指令，进行思考 (`planning`)。
3.  **丞相调度**: 丞相决定需要哪个部门配合。
    *   **OpenClaw 实现**: 丞相通过调用 `tool` (例如 `call_historian`, `call_revenue`) 来与子 Agent 交互。
    *   **UI 表现**: 丞相走到对应的官员面前，或者通过“信鸽”传递消息。
4.  **子 Agent 执行**: 对应的官员收到指令，开始工作 (`working`)，并在头顶冒气泡回复。
5.  **丞相汇总**: 子 Agent 完成工作后，将结果返回给丞相，丞相整理后向皇帝汇报。

## 3. 前端需要做的适配

既然逻辑核心在后端 (OpenClaw)，前端的主要任务是**正确展示这种协作关系**。

### 3.1 监听“工具调用”事件
当丞相调用工具时，我们需要识别出他是在**呼叫子 Agent**。

*   **当前**: `server/index.js` 已经能解析 `stream === 'tool'`。
*   **改进**: 
    *   如果工具名匹配子 Agent 的 ID（如 `historian_tool`），则触发前端的**“协作动画”**。
    *   丞相走到史官面前。
    *   史官状态变为 `working`。

### 3.2 允许子 Agent 独立发言
虽然用户只跟丞相说话，但子 Agent 在执行任务时，也需要能**独立冒气泡**。

*   **当前**: `LiveAgentService` 已经支持多 Agent 更新。只要后端发来 `agent:historian:main` 的消息，史官就会说话。
*   **验证**: 只要 OpenClaw 后端的丞相正确调用了子 Agent，并且子 Agent 的回复被转发到了前端，史官就会自动说话。

## 4. 实施步骤

1.  **无需修改 UI 输入框**: 用户始终只跟丞相说话（默认目标 `minister`）。
2.  **增强 `LiveAgentService` 的工具识别**:
    *   解析 `tool_use` 消息。
    *   如果发现 `tool_name` 包含 `historian` 或 `official`，则让丞相执行**“移动到目标官员”**的动作。
3.  **增强 `AgentController`**:
    *   支持 `interaction` 状态：当两个 Agent 靠近时，播放“交谈”动画。

## 5. 立即行动
我们将修改 `LiveAgentService.ts`，增加对**“丞相调用子 Agent”**这一行为的视觉响应逻辑。
