# LiveAgentService 重构计划

## 1. 目标
将臃肿的 `LiveAgentService.ts` 拆分为职责单一的子模块，提高可维护性和扩展性。

## 2. 模块划分
我们将创建 `src/services/live/` 目录，包含以下文件：

### 2.1 `SocketManager.ts`
*   **职责**: 
    *   管理 Socket.io 连接、断开、重连。
    *   发送 `command` 事件。
    *   监听 `agent_update`, `agent_offline` 事件并分发给回调函数。
*   **输入**: Relay Server URL。
*   **输出**: 连接状态、原始事件数据。

### 2.2 `MessageProcessor.ts`
*   **职责**:
    *   处理 OpenClaw 的流式消息 (`delta` -> `full text`)。
    *   维护消息缓冲池 (`agentMessageBuffers`)。
    *   决定是否需要更新气泡（截断逻辑）。
*   **输入**: 原始 `message`, `status`。
*   **输出**: 处理后的完整消息。

### 2.3 `AgentController.ts`
*   **职责**:
    *   维护 Agent 的状态 (`lastAgentStatus`)。
    *   计算 Agent 的目标位置 (`getWorkLocation`, `shouldMove`)。
    *   处理“说话时停止移动”和“说话后停留”的逻辑 (`lastTalkingTime`)。
    *   调用 `useAgentStore` 更新位置和状态。
*   **输入**: Agent ID, Status, Message。
*   **输出**: 更新 Store。

### 2.4 `LiveAgentService.ts` (Facade)
*   **职责**: 
    *   作为对外的统一入口 (Singleton)。
    *   组装上述三个模块。
    *   处理与 `CourtStore` 的交互（如自动完结奏折）。

## 3. 实施步骤
1.  创建 `src/services/live/` 目录。
2.  提取 `SocketManager.ts`。
3.  提取 `MessageProcessor.ts`。
4.  提取 `AgentController.ts`。
5.  重写 `LiveAgentService.ts` 使用上述模块。

## 4. 依赖关系
`LiveAgentService` -> `SocketManager`
`LiveAgentService` -> `MessageProcessor`
`LiveAgentService` -> `AgentController`
