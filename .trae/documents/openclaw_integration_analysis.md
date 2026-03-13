# OpenClaw 连接模式分析与天命系统集成方案

## 1. 竞品 (OpenClaw Studio) 连接模式分析

通过对 `openclaw-studio` 源码的深度分析，其与 OpenClaw 的连接采用了 **基于 WebSocket 的双向长连接 + JSON Frame 协议** 的模式。这与您当前使用的“轮询 API + 中继转发”模式有显著区别。

### 1.1 核心架构
*   **通信协议**: WebSocket (使用 `ws` 库)。
*   **数据格式**: 自定义 JSON Frame 协议，包含 `req` (请求), `res` (响应), `event` (事件) 三种类型。
*   **控制平面 (Control Plane)**: 系统核心是 `ControlPlaneRuntime` (位于 `src/lib/controlplane/runtime.ts`)，它作为一个单例运行在 Node.js 环境中，负责维护连接和状态。
*   **网关适配器**: `OpenClawGatewayAdapter` (位于 `src/lib/controlplane/openclaw-adapter.ts`) 封装了底层的 WebSocket 连接、重连机制和协议解析。

### 1.2 认证机制
连接过程并非简单的 HTTP Basic Auth 或 Header Token，而是一个**握手挑战 (Challenge-Response)** 过程：
1.  **建立连接**: 客户端连接 WebSocket，不带凭证。
2.  **接收挑战**: 服务端发送 `type: "event", name: "connect.challenge"`。
3.  **发送凭证**: 客户端响应 `method: "connect"` 请求，携带 `auth: { token }` 和客户端元数据（ID, Capabilities）。
4.  **权限协商**: 如果权限不足，适配器会自动降级或报错。

### 1.3 状态同步
*   **全量同步 (Hydration)**: 连接建立后，并发调用 `agents.list`, `sessions.list` 等 RPC 方法获取初始状态。
*   **增量更新 (Events)**: 服务端主动推送 `domain_event`，客户端实时更新本地状态，无需轮询。

---

## 2. 天命系统现状评估

您当前的 `scripts/openclaw-connector.js` 和 `server/index.js` 采用的是 **Sidecar 轮询 + Socket.IO 中继** 模式：
*   **当前做法**: Connector 每 2 秒轮询一次 OpenClaw API (`http://localhost:18791/status`)，或者监听本地文件变化，然后通过 Socket.IO 推送给 Server，Server 再广播给前端。
*   **局限性**:
    *   **延迟**: 依赖轮询，状态更新不实时。
    *   **功能受限**: 主要是单向的状态读取，难以实现复杂的反向控制（如从天命系统直接控制 Agent 暂停/启动）。
    *   **维护成本**: 需要维护 Connector 脚本和 Server 两个部分。

---

## 3. 集成可行性与建议

**结论：完全可行，且强烈推荐采用 OpenClaw Studio 的连接模式。**

将 `openclaw-studio` 的连接层移植到您的 `server/index.js` 中，可以让天命系统成为一个原生的 OpenClaw 客户端。

### 3.1 改造收益
1.  **实时性**: 毫秒级感知 Agent 状态变化（如从 `thinking` 变为 `speaking`）。
2.  **双向控制**: 可以直接在天命系统 UI 上下发指令控制 Agent，而不仅仅是监控。
3.  **架构简化**: 去掉 `openclaw-connector.js` 轮询脚本，Server 直接连接 OpenClaw Gateway。

### 3.2 实施路线图

建议在 `server/` 目录下创建一个 `lib/openclaw` 模块，移植以下核心代码：

1.  **移植 `GatewayClient` 和 `OpenClawGatewayAdapter`**:
    *   主要参考 `src/lib/controlplane/openclaw-adapter.ts`。
    *   保留 WebSocket 连接、心跳保活、JSON Frame 解析逻辑。
    *   保留 `connect` 握手认证流程。

2.  **改造 `server/index.js`**:
    *   引入移植后的 `OpenClawGatewayAdapter`。
    *   在 Server 启动时初始化适配器并连接 OpenClaw。
    *   **事件转发**: 监听适配器的 `domain_event`，通过现有的 `io.emit('agent_update', ...)` 转发给前端。

    ```javascript
    // 伪代码示例
    const adapter = new OpenClawGatewayAdapter({
      url: process.env.OPENCLAW_GATEWAY_URL,
      token: process.env.OPENCLAW_TOKEN
    });
    
    adapter.on('event', (event) => {
      if (event.name === 'agent.status_changed') {
        io.emit('agent_update', { 
          id: event.payload.agentId, 
          status: event.payload.status 
        });
      }
    });
    
    await adapter.connect();
    ```

3.  **前端适配**:
    *   前端代码基本无需改动，继续通过 Socket.IO 接收 `agent_update` 事件即可。

### 3.3 注意事项
*   **环境依赖**: 该模式依赖 Node.js 环境（`ws` 库），您的 `server/index.js` 已经是 Node 环境，完全匹配。
*   **依赖库**: 需要安装 `ws`, `uuid` 等基础库，这些在 `openclaw-studio` 的 `package.json` 中都有列出。
