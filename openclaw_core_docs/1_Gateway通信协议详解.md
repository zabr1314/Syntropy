# OpenClaw Gateway 通信协议详解

本文档详细解析 OpenClaw 的 Gateway 通信协议。该协议基于 WebSocket，是外部系统（如天命系统后端）与 OpenClaw Agent 核心进行交互的桥梁。

## 1. 连接建立

### 1.1 WebSocket 端点
OpenClaw Server 默认在根路径 `/` 监听 WebSocket 连接。

### 1.2 鉴权 (Authentication)
连接时必须在 HTTP 握手请求头中包含鉴权 Token：
- **Header Key**: `X-OpenClaw-Token`
- **Value**: 在 OpenClaw 配置文件中设置的 `auth_token`。

如果 Token 不匹配，连接将被服务器立即关闭（Code 4401: Unauthorized）。

## 2. 消息协议格式

通信采用标准的 JSON 格式。所有消息分为三种类型：`req` (请求), `res` (响应), `event` (事件)。

### 2.1 请求消息 (Request)
由 Client 发送给 Server，或由 Server 发送给 Client，期望得到回复。

```json
{
  "type": "req",
  "id": "unique-request-id",
  "method": "method_name",
  "params": { ... }
}
```

### 2.2 响应消息 (Response)
对 `req` 消息的回复。

**成功响应:**
```json
{
  "type": "res",
  "id": "unique-request-id", // 对应请求的 ID
  "result": { ... }
}
```

**错误响应:**
```json
{
  "type": "res",
  "id": "unique-request-id",
  "error": {
    "code": 123,
    "message": "Error description"
  }
}
```

### 2.3 事件消息 (Event)
单向通知，不需要回复。

```json
{
  "type": "event",
  "event": "event_name",
  "data": { ... }
}
```

## 3. 核心 API 方法 (Methods)

以下是 Gateway 支持的主要 RPC 方法。

### 3.1 `register` (注册 Agent)
Client 向 Server 注册自己可以处理的 Agent 类型。

- **方向**: Client -> Server
- **Params**:
  - `agentId` (string): Agent 的唯一标识符。
  - `schema` (object): Agent 的能力描述（输入/输出 schema）。

### 3.2 `spawn` (创建会话)
请求创建一个新的 Agent 会话（Session）。

- **方向**: Client -> Server
- **Params**:
  - `agentId` (string): 目标 Agent ID。
  - `systemPrompt` (string, optional): 覆盖默认的 System Prompt。
  - `context` (object, optional): 注入的上下文数据。

### 3.3 `kill` (终止会话)
强制结束一个正在运行的会话。

- **方向**: Client -> Server
- **Params**:
  - `sessionId` (string): 要终止的会话 ID。

### 3.4 `input` (发送输入)
向指定会话发送用户输入。

- **方向**: Client -> Server
- **Params**:
  - `sessionId` (string): 会话 ID。
  - `text` (string): 输入文本内容。

## 4. 关键事件 (Events)

### 4.1 `output` (Agent 输出)
Agent 产生输出（通常是 LLM 的回复）时触发。

- **方向**: Server -> Client
- **Data**:
  - `sessionId` (string): 会话 ID。
  - `text` (string): 输出内容。
  - `done` (boolean): 是否为最后一条消息。

### 4.2 `error` (错误通知)
会话发生异步错误时触发。

- **方向**: Server -> Client
- **Data**:
  - `sessionId` (string): 会话 ID。
  - `error`: 错误详情对象。

### 4.3 `session_start` / `session_end`
会话生命周期事件。

## 5. 心跳机制 (Heartbeat)
为了保持连接活跃，OpenClaw Gateway 可能会发送 `ping` 帧，Client 应自动回复 `pong`。具体的应用层心跳通常通过空的 `req` 或专用 `ping` 方法实现，但在 OpenClaw 中主要依赖 WebSocket 协议层面的 Keep-Alive。

## 6. 天命系统中的实现 (`adapter.js`)

在 `server/lib/openclaw/adapter.js` 中，天命系统实现了一个 `OpenClawAdapter` 类：
1.  **初始化**: 使用 `ws` 库连接到 OpenClaw Server。
2.  **封装**: 将 `spawn`, `input`, `kill` 等操作封装为 Promise 方法。
3.  **事件监听**: 监听 WebSocket 的 `message` 事件，根据 `id` 分发 `res` 响应，或根据 `event` 类型触发回调（如将 Agent 的 `output` 推送给前端）。

---
**源码参考:**
- Server 端: `openclaw/src/gateway/server.impl.ts`
- 协议定义: `openclaw/src/gateway/call.ts`, `openclaw/src/gateway/events.ts`
- Client 端: `server/lib/openclaw/adapter.js`
