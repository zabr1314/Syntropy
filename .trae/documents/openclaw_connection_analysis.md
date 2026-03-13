# OpenClaw 连接架构优化：迈向全双工控制

## 1. 现状评估：文件轮询的局限性
你目前的架构利用文件监听 (`state.json`) 和 HTTP 轮询 (`LiveAgentService` -> `Relay`) 实现了**单向监控**。
这种方式虽然解耦且易于实现，但在转向**“控制 OpenClaw”**时面临以下瓶颈：
*   **延迟高**: 轮询机制必然存在延迟（目前是 2秒+），对于即时指令（如“立刻停止任务”）体验不佳。
*   **指令丢失风险**: 文件写入可能发生竞态条件，导致快速连续的指令被覆盖。
*   **状态不一致**: 缺乏确认机制 (ACK)，前端无法确定指令是否被 OpenClaw 成功接收。

## 2. 推荐方案：WebSocket 全双工通信 (The "Royal Decree" Protocol)
为了实现真正的**实时控制**与**状态同步**，我强烈建议将架构升级为 **WebSocket**。

### 架构图
```mermaid
graph TD
    Frontend[前端 UI/Phaser] <-->|WebSocket| Relay[中转服务器 (Socket.io)]
    Relay <-->|WebSocket Client| Connector[OpenClaw Connector]
    Connector <-->|API/SDK| OpenClaw[Agent Runtime]
```

### 核心优势
1.  **毫秒级响应**: 指令下达即送达，无需等待轮询周期。
2.  **双向通道**:
    *   **下行 (Downlink)**: 前端 -> Relay -> OpenClaw (控制指令、参数调整)。
    *   **上行 (Uplink)**: OpenClaw -> Relay -> Frontend (实时日志流、状态更新、错误报警)。
3.  **可靠性**: WebSocket 提供连接保持 (Keep-Alive) 和断线重连机制，确保指令必达。

## 3. 实施计划 (Roadmap)

### 第一阶段：Relay Server 升级
*   引入 `socket.io` 库。
*   改造 `server/index.js`，从单纯的 HTTP Server 变为 WebSocket Server。
*   定义事件协议：
    *   `subscribe`: 前端订阅 Agent 状态。
    *   `report`: Connector 上报状态。
    *   `command`: 前端下发指令。

### 第二阶段：Connector 改造
*   修改 `scripts/openclaw-connector.js`。
*   移除文件监听逻辑，改为使用 `socket.io-client` 连接 Relay Server。
*   实现指令监听：当收到 `command` 事件时，调用 OpenClaw 接口执行操作。

### 第三阶段：前端对接
*   修改 `src/services/LiveAgentService.ts`。
*   移除 `setInterval` 轮询，改为监听 Socket 事件。
*   实现指令发送功能（如点击按钮 -> 发送 Socket 消息）。

## 4. 结论
既然你不怕麻烦且追求最佳架构，**WebSocket 是唯一的正确选择**。它将把你的“天命系统”从一个被动的“监控仪表盘”升级为一个真正的**“即时指挥中心”**。
