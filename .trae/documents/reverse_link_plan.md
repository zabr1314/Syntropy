# OpenClaw 反向联通（指令下发）分析计划

## 1. 目标
确认“天命系统”前端（圣旨输入框）到 OpenClaw 后端的指令下发链路是否已经实现，并找出缺失的环节。

## 2. 现状分析

### 2.1 链路节点检查
- [x] **UI 输入层 (`DecreePipeline.tsx`)**: 
    - 用户输入圣旨后，调用了 `useCourtStore.addDecree`。
    - **缺失**: 这里**没有**调用 `LiveAgentService` 发送 WebSocket 指令。目前只是在本地 Store 里创建了一个“圣旨”记录。
- [x] **状态管理层 (`useCourtStore.ts`)**: 
    - `addDecree` 只是纯粹的本地状态更新，没有副作用（Side Effects）去触发网络请求。
- [x] **通信层 (`LiveAgentService.ts`)**: 
    - 具备 `socket` 对象，但**没有**暴露发送指令（如 `sendCommand`）的公共方法。
- [x] **后端中转层 (`server/index.js`)**: 
    - 已实现 `socket.on('command', ...)` 监听，并能通过 `clawAdapter` 转发给 OpenClaw。
    - 逻辑看起来是就绪的：收到 `command` -> 检查 OpenClaw 连接 -> 调用 `clawAdapter.request`。

### 2.2 结论
**逻辑尚未完全连通。**
后端和中转层已经准备好了，但**前端 UI 和 Store 并没有把指令发出去**。用户在输入框敲回车，只是在本地自嗨（更新了本地状态），没有通过 WebSocket 告诉服务器。

## 3. 实施计划

### 3.1 补全前端发送逻辑
1.  **修改 `LiveAgentService.ts`**:
    - 添加 `sendCommand(agentId: string, action: string, payload: any)` 方法。
2.  **修改 `useCourtStore.ts` 或 `DecreePipeline.tsx`**:
    - 在 `addDecree` 被调用时，或者在 Store 的 `addDecree` 内部，调用 `LiveAgentService.sendCommand`。
    - **策略**: 鉴于 OpenClaw 的 Agent 可能是通用的，我们可能需要一个“总管” Agent (如丞相 `minister`) 来接收所有圣旨，或者广播给所有 Agent。
    - **暂时方案**: 将圣旨内容作为 `chat` 指令发送给 `minister` (丞相)。

### 3.2 验证步骤
1.  **修改代码**: 实现上述前端逻辑。
2.  **测试**: 在输入框输入“有些什么任务？”，点击发送。
3.  **观察**:
    - 前端日志应显示 `[LiveAgent] Sending command: chat ...`
    - 后端日志应显示 `[Socket] Command to minister: chat ...`
    - OpenClaw 应收到请求并回复。

## 4. 立即执行
我将按照此计划，先在 `LiveAgentService` 中添加发送方法，然后在 `DecreePipeline` 中集成调用。
