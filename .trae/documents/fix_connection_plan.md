# 丞相连接失败问题排查与修复计划

## 1. 问题分析
用户反馈“丞相连接失败，一直说连接已断开”。经过代码审查，发现以下原因：

1.  **重构引入的 `syncConnections` 逻辑问题**:
    *   在重构后的 `LiveAgentService.ts` 中，我们引入了 `useConfigStore` 来管理连接。
    *   但是 `useConfigStore` 中的 `agents` 列表默认可能是空的，或者没有包含 `minister` (丞相)。
    *   `syncConnections` 会遍历 `useConfigStore.getState().agents`，如果没有配置丞相的连接信息，就不会发起连接。

2.  **默认配置缺失**:
    *   之前的单体 `SocketManager` 是硬编码连接 `localhost:3001`。
    *   现在的 `LiveAgentService` 依赖 `useConfigStore`，如果 Store 初始化时没有默认值，或者默认值被覆盖为空，丞相就会“失联”。

3.  **SocketManager 的 `setWsConnected` 状态**:
    *   `SocketManager` 在 `connect` 时会调用 `useAgentStore.getState().setWsConnected(true)`。
    *   但现在是多连接模式 (Multi-Connection)，如果只连接了一个 Agent 成功，全局状态应该算 Connected 吗？或者我们需要针对每个 Agent 维护连接状态？
    *   目前 `SocketManager` 的实现依然在操作全局的 `setWsConnected`，这在多实例下会互相覆盖。

## 2. 修复方案

### 2.1 确保 `useConfigStore` 有默认的丞相配置
*   检查 `useConfigStore.ts`，确保初始状态包含 `minister` -> `3001` (Relay Server)。
*   或者在 `LiveAgentService` 启动时，强制添加一个默认的 Relay Server 连接。

### 2.2 优化 `SocketManager` 的状态管理
*   不再直接操作全局的 `setWsConnected`。
*   改为通过回调函数通知 `LiveAgentService`，由 `LiveAgentService` 汇总状态。
*   或者，简单点：`LiveAgentService` 维护一个 `relayManager` (主连接) 和 `agentManagers` (直连)。目前架构似乎是想让 Relay Server (3001) 作为主网关，其他的是直连？
    *   **修正理解**: `server/index.js` 是一个 Relay Server，它负责连接 OpenClaw Gateway。前端应该只连接这个 Relay Server (3001) 即可，不需要前端直连每个 Agent。
    *   **代码回退/修正**: `LiveAgentService` 中的 `syncConnections` 逻辑似乎把“连接 Relay”和“直连 Agent”混淆了。
    *   **当前逻辑**: `syncConnections` 尝试为配置中的每个 agent 创建一个新的 `SocketManager`。这通常是不对的，除非我们想让前端直连多个后端。
    *   **正确架构**: 前端 -> Relay Server (3001) -> OpenClaw / Agents。前端只需要**一个** WebSocket 连接到 Relay Server。

### 2.3 架构修正实施
*   **回退多连接逻辑**: `LiveAgentService` 应该只维护**一个** `SocketManager` 实例，连接到 Relay Server (`http://localhost:3001`)。
*   **配置化 Relay URL**: 允许从 `useConfigStore` 获取 Relay Server URL，而不是 Agent 列表。

## 3. 实施步骤

1.  **修改 `LiveAgentService.ts`**:
    *   移除 `connections` Map。
    *   恢复单例 `socketManager`。
    *   `start()` 方法中，读取配置的 `relayUrl` (默认为 3001) 进行连接。
    *   监听 `useConfigStore` 的 `relayUrl` 变化。

2.  **修改 `useConfigStore.ts`**:
    *   确保有 `relayUrl` 字段。

3.  **修改 `SocketManager.ts`**:
    *   保持现状，它已经支持传入 URL。

## 4. 立即执行
修改 `LiveAgentService.ts`，恢复为连接单一 Relay Server 的模式。这是最稳健的修复方式。
