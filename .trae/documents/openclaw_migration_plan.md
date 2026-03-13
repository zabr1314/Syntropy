# OpenClaw 连接模式移植实施计划

本计划旨在将 `openclaw-studio` 的 WebSocket 连接模式移植到天命系统的 `server` 端，实现与 OpenClaw 的实时双向通信。

## 1. 准备工作

### 1.1 安装依赖
在 `server/` 目录下（或者项目根目录，如果共享 `package.json`），需要安装 `ws` 库用于 WebSocket 连接。

```bash
npm install ws
```
*注意：`node:crypto` 是 Node.js 内置模块，无需安装。*

### 1.2 目录结构规划
在 `server/` 目录下创建 `lib/openclaw` 文件夹，用于存放相关代码：

```
server/
  ├── index.js          (现有入口文件)
  └── lib/
      └── openclaw/
          ├── adapter.js (核心适配器，对应 OpenClawGatewayAdapter)
          └── client.js  (可选，通用客户端封装)
```

## 2. 代码移植与改造

### 2.1 实现 OpenClaw 适配器 (`server/lib/openclaw/adapter.js`)
移植 `src/lib/controlplane/openclaw-adapter.ts` 的核心逻辑。
- **功能**:
  - 管理 WebSocket 连接（自动重连、心跳）。
  - 实现握手认证流程 (`connect.challenge` -> `method: connect`)。
  - 处理 JSON Frame (`req`, `res`, `event`) 的封包与解包。
- **关键改造**:
  - **去除 TypeScript 类型**: 将 `type` 定义移除或转为 JSDoc。
  - **配置注入**: 移除 `loadStudioSettings`，改由构造函数传入 `url` 和 `token`。
  - **工具函数**: 内联 `resolveOriginForUpstream` 等辅助函数。
  - **错误处理**: 保留 `ControlPlaneGatewayError` 类。

### 2.2 实现简易客户端 (`server/lib/openclaw/client.js`)
为了方便调用，可以封装一个简单的 Client 类，或者直接在 Adapter 上扩展。
建议直接使用 Adapter 实例，或者简单封装：

```javascript
// server/lib/openclaw/client.js
import { OpenClawGatewayAdapter } from './adapter.js';

export class OpenClawClient {
  constructor(config) {
    this.adapter = new OpenClawGatewayAdapter(config);
  }
  
  async connect() { return this.adapter.start(); }
  async call(method, params) { return this.adapter.request(method, params); }
  on(event, handler) { /* ... */ }
}
```

## 3. 集成到服务端 (`server/index.js`)

修改现有的 `server/index.js`，引入并使用新的适配器。

### 3.1 初始化与连接
在 Server 启动逻辑中（`httpServer.listen` 之前），初始化 `OpenClawGatewayAdapter`。

```javascript
import { OpenClawGatewayAdapter } from './lib/openclaw/adapter.js';

// 从环境变量获取配置
const GATEWAY_URL = process.env.OPENCLAW_API_URL || 'ws://localhost:18791';
const JOIN_KEY = process.env.JOIN_KEY || 'mandate_of_heaven';

const clawAdapter = new OpenClawGatewayAdapter({
  loadSettings: () => ({ url: GATEWAY_URL, token: JOIN_KEY }),
  onDomainEvent: (event) => {
    // 处理 OpenClaw 推送的事件
    console.log('[OpenClaw] Event:', event.type, event.event);
    
    // 转发给前端 (适配现有的 agent_update 事件)
    if (event.type === 'gateway.event') {
       // 根据 event.event (如 'agent.status') 解析 payload 并转发
       // io.emit('agent_update', ...);
    }
  }
});

// 启动连接
clawAdapter.start().catch(err => console.error('[OpenClaw] Connect failed:', err));
```

### 3.2 替换原有轮询逻辑
- 注释掉或删除 `openclaw-connector.js` 的引用。
- 如果 `server/index.js` 中有处理 `report` 的 Socket 监听，可以保留作为备用，但主要数据源应切换为 `clawAdapter`。

### 3.3 实现双向控制
在 `socket.on('command', ...)` 中，将指令转发给 OpenClaw：

```javascript
socket.on('command', async (data) => {
  const { targetId, action, payload } = data;
  try {
    // 例如：调用 agents.update 或 chat.send
    await clawAdapter.request(`agents.${action}`, { agentId: targetId, ...payload });
  } catch (err) {
    console.error('[OpenClaw] Command failed:', err);
  }
});
```

## 4. 验证与测试

1.  **配置环境**: 确保 OpenClaw 服务正在运行。
2.  **启动 Server**: `node server/index.js`。
3.  **检查日志**: 确认连接成功 (`Connected`)。
4.  **功能测试**:
    - **状态同步**: 改变 Agent 状态，看 UI 是否更新。
    - **指令下发**: 在 UI 点击操作，看 Agent 是否响应。

## 5. 后续清理
- 确认新模式稳定后，删除 `scripts/openclaw-connector.js`。
