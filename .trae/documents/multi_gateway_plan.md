# OpenClaw 连接逻辑重构：支持多实例多 Token

## 1. 现状分析
*   目前后端 (`server/index.js`) 使用单例 `OpenClawGatewayAdapter` 连接到一个全局配置的 Gateway。
*   用户指出 OpenClaw 支持单实例下运行多个独立智能体，且不同连接可能需要不同的 Token。
*   当前架构无法满足“每个官员连接不同 Gateway 或使用不同 Token”的需求。

## 2. 目标
重构后端架构，使其从“单例 Gateway 适配器”转变为“多实例 Gateway 连接池”。
每个前端 Agent (如 `minister`, `historian`) 可以配置独立的 `url` 和 `token`，后端根据前端传递的配置，动态创建或复用对应的 OpenClaw 连接。

## 3. 修改方案

### A. 前端 (同上个计划)
*   `useConfigStore.ts`: 增加 `token` 字段。
*   `AgentDetailModal.tsx`: 增加 Token 输入框。
*   `SocketManager.ts`: 在 WebSocket 连接时，通过 `query` 或 `auth` 参数传递 `targetUrl` 和 `token` 给后端。

### B. 后端 (核心重构)
*   **连接池管理**: 创建 `GatewayConnectionManager` 类，维护 `Map<string, OpenClawGatewayAdapter>`。Key 可以是 `url + token` 的哈希，或者直接用 Agent ID。
*   **动态连接**:
    *   当收到前端 WebSocket 连接 (`register` 事件) 时，读取其携带的 `openclaw_url` 和 `token`。
    *   检查连接池中是否已有对应的 Gateway 连接。
    *   如果没有，新建一个 `OpenClawGatewayAdapter` 实例并启动。
    *   如果有，复用该实例。
*   **消息路由**:
    *   当 Gateway 收到 OpenClaw 事件时，需要知道该事件属于哪个 Agent。
    *   由于 OpenClaw 事件包含 `sessionKey` (如 `agent:main:main`)，我们需要建立 `GatewayInstance -> [FrontendSocketId]` 的反向映射，或者在 Gateway 适配器中维护订阅列表，将事件精确推送到对应的 Agent Socket。

## 4. 详细执行步骤

### 第一步：前端改造
1.  修改 `AgentConfig` 增加 `token`。
2.  修改 `AgentDetailModal` 允许输入 Token。
3.  修改 `LiveAgentService` 和 `SocketManager`，在连接时将 `port` (作为 URL) 和 `token` 传递给后端。
    *   注意：前端 `port` 字段现在实际上是 OpenClaw Gateway 的完整 URL (如 `ws://localhost:18789`)。
    *   为了保持兼容，如果 `port` 是数字，则认为是连本地 3001 的代理；如果是 `ws://...`，则是通过本地 3001 代理连远程。
    *   **更正**：前端 `SocketManager` 始终连接本地 3001 后端。我们需要在 `connect` 时，通过 `query` 参数告诉后端：“我要连哪个 OpenClaw Gateway”。

### 第二步：后端改造
1.  修改 `server/index.js`。
2.  移除全局的 `clawAdapter`。
3.  引入 `GatewayManager`。
4.  在 `io.on('connection')` 中，解析 query 参数 `targetUrl` 和 `token`。
5.  为该 Socket 分配或创建对应的 Gateway Adapter。
6.  设置 Gateway 的 `onDomainEvent` 回调，使其只向相关的 Socket 发送事件。

## 5. 交互流程
1.  用户在前端设置丞相的 URL 为 `ws://192.168.1.100:18789`，Token 为 `abc`。
2.  前端 `SocketManager` 连接 `http://localhost:3001?gateway=ws://192.168.1.100:18789&token=abc`。
3.  后端收到连接，检查是否已有连向该 URL+Token 的 Adapter。
4.  如果没有，后端启动一个新的 `OpenClawGatewayAdapter` 连向 `192.168.1.100`。
5.  连接成功后，该 Adapter 收到的所有事件，通过 Socket 转发给前端丞相。

这样就实现了真正的多实例、多 Token 支持。
