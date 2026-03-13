<!--
 * @Author: hyl 2126419009@qq.com
 * @Date: 2026-03-09 11:26:15
 * @LastEditors: hyl 2126419009@qq.com
 * @LastEditTime: 2026-03-09 11:32:47
 * @FilePath: /天命系统/.trae/specs/websocket-upgrade/spec.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# WebSocket 升级方案：天命系统 2.0 (The Royal Decree Protocol)

## 1. 目标
将现有的 "File Watch + HTTP Polling" 架构升级为 **"WebSocket Full-Duplex"** 架构，实现：
1.  **即时监控**: Agent 状态变化毫秒级推送到前端。
2.  **反向控制**: 前端可直接下达指令给 Agent。
3.  **连接状态感知**: 实时获知 Agent 在线/离线状态。

## 2. 架构设计

### 2.1 组件角色
*   **Relay Server (WebSocket Server)**: 
    *   监听端口 `3001` (复用 HTTP Server)。
    *   维护连接池 (`clients`)。
    *   事件路由：`report` (上行) -> 广播给前端；`command` (下行) -> 定向发给 Agent。
*   **OpenClaw Connector (WebSocket Client)**:
    *   连接到 Relay Server。
    *   角色标识: `type: 'agent', id: 'minister'`。
    *   监听文件变化 -> `emit('report')`。
    *   监听 `on('command')` -> 执行操作（如写入文件或调用 API）。
*   **Frontend (WebSocket Client)**:
    *   连接到 Relay Server。
    *   角色标识: `type: 'frontend'`。
    *   监听 `on('agent_update')` -> 更新 Store。
    *   发送 `emit('command')` -> 控制 Agent。

### 2.2 通信协议 (Socket.io Events)

#### Client -> Server
| 事件名 | Payload | 描述 |
| :--- | :--- | :--- |
| `register` | `{ type: 'agent' \| 'frontend', id?: string }` | 客户端身份注册 |
| `report` | `{ id: string, status: string, message: string }` | Agent 上报状态 |
| `command` | `{ targetId: string, action: string, payload?: any }` | 前端下发指令 |

#### Server -> Client
| 事件名 | Payload | 描述 |
| :--- | :--- | :--- |
| `agent_update` | `{ id: string, status: string, message: string }` | 广播 Agent 状态更新 |
| `command` | `{ action: string, payload?: any }` | 定向推送指令给 Agent |
| `agent_offline` | `{ id: string }` | 广播 Agent 离线通知 |

## 3. 数据结构变更

### Connector
*   新增依赖: `socket.io-client`
*   移除: `fetch` 轮询逻辑
*   保留: `fs.watchFile` (作为数据源触发器，但改为 Socket 发送)

### Relay Server
*   新增依赖: `socket.io`
*   新增: `io` 实例绑定到 HTTP Server
*   新增: `socket.on('connection')` 处理逻辑

### Frontend
*   新增依赖: `socket.io-client`
*   修改: `LiveAgentService.ts`
    *   `start()`: 初始化 Socket 连接
    *   `stop()`: 断开 Socket 连接
    *   移除 `setInterval` 轮询

## 4. 依赖变更
*   Root `package.json`: 
    *   `dependencies`: 添加 `socket.io` (用于 server), `socket.io-client` (用于 frontend 和 connector 脚本)
    *   注意：Connector 脚本运行在 Node 环境，Frontend 运行在浏览器环境，都使用 `socket.io-client` 是兼容的。
