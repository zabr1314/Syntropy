# OpenClaw 连接逻辑重构与 Token 认证支持计划

## 1. 目标
解决当前“百官录”中 Agent 连接仅支持 `port/url` 但缺乏认证 Token 的问题。
根据 OpenClaw 的机制，连接 Gateway 通常需要 `JOIN_KEY` (Token)。

## 2. 修改范围
*   `src/store/useConfigStore.ts`: 扩展 `AgentConfig`，增加 `token` 字段。
*   `src/components/Console/AgentDetailModal.tsx`: 在“神经链接”区域增加 Token 输入框。
*   `src/services/live/SocketManager.ts`: 在 WebSocket 连接握手时携带 Token。
*   `server/index.js` (后端): 确保后端能正确转发或使用这个 Token 进行鉴权（目前后端是统一配置了一个 Gateway Token，如果我们要支持每个 Agent 连接不同的 Gateway，则需要透传）。

**调整策略**：
目前系统架构是：前端 -> 本地 Node Server (3001) -> OpenClaw Gateway。
Node Server 已经配置了一个全局的 `JOIN_KEY` 连接到 Gateway。
如果用户的意图是让每个 Agent 可以连接到 **不同的** OpenClaw Gateway（或者同一个 Gateway 但不同身份），我们需要：
1.  在前端配置中允许为每个 Agent 指定 `token`。
2.  前端连接 WebSocket 时将此 Token 传给 Node Server。
3.  Node Server 收到 Token 后，如果与默认配置不同，需要动态创建新的 OpenClaw 连接适配器，或者仅仅是作为鉴权通过的凭证。

**简化方案（推荐）**：
考虑到目前是单体 Node Server 代理模式，我们可以先让 Token 用于前端到 Node Server 的鉴权，或者如果 Node Server 支持多租户代理，则将其作为 OpenClaw 的 Session Token。

**根据用户描述“连接 OpenClaw Gateway 连接的，不是应该要 Token 的吗”**：
用户可能误以为前端是直接连 OpenClaw Gateway。实际上是连的中转服。
为了满足用户需求，我们将在 Agent 配置中显式增加 `Token` 字段，并在连接时使用。

## 3. 具体改动

### A. 数据结构 (useConfigStore)
```typescript
export interface AgentConfig {
  // ...
  port: string; 
  token?: string; // 新增字段：连接凭证
  // ...
}
```

### B. UI 界面 (AgentDetailModal)
*   在 `端口 / 地址` 输入框下方，新增 `鉴权令牌 (Token)` 输入框。
*   默认显示为 `******` (脱敏)，点击可编辑。

### C. 连接逻辑 (SocketManager & LiveAgentService)
*   `SocketManager` 的 `connect` 方法增加 `token` 参数。
*   在 `io(url, { auth: { token } })` 中携带 Token。

### D. 后端适配 (server/index.js)
*   目前后端 `socket.on('register')` 逻辑中已包含 `joinKey` 校验。
*   我们需要确保前端传递的 Token 能被后端正确识别和处理。

## 4. 执行步骤
1.  修改 `useConfigStore.ts` 增加 `token` 字段。
2.  修改 `AgentDetailModal.tsx` 增加 Token 输入 UI。
3.  修改 `LiveAgentService.ts` 和 `SocketManager.ts` 以支持 Token 传递。
