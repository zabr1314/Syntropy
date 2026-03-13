# OpenClaw API Rate Limit 问题分析

## 1. 问题描述
用户反馈 "API rate limit reached. Please try again later."，但用户声称额度充足。这通常意味着：
1.  **短时间内发起了过多请求**（并发或频率过高）。
2.  **重试机制过于激进**，导致在错误时瞬间打爆了限流阈值。
3.  **心跳或轮询过快**。

## 2. 代码审查发现 (`server/lib/openclaw/adapter.js`)

### 2.1 重连机制
```javascript
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 15_000;

scheduleReconnect() {
  // ...
  const delay = Math.min(
    INITIAL_RECONNECT_DELAY_MS * Math.pow(1.7, this.reconnectAttempt),
    MAX_RECONNECT_DELAY_MS
  );
  // ...
}
```
*   **分析**: 重连策略是指数退避 (Exponential Backoff)，看起来是合理的。从 1s 开始，每次 * 1.7，最大 15s。这应该不会导致 Rate Limit。

### 2.2 请求超时
```javascript
const REQUEST_TIMEOUT_MS = 15_000;
```
*   **分析**: 单个请求超时 15s，正常。

### 2.3 潜在问题点

虽然 `OpenClawGatewayAdapter` 本身看起来没问题，但 **调用方** (`server/index.js`) 可能存在问题。

在 `server/index.js` 中：
```javascript
socket.on('command', async (data) => {
    // ...
    // 优先通过 OpenClaw Gateway 转发
    if (clawAdapter.getStatus() === 'connected') {
        try {
            // ...
            const response = await clawAdapter.request(method, params);
            // ...
        } catch (e) {
            console.error(`[Socket] Failed to forward command to OpenClaw: ${e.message}`);
            // 尝试 fallback 到本地 mock
            // io.to(`agent:${targetId}`).emit('command', { action, payload });
        }
    }
    // ...
    // Fallback / 兼容本地 Connector
    io.to(`agent:${targetId}`).emit('command', { action, payload });
});
```

**关键问题**:
1.  **双重发送**: 无论 OpenClaw 转发是否成功，最后一行 `io.to(...).emit(...)` **总是会执行**。这虽然发给的是本地 Socket 房间，不会直接触发 OpenClaw API Limit，但逻辑上有点混乱。
2.  **前端重试**: 如果前端 (`LiveAgentService` 或 `SocketManager`) 在发送失败时没有正确处理，可能会**疯狂重试**。

## 3. 前端重试逻辑审查

让我们检查前端是否在疯狂重试。

*   `SocketManager.ts`: 只是 emit，没有重试逻辑。
*   `DecreePipeline.tsx`: 用户点发送才调用一次。

## 4. 真正的嫌疑人：LLM Provider 的 Rate Limit

"API rate limit reached" 这句话**很可能不是 OpenClaw Gateway 报的，而是 OpenClaw 内部调用的 LLM (如 OpenAI/Claude) 报的**，然后透传回来的。

如果 OpenClaw 后端配置的是免费版 API Key，或者并发数受限，那么：
1.  丞相收到指令。
2.  丞相调用 LLM 思考。
3.  **LLM 返回 429 Too Many Requests**。
4.  OpenClaw 将错误信息包装返回给 Adapter。
5.  Adapter 打印错误，或者将其作为 `message` 发送给前端。

**证据**: 用户说 "我的额度明明很多"。这通常是指 OpenAI/Claude 的额度。但如果是 **RPM (Requests Per Minute)** 限制，额度再多也会触发。

## 5. 解决方案

### 5.1 增加防抖 (Debounce)
在前端输入框增加防抖，防止用户狂点发送。

### 5.2 优化 OpenClaw 调用
确认 OpenClaw 后端配置的 LLM Provider 是否有限制。

### 5.3 错误信息优化
如果收到 "Rate limit"，应该友好提示用户“丞相正在思考中，请稍勿躁”，而不是直接把报错甩出来。

## 6. 立即行动
我们将修改 `server/index.js`，在接收到 OpenClaw 的错误响应时，进行更友好的处理，并避免短时间内重复发送。
