# OpenClaw 回复重复问题排查计划

## 1. 问题分析
用户反馈：“在圣旨里面输入的话，他会回复我特别多次”。这通常意味着消息流被多次处理，或者事件被多次触发。

## 2. 可能原因
1.  **Server 端重复转发**: `server/index.js` 中的 OpenClaw Adapter 监听器可能在多次连接后被重复注册，或者 OpenClaw 本身返回了多个片段（流式输出），而每个片段都被当作一条完整的消息广播给了前端。
2.  **前端重复监听**: `LiveAgentService.ts` 中的 `socket.on('agent_update')` 可能被多次绑定。
3.  **日志重复写入**: `LiveAgentService.ts` 收到流式消息的每个片段时，都调用了 `addLog`，导致一条完整的回复被拆分成几十条日志。

## 3. 深入排查

### 3.1 Server 端 (`server/index.js`)
- [x] **流式处理逻辑**:
    ```javascript
    if (payload.stream === 'assistant') {
         // ...
         message = content || '正在思考...';
    }
    ```
    OpenClaw 的 `assistant` 事件通常是**流式**的（Streaming）。也就是说，一个回复 "你好" 可能会产生两个事件：`payload.data="你"` 和 `payload.data="好"`。
    Server 目前是收到一个事件就广播一次 `agent_update`。

### 3.2 前端处理 (`LiveAgentService.ts`)
- [x] **Log 写入逻辑**:
    ```typescript
    if (message && message !== '正在思考...' ...) {
        addLog(..., message);
    }
    ```
    前端收到每一次 `agent_update`，都会调用 `addLog` 创建一条**新**的日志记录。
    如果 Server 发送了 10 个片段，前端就会创建 10 条日志，显示为：
    - 丞相：你
    - 丞相：好
    - 丞相：，
    - 丞相：臣
    - ...

这正是“回复特别多次”的原因。

## 4. 解决方案

### 方案 A：后端缓冲 (Server-side Buffering) - **推荐**
在 Server 端聚合流式消息，直到收到结束信号（如 `stream: 'lifecycle', phase: 'end'` 或特定标记），再一次性发送给前端。或者，发送 `stream_chunk` 事件，让前端自己拼接。

### 方案 B：前端防抖/拼接 (Client-side Debouncing/Stitching) - **更灵活**
前端识别这是同一条消息的后续片段，而不是新消息。
1.  **引入 `sessionId` 或 `messageId`**: 需要 OpenClaw 提供唯一标识，或者前端自己维护一个“当前正在接收的消息”。
2.  **更新最后一条日志**: 如果收到的消息是流式的，不要 `addLog`，而是更新 `decree.logs` 中最后一条属于该 Agent 的记录。

鉴于 OpenClaw 的事件结构，Server 端目前没有维护上下文，直接转发。前端 `LiveAgentService` 也没有维护“正在接收回复”的状态。

## 5. 实施计划 (前端拼接法)

1.  **修改 `useCourtStore`**: 添加 `appendLogContent` 方法，用于追加内容到最后一条日志，而不是新增。
2.  **修改 `LiveAgentService`**:
    - 维护一个 `isReceivingReply` 状态。
    - 当收到 `status='working'` 且 `message` 有内容时：
        - 如果是新一轮回复的开始（比如距离上次更新超过 1 秒，或者状态刚从 idle 变过来），调用 `addLog`。
        - 否则，调用 `appendLogContent`。
    - **难点**: OpenClaw 的流式包是独立的字符，还是累积的文本？
        - 如果是 `delta` (增量)，需要拼接。
        - 如果是 `snapshot` (全量)，需要替换。
        - **假设**: OpenClaw Gateway 通常发送的是 `delta` (文本片段)。

**修正**: 仔细看 Server 代码：
```javascript
const content = typeof payload.data === 'string' ? payload.data : JSON.stringify(payload.data);
```
如果 `payload.data` 是增量字符，那么 Server 发送的就是增量。

### 优化步骤
1.  **前端 `useCourtStore`**: 增加 `updateLastLog(id, content)` 方法。
2.  **前端 `LiveAgentService`**:
    - 检测是否连续收到来自同一个 Agent 的消息。
    - 如果是，追加内容。

**更简单的临时修复**:
让 Server 端做简单的**累积**。但 Server 是无状态的，多个 Agent 并发时比较麻烦。

**最佳实践**: 前端处理。
在 `LiveAgentService` 中：
```typescript
private lastMessageTime: number = 0;
private lastMessageActor: string | null = null;

// ...
if (shouldAppend) {
    updateLastLog(activeDecreeId, message);
} else {
    addLog(activeDecreeId, ..., message);
}
```

## 6. 立即执行
修改 `useCourtStore` 添加更新日志的方法，然后修改 `LiveAgentService` 实现消息拼接。
