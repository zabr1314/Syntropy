# 天命系统多 Agent 对话实现方案

根据您提供的背景和代码现状，我们的前端架构已经天然支持“单连接、多会话”的模式。现在的关键是**如何在 UI 上实现“指定 Agent 对话”**，以及**如何在消息协议中透传目标 Agent ID**。

## 1. 核心现状确认

*   **物理连接**: 前端已经通过 WebSocket 连接到了 Relay Server (3001)。
*   **消息分发**: `LiveAgentService` 已经能处理 `agent_update` 事件，并根据 `BACKEND_ID_MAPPING` 将消息分发给不同的前端角色（如丞相、史官）。
*   **指令发送**: `LiveAgentService.sendCommand(agentId, ...)` 已经支持发送 `targetId`。

**缺失的部分**:
1.  **UI 交互**: 目前只有“丞相”在主导对话。用户在输入框发消息时，默认是发给丞相的，没有选择“我要跟史官说话”的地方。
2.  **会话上下文**: 前端没有维护“当前正在跟谁聊天”的状态。

## 2. 实施方案

我们将采用 **“对话启动器 + 混合模式”** 的方案，既保留沉浸感，又提供明确的控制权。

### 步骤一：扩展 `DecreePipeline` (UI 层)
我们需要在输入框附近增加一个“传唤”功能（即选择对话对象）。

*   **当前**: 默认发给 `minister`。
*   **改进**: 
    *   在输入框上方或左侧增加一个 **“接收人”下拉菜单** 或 **角色头像栏**。
    *   列出所有在线的官员（丞相、史官、六部尚书）。
    *   用户选择“史官”后，发送的圣旨将带有 `target: 'historian'`。

### 步骤二：更新 `LiveAgentService` (逻辑层)
我们需要修改 `addDecree` 的逻辑，使其支持携带 `targetAgentId`。

*   **当前**: `addDecree(content)` -> `sendCommand('minister', 'chat', ...)`
*   **改进**: 
    *   `addDecree(content, targetAgentId)`
    *   `sendCommand(targetAgentId, 'chat', ...)`

### 步骤三：后端协议适配 (Relay Server)
确保 `server/index.js` 能正确处理 `targetId` 并生成正确的 OpenClaw `sessionKey`。

*   **当前**: 
    ```javascript
    const agentId = targetId === 'minister' ? 'main' : targetId;
    const sessionKey = `agent:${agentId}:main`;
    ```
*   **验证**: 如果我们传 `targetId='historian'`，后端会生成 `agent:historian:main`。
    *   如果您的 OpenClaw 里有一个 ID 为 `historian` 的 Agent，那么**这就已经通了！**

## 3. 具体实施计划

### 3.1 修改 Store
在 `useCourtStore` 中增加 `targetAgentId` 状态，默认为 `minister`。

### 3.2 修改 UI (`DecreePipeline.tsx`)
1.  添加一个“传唤官员”的选择器组件。
2.  发送时读取当前的 `targetAgentId`。

### 3.3 验证后端
确保 OpenClaw 后端确实有名为 `historian`、`official_works` 等 ID 的 Agent 正在运行。

## 4. 立即行动
我们将先在 UI 上添加**“选择对话对象”**的功能。
